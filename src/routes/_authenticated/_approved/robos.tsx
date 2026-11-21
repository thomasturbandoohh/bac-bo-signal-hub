import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Power, WifiOff, Wrench } from "lucide-react";
import { Logo } from "@/components/bacbo/Logo";
import { LiquidBoard } from "@/components/bacbo/LiquidBoard";
import { LiveTableCard } from "@/components/bacbo/LiveTable";
import { SignalOrb, WaterWave } from "@/components/bacbo/SignalOrb";
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

function Clock() {
  const now = useNow(1000);
  return (
    <span className="font-display tabular-nums">{new Date(now).toLocaleTimeString("pt-BR")}</span>
  );
}

function RobotsPage() {
  const robot = useRobot();
  const { phase, isAdmin } = robot;
  const on = phase !== "off";

  const dist = useMemo(
    () => (robot.history.length ? summarizeRoundFrequencies(robot.history, 20) : null),
    [robot.history],
  );
  const live = on && !robot.maintenance && robot.reason !== "no_connection";
  const winner =
    live && (phase === "signal" || robot.reason === "result") ? (robot.signal?.side ?? null) : null;

  return (
    <div className="space-y-3 sm:space-y-3.5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8 lg:gap-y-3.5 lg:space-y-0">
      <div className="space-y-3 sm:space-y-3.5">
        <header className="pt-0.5">
          <Logo />
          <div className="mt-1.5 flex items-center justify-center gap-2.5 text-xs text-muted-foreground">
            <span className="liquid-glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-bold">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  on ? "bg-success" : "bg-muted-foreground",
                )}
              />
              {on ? "Online" : "Standby"}
            </span>
            <span className="font-bold">
              <Clock />
            </span>
          </div>
        </header>

        <Scoreboard />

        {isAdmin && (
          <motion.button
            onClick={robot.toggle}
            whileTap={{ scale: 0.97 }}
            disabled={robot.toggling}
            className={cn(
              "relative flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-full font-display text-sm font-extrabold tracking-wide transition-colors disabled:opacity-60 sm:h-12",
              robot.running
                ? "liquid-glass text-foreground"
                : "bg-gradient-to-b from-success to-success/80 text-background shadow-[var(--glass-shadow)]",
            )}
          >
            <Power className="relative h-3.5 w-3.5" />
            <span className="relative">{robot.running ? "Desligar Robô" : "Ligar Robô"}</span>
          </motion.button>
        )}

        <LiquidBoard dist={dist} winner={winner} />

        <LiveTableCard rounds={robot.rounds} />
      </div>

      <div>
        <AnimatePresence mode="wait">
          {robot.maintenance ? (
            <Panel key="maint">
              <div className="glass-icon h-11 w-11 text-tie">
                <Wrench className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Modo manutenção
              </span>
              <h2 className="mt-0.5 font-display text-base font-extrabold sm:text-lg">
                ROBÔ PAUSADO
              </h2>
              <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                O administrador está calibrando o sistema. Volte em instantes.
              </p>
            </Panel>
          ) : phase === "off" ? (
            <Panel key="off">
              <div className="glass-icon h-11 w-11 text-tie-glow">
                <Moon className="h-5 w-5" fill="currentColor" strokeWidth={1.6} />
              </div>
              <h2 className="mt-2 font-display text-base font-extrabold sm:text-lg">STANDBY</h2>
              <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                {isAdmin
                  ? "Toque em Ligar Robô para iniciar os sinais para todos."
                  : "Aguarde o administrador iniciar o robô."}
              </p>
            </Panel>
          ) : robot.reason === "no_connection" ? (
            <Panel key="offline">
              <div className="glass-icon h-11 w-11 text-destructive">
                <WifiOff className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Robô ligado
              </span>
              <h2 className="mt-0.5 font-display text-base font-extrabold sm:text-lg">
                SEM CONEXÃO COM A MESA
              </h2>
              <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                A mesa ao vivo não está enviando rodadas, então nenhum sinal será enviado. Não
                recomendamos operar agora.
              </p>
            </Panel>
          ) : phase === "analyzing" ? (
            <Analyzing key={`analyzing-${robot.key}`} />
          ) : (
            robot.signal && (
              <SignalOrb
                key={`signal-${robot.key}`}
                side={robot.signal.side}
                signal={robot.signal}
                gale={robot.gale}
                phaseStart={robot.phaseStart}
                phaseEnd={robot.phaseEnd}
              />
            )
          )}
        </AnimatePresence>
      </div>

      <p className="px-3 text-center lg:col-span-2 text-[10px] leading-relaxed text-muted-foreground/70">
        As rodadas analisadas vêm da mesa Bac Bo Live ao vivo. Os sinais são leituras de padrões e
        não garantem ganhos. Jogue com responsabilidade · +18.
      </p>
    </div>
  );
}

function Panel({
  children,
  showWater = true,
}: {
  children: ReactNode;
  /** Water layer at the bottom; turn off when it collides with a progress bar. */
  showWater?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.16 }}
      className="liquid-glass relative isolate flex flex-col items-center overflow-hidden rounded-[1.6rem] px-4 py-5 text-center sm:px-5 sm:py-6"
    >
      {showWater && <WaterWave />}
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
  result: "Aguardando o resultado da entrada",
};

function Analyzing() {
  const { phaseStart, phaseEnd, reason, waiting, gale } = useRobot();

  return (
    <Panel showWater={false}>
      <div className="glass-icon h-12 w-12 sm:h-14 sm:w-14">
        <Emoji3D src={robotEmoji} size={34} className="animate-bob" />
      </div>
      <h2 className="mt-2.5 font-display text-xs font-extrabold tracking-[0.1em] sm:text-sm">
        <span className="text-success">SISTEMA ONLINE</span>{" "}
        <span className="text-foreground">{reason === "result" ? "AGUARDANDO" : "ANALISANDO"}</span>
      </h2>
      <p className="mt-1 text-[11px] font-bold text-muted-foreground">
        {waiting
          ? (WAIT_TEXT[reason ?? ""] ?? "Lendo os padrões da mesa")
          : gale
            ? "Preparando o gale"
            : "Padrão encontrado · confirmando a entrada"}
      </p>
      {/* Clean track: no ring, no water underneath — only the fill is visible */}
      <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        {waiting ? (
          <motion.div
            className="absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-transparent via-success to-transparent"
            initial={{ left: "-40%" }}
            animate={{ left: ["-40%", "100%"] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
          />
        ) : (
          <SmoothFill key={phaseStart} start={phaseStart} end={phaseEnd} />
        )}
      </div>
    </Panel>
  );
}

/** Fills from the current position to 100% in one continuous, linear motion until `end`. */
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
      className="h-full rounded-full bg-success"
      initial={{ width: `${plan.from * 100}%` }}
      animate={{ width: "100%" }}
      transition={{ duration: plan.seconds, ease: "linear" }}
    />
  );
}
