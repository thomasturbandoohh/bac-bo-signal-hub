import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, WifiOff, Wrench } from "lucide-react";
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
      { title: "Robôs — LORD M." },
      {
        name: "description",
        content:
          "Acompanhe o robô Bac Bo Live, que lê as rodadas reais da mesa e mostra o sinal de Player ou Banker.",
      },
      { property: "og:title", content: "Robôs — LORD M." },
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
    <span className="font-display text-xs font-bold tabular-nums tracking-wider text-muted-foreground">
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
    <div className="space-y-3 sm:space-y-3.5 lg:grid lg:grid-cols-12 lg:gap-x-6 lg:gap-y-3.5 lg:space-y-0">
      <header className="pt-0.5 lg:col-span-12">
        <Logo />
        <div className="mt-1.5 flex items-center justify-center gap-2.5 text-xs text-muted-foreground">
          <span className="liquid-glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-bold">
            <span
              className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-success" : "bg-muted-foreground")}
            />
            {on ? "Online" : "Standby"}
          </span>
          <span className="font-bold">
            <Clock />
          </span>
        </div>
      </header>

      <div className="space-y-3 sm:space-y-3.5 lg:col-span-7 lg:flex lg:flex-col lg:gap-3.5 lg:space-y-0">
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
              <div className="glass-icon h-11 w-11 text-tie">
                <Wrench className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <span className="mt-2 text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Modo manutenção
              </span>
              <h2 className="mt-0.5 font-display text-base font-extrabold sm:text-lg">
                ROBÔ PAUSADO
              </h2>
              <p className="mt-1 text-[0.6875rem] text-muted-foreground sm:text-xs">
                {isAdmin
                  ? "O robô está em modo manutenção. Edite as configurações no painel administrativo."
                  : "O administrador está calibrando o sistema. Volte em instantes."}
              </p>
            </Panel>
          ) : phase === "off" ? (
            <Panel key="off">
              <div className="glass-icon h-11 w-11 text-tie-glow">
                <Moon className="h-5 w-5" fill="currentColor" strokeWidth={1.6} />
              </div>
              <h2 className="mt-2 font-display text-base font-extrabold sm:text-lg">STANDBY</h2>
              <p className="mt-1 text-[0.6875rem] text-muted-foreground sm:text-xs">
                {isAdmin
                  ? "Acesse o painel Admin para iniciar as operações do robô."
                  : "Aguarde o administrador iniciar o robô."}
              </p>
            </Panel>
          ) : reason === "no_connection" ? (
            <Panel key="offline">
              <div className="glass-icon h-11 w-11 text-destructive">
                <WifiOff className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <span className="mt-2 text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Robô ligado
              </span>
              <h2 className="mt-0.5 font-display text-base font-extrabold sm:text-lg">
                SEM CONEXÃO COM A MESA
              </h2>
              <p className="mt-1 text-[0.6875rem] text-muted-foreground sm:text-xs">
                {isAdmin
                  ? "Nenhuma rodada recente recebida da mesa. Verifique a chave no painel Admin."
                  : "Aguardando novas rodadas da mesa para gerar o próximo sinal."}
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

      <p className="px-3 text-center lg:col-span-12 text-[0.625rem] leading-relaxed text-muted-foreground/70">
        As rodadas analisadas vêm da mesa Bac Bo Live ao vivo. Os sinais são leituras de padrões e
        não garantem ganhos. Jogue com responsabilidade · +18.
      </p>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="glass-premium relative isolate flex flex-col items-center overflow-hidden rounded-xl px-4 py-5 text-center sm:px-5 sm:py-6 lg:h-full lg:justify-center lg:px-6 lg:py-8"
    >
      <div className="relative z-10 flex w-full flex-col items-center">{children}</div>
    </motion.div>
  );
}

const WAIT_TEXT: Record<string, string> = {
  collecting: "Coletando as primeiras rodadas da mesa",
  next_round: "Aguardando a próxima rodada",
  no_pattern: "Lendo os padrões da mesa",
  weak_pattern: "Confirmando a força do padrão",
  conflict: "Comparando Player e Banker",
  cold_table: "Esperando a mesa esquentar",
  choppy_table: "Mesa picotada · evitando surf",
  trending_table: "Mesa em tendência · evitando quebra",
  result: "Aguardando o resultado da entrada",
};

type Stage = "search" | "result" | "confirm" | "gale";

const STAGE: Record<Stage, { label: string; dot: string; chip: string }> = {
  search: { label: "Buscando padrão", dot: "bg-tie", chip: "bg-tie/15 text-tie-glow ring-tie/35" },
  result: {
    label: "Aguardando a mesa",
    dot: "bg-player-glow",
    chip: "bg-player/15 text-player-glow ring-player-glow/35",
  },
  confirm: {
    label: "Padrão encontrado",
    dot: "bg-success",
    chip: "bg-success/15 text-success ring-success/35",
  },
  gale: {
    label: "Preparando o gale",
    dot: "bg-tie-glow",
    chip: "bg-tie/20 text-tie-glow ring-tie/45",
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
      <div className="glass-icon h-12 w-12 sm:h-14 sm:w-14">
        <Emoji3D src={robotEmoji} size={34} className="animate-bob" />
      </div>
      <h2 className="mt-2.5 font-display text-xs font-extrabold tracking-[0.1em] sm:text-sm">
        <span className="text-success">SISTEMA ONLINE</span>{" "}
        <span className="text-foreground">{reason === "result" ? "AGUARDANDO" : "ANALISANDO"}</span>
      </h2>
      <span
        className={cn(
          "mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.625rem] font-extrabold uppercase tracking-[0.16em] ring-1 transition-colors duration-500",
          st.chip,
        )}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className={cn("absolute inset-0 animate-ping rounded-full opacity-70", st.dot)} />
          <span className={cn("relative h-1.5 w-1.5 rounded-full", st.dot)} />
        </span>
        {st.label}
      </span>
      <p className="mt-1.5 text-[0.6875rem] font-bold text-muted-foreground">
        {waiting
          ? (WAIT_TEXT[reason ?? ""] ?? "Lendo os padrões da mesa")
          : gale
            ? "Mesmo lado da entrada · última tentativa"
            : "Padrão se formando · liberando a entrada"}
      </p>
      <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
        {waiting ? <Sweep /> : <SmoothFill key={phaseStart} start={phaseStart} end={phaseEnd} />}
      </div>
    </Panel>
  );
}

function Sweep() {
  return (
    <motion.div
      className="absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-transparent via-player-glow to-transparent shadow-[0_0_12px_-2px_var(--player-glow)]"
      initial={{ left: "-40%" }}
      animate={{ left: ["-40%", "100%"] }}
      transition={{ duration: 3.4, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
    />
  );
}

function SmoothFill({ start, end }: { start: number; end: number }) {
  const [plan] = useState(() => {
    const now = Date.now();
    const total = Math.max(1, end - start);
    return {
      from: Math.min(1, Math.max(0, (now - start) / total)),
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
        className="absolute inset-y-0 left-0 w-1/2 animate-sheen bg-gradient-to-r from-transparent via-white/30 to-transparent motion-reduce:hidden"
      />
    </motion.div>
  );
}
