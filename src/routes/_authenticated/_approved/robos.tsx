import { PwaInstallCard } from "@/components/bacbo/PwaInstallPrompt";
import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, WifiOff, Wrench, Sparkles, Activity } from "lucide-react";
import { Logo } from "@/components/bacbo/Logo";
import { LiquidBoard } from "@/components/bacbo/LiquidBoard";
import { LiveTableCard } from "@/components/bacbo/LiveTable";
import { SignalOrb } from "@/components/bacbo/SignalOrb";
import { Emoji3D, Scoreboard } from "@/components/bacbo/Scoreboard";
import robotEmoji from "@/assets/emoji/robot.webp";
import { summarizeRoundFrequencies } from "@/lib/round-statistics";
import { useRobot } from "@/lib/robot-context";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_approved/robos")({
  head: () => ({
    meta: [
      { title: "Robôs — Bac Bo Live" },
      {
        name: "description",
        content:
          "Acompanhe o robô Bac Bo Live, que lê as rodadas reais da mesa e mostra o sinal de Player ou Banker.",
      },
      { property: "og:title", content: "Robôs — Bac Bo Live" },
      { property: "og:description", content: "Sinais de Player ou Banker em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RobotsPage,
});

const clockFmt = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function Clock() {
  const now = useNow(1000);
  const timeStr = useMemo(() => clockFmt.format(new Date(now)), [now]);
  return (
    <span className="font-display text-[0.6875rem] font-extrabold tabular-nums tracking-wider text-muted-foreground">
      {timeStr}
    </span>
  );
}

function RobotsPage() {
  const robot = useRobot();
  const {
    phase,
    isAdmin,
    running,
    maintenance,
    reason,
    key: robotKey,
    signal,
    gale,
    phaseStart,
    phaseEnd,
    rounds,
    history,
  } = robot;
  const on = phase !== "off";

  const dist = useMemo(
    () => (history.length ? summarizeRoundFrequencies(history, 20) : null),
    [history],
  );
  const live = on && !maintenance && reason !== "no_connection";
  const winner = live && phase === "signal" && signal ? signal.side : null;

  return (
    <div className="space-y-3.5 sm:space-y-4 lg:grid lg:grid-cols-12 lg:gap-x-6 lg:gap-y-4 lg:space-y-0">
      <header className="pt-0.5 lg:col-span-12">
        <Logo />
        <div className="mt-2 flex items-center justify-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1 shadow-[0_4px_16px_rgba(0,0,0,0.5)] backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span
                className={cn(
                  "absolute inset-0 rounded-full opacity-75",
                  on ? "animate-ping bg-emerald-400" : "bg-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "relative h-2 w-2 rounded-full",
                  on
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                    : "bg-muted-foreground",
                )}
              />
            </span>
            <span className="text-[0.625rem] font-black uppercase tracking-[0.16em] text-foreground/90">
              {on ? "SISTEMA ONLINE" : "STANDBY"}
            </span>
            <span className="h-3 w-px bg-white/15" />
            <Clock />
          </div>
        </div>
      </header>

      <div className="space-y-3.5 sm:space-y-4 lg:col-span-7 lg:flex lg:flex-col lg:gap-4 lg:space-y-0">
        <PwaInstallCard />
        <div className="lg:order-1">
          <Scoreboard />
        </div>

        <div className="lg:order-2">
          <LiquidBoard dist={dist} winner={winner} />
        </div>

        <div className="lg:order-3">
          <LiveTableCard rounds={rounds} />
        </div>
      </div>

      <div className="lg:col-span-5 lg:flex lg:flex-col">
        <AnimatePresence mode="wait">
          {maintenance ? (
            <Panel key="maint">
              <div className="glass-icon h-12 w-12 text-tie">
                <Wrench className="h-6 w-6" strokeWidth={2.2} />
              </div>
              <span className="mt-3 text-[0.625rem] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                Modo manutenção
              </span>
              <h2 className="mt-1 font-display text-base font-black sm:text-lg">
                ROBÔ EM CALIBRAGEM
              </h2>
              <p className="mt-1 text-[0.6875rem] text-muted-foreground sm:text-xs">
                {isAdmin
                  ? "O robô está em modo manutenção. Edite as configurações no painel administrativo."
                  : "O administrador está calibrando o sistema. Volte em instantes."}
              </p>
            </Panel>
          ) : phase === "off" ? (
            <Panel key="off">
              <div className="glass-icon h-12 w-12 text-tie-glow">
                <Moon className="h-6 w-6" fill="currentColor" strokeWidth={1.6} />
              </div>
              <h2 className="mt-3 font-display text-base font-black sm:text-lg">STANDBY</h2>
              <p className="mt-1 text-[0.6875rem] text-muted-foreground sm:text-xs">
                {isAdmin
                  ? "Acesse o painel Admin para iniciar as operações do robô."
                  : "Aguarde o administrador iniciar o robô."}
              </p>
            </Panel>
          ) : reason === "no_connection" ? (
            <Panel key="offline">
              <div className="glass-icon h-12 w-12 text-destructive">
                <WifiOff className="h-6 w-6" strokeWidth={2.2} />
              </div>
              <span className="mt-3 text-[0.625rem] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                Robô ligado
              </span>
              <h2 className="mt-1 font-display text-base font-black sm:text-lg">
                AGUARDANDO MESA AO VIVO
              </h2>
              <p className="mt-1 text-[0.6875rem] text-muted-foreground sm:text-xs">
                {isAdmin
                  ? "Nenhuma rodada recente recebida da mesa. Verifique a chave no painel Admin."
                  : "Sincronizando feed de rodadas da mesa para gerar o próximo sinal."}
              </p>
            </Panel>
          ) : phase === "analyzing" || !signal ? (
            <Analyzing key={`analyzing-${robotKey}`} />
          ) : (
            <SignalOrb
              key={`signal-${robotKey}`}
              side={signal.side}
              signal={signal}
              gale={gale}
              phaseStart={phaseStart}
              phaseEnd={phaseEnd}
            />
          )}
        </AnimatePresence>
      </div>

      <p className="px-3 text-center lg:col-span-12 text-[0.625rem] leading-relaxed text-muted-foreground/60">
        As rodadas analisadas vêm da mesa Bac Bo Live ao vivo. Os sinais são leituras de padrões e
        não garantem ganhos. Jogue com responsabilidade · +18.
      </p>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="glass-premium relative isolate flex flex-col items-center overflow-hidden rounded-2xl px-4 py-6 text-center sm:px-6 sm:py-7 lg:h-full lg:justify-center lg:px-7 lg:py-9 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.85)] border border-white/10"
    >
      <div className="relative z-10 flex w-full flex-col items-center">{children}</div>
    </motion.div>
  );
}

const WAIT_TEXT: Record<string, string> = {
  collecting: "Coletando as primeiras rodadas da mesa",
  next_round: "Aguardando o desfecho da rodada",
  no_pattern: "Mapeando sequências e repetições",
  weak_pattern: "Avaliando confiabilidade estatística",
  conflict: "Calculando margem Player vs Banker",
  cold_table: "Mesa oscilando · aguardando estabilização",
  choppy_table: "Alternância curta · prevenindo falsos sinais",
  trending_table: "Forte tendência identificada · validando entrada",
  result: "Aguardando apuração da rodada",
};

type Stage = "search" | "result" | "confirm" | "gale";

const STAGE: Record<Stage, { label: string; dot: string; chip: string }> = {
  search: {
    label: "Mapeando Padrão",
    dot: "bg-amber-400",
    chip: "bg-amber-500/15 text-amber-300 ring-amber-400/35",
  },
  result: {
    label: "Aguardando Mesa",
    dot: "bg-player-glow",
    chip: "bg-player/15 text-player-glow ring-player-glow/35",
  },
  confirm: {
    label: "Padrão Identificado",
    dot: "bg-emerald-400",
    chip: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/35",
  },
  gale: {
    label: "Preparando Gale 1",
    dot: "bg-amber-300",
    chip: "bg-amber-500/20 text-amber-200 ring-amber-400/45",
  },
};

function Analyzing() {
  const { phaseStart, phaseEnd, reason, waiting, gale } = useRobot();
  const stage: Stage = waiting
    ? reason === "result"
      ? "result"
      : "search"
    : gale
      ? "gale"
      : "confirm";
  const st = STAGE[stage];

  return (
    <Panel>
      {/* Radar scanning circle around the robot icon */}
      <div className="relative flex items-center justify-center">
        <span className="absolute h-18 w-18 sm:h-20 sm:w-20 rounded-full border border-player-glow/25 animate-ping opacity-30" />
        <div className="glass-icon relative h-14 w-14 sm:h-16 sm:w-16 shadow-[0_0_25px_rgba(56,189,248,0.3)]">
          <Emoji3D src={robotEmoji} size={36} className="animate-bob" />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-player-glow" />
        <h2 className="font-display text-xs font-black tracking-[0.14em] sm:text-sm">
          <span className="text-emerald-400">IA ANALISANDO</span>{" "}
          <span className="text-foreground">{reason === "result" ? "RODADA" : "PADRÕES"}</span>
        </h2>
      </div>

      <span
        className={cn(
          "mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.625rem] font-black uppercase tracking-[0.18em] ring-1 transition-colors duration-500 shadow-sm",
          st.chip,
        )}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className={cn("absolute inset-0 animate-ping rounded-full opacity-70", st.dot)} />
          <span className={cn("relative h-1.5 w-1.5 rounded-full", st.dot)} />
        </span>
        {st.label}
      </span>

      <p className="mt-2 text-[0.6875rem] font-bold text-muted-foreground sm:text-xs">
        {waiting
          ? (WAIT_TEXT[reason ?? ""] ?? "Mapeando sequências e repetições")
          : gale
            ? "Mesmo lado da entrada · última tentativa"
            : "Padrão confirmado · liberando sinal em instantes"}
      </p>

      {/* Cybernetic Progress Bar with Shimmer */}
      <div className="relative mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/10 p-[1px] shadow-inner">
        {waiting ? <Sweep /> : <SmoothFill key={phaseStart} start={phaseStart} end={phaseEnd} />}
      </div>
    </Panel>
  );
}

function Sweep() {
  return (
    <motion.div
      className="absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-transparent via-player-glow to-transparent shadow-[0_0_16px_var(--player-glow)]"
      initial={{ left: "-40%" }}
      animate={{ left: ["-40%", "100%"] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
    />
  );
}

function SmoothFill({ start, end }: { start: number; end: number }) {
  const [plan] = useState(() => {
    const now = Date.now();
    const total = Math.max(1, end - start);
    return {
      from: Math.min(1, Math.max(0, (end - now) / total)),
      seconds: Math.max(0.3, (end - now) / 1000),
    };
  });
  return (
    <motion.div
      className="progress-blue relative h-full overflow-hidden rounded-full"
      initial={{ width: `${plan.from * 100}%` }}
      animate={{ width: "100%" }}
      transition={{ duration: plan.seconds, ease: "linear" }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1/2 animate-sheen bg-gradient-to-r from-transparent via-white/40 to-transparent motion-reduce:hidden"
      />
    </motion.div>
  );
}
