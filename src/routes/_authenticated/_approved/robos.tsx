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
    <span className="font-display text-xs font-bold tabular-nums tracking-wider text-muted-foreground">
      {timeStr}
    </span>
  );
}

function RobotsPage() {
  const robot = useRobot();
  const { currentSignal, currentPhase: phase, historyRounds, liveRounds, isAdmin } = robot;
  const [selectedRobotId] = useState("bacbo-live");

  const lastRound = liveRounds.at(-1);
  const winner =
    lastRound?.outcome === "P" ? "player" : lastRound?.outcome === "B" ? "banker" : undefined;
  const dist = useMemo(() => summarizeRoundFrequencies(historyRounds), [historyRounds]);

  return (
    <div className="flex flex-col gap-3 pb-6 sm:gap-3.5">
      {/* Top bar: title + clock */}
      <header className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Emoji3D src={robotEmoji} size={22} />
          <h1 className="font-display text-base font-extrabold tracking-wide sm:text-lg">
            Bac Bo Live
          </h1>
        </div>
        <Clock />
      </header>

      {/* Main layout: single-column stack on mobile, balanced columns on desktop */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch">
        <div className="lg:order-1">
          <LiveTableCard rounds={liveRounds} />
        </div>

        <div className="lg:order-3">
          <Scoreboard />
        </div>

        <div className="lg:order-2">
          <LiquidBoard dist={dist} winner={winner} />
        </div>

        <div className="lg:order-4">
          <AnimatePresence mode="wait">
            {phase === "maintenance" ? (
              <Panel key="maint">
                <div className="glass-icon h-11 w-11 text-tie-glow">
                  <Wrench className="h-5 w-5" />
                </div>
                <h2 className="mt-2 font-display text-base font-extrabold sm:text-lg">
                  MODO MANUTENÇÃO
                </h2>
                <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                  {isAdmin
                    ? "O robô está em modo manutenção. Edite as configurações no painel administrativo."
                    : "O administrador está calibrando o sistema. Volte em instantes."}
                </p>
              </Panel>
            ) : phase === "paused" ? (
              <Panel key="paused">
                <div className="glass-icon h-11 w-11 text-tie-glow">
                  <Moon className="h-5 w-5" fill="currentColor" strokeWidth={1.6} />
                </div>
                <h2 className="mt-2 font-display text-base font-extrabold sm:text-lg">
                  ROBÔ PAUSADO
                </h2>
                <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                  {isAdmin
                    ? "O robô está desligado em modo manutenção. Use o painel administrativo para retomar."
                    : "O administrador está calibrando o sistema. Volte em instantes."}
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
                    ? "O robô está desligado em modo manutenção. Use o painel administrativo para retomar."
                    : "O administrador está calibrando o sistema. Volte em instantes."}
                </p>
              </Panel>
            ) : robot.reason === "no_connection" ? (
              <Panel key="noconn">
                <div className="glass-icon h-11 w-11 text-destructive">
                  <WifiOff className="h-5 w-5" />
                </div>
                <h2 className="mt-2 font-display text-base font-extrabold sm:text-lg">
                  SEM SINAL DA MESA
                </h2>
                <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                  {isAdmin
                    ? "Nenhuma rodada recente recebida da mesa. Verifique a chave no painel Admin."
                    : "Aguardando novas rodadas da mesa para gerar o próximo sinal."}
                </p>
              </Panel>
            ) : phase === "analyzing" || !currentSignal ? (
              <Panel key="analyzing">
                <div className="glass-icon relative h-12 w-12">
                  <div className="relative flex h-full w-full items-center justify-center">
                    <span className="h-4 w-4 rounded-full bg-tie-glow/60 animate-ping" />
                    <Logo className="absolute h-6 w-6 text-foreground" />
                  </div>
                </div>
                <h2 className="mt-2 font-display text-base font-extrabold sm:text-lg">
                  ANALISANDO MESA
                </h2>
                <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                  {robot.status?.trend?.description ?? "Buscando o melhor padrão para a entrada…"}
                </p>
              </Panel>
            ) : (
              <SignalOrb
                key={`${currentSignal.id}-${robot.gale ? "gale" : "normal"}`}
                side={currentSignal.side}
                signal={currentSignal}
                gale={robot.gale}
                phaseStart={robot.phaseStart}
                phaseEnd={robot.phaseEnd}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.16 }}
      className="liquid-glass relative isolate flex flex-col items-center overflow-hidden rounded-xl px-4 py-5 text-center sm:px-5 sm:py-6 lg:h-full lg:justify-center lg:px-6 lg:py-8"
    >
      <div className="relative z-10 flex w-full flex-col items-center">{children}</div>
    </motion.div>
  );
}
