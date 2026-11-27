import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { History } from "lucide-react";
import { useRobot } from "@/lib/robot-context";
import { historyEntries, type HistoryEntry } from "@/lib/signal-history";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_approved/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — Bac Bo Live" },
      {
        name: "description",
        content: "Todos os sinais que o robô Bac Bo Live mandou e o resultado de cada um.",
      },
      { property: "og:title", content: "Histórico — Bac Bo Live" },
      { property: "og:description", content: "Sinais do robô com Green, Red e Green no G1." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

/** The history card always shows exactly this many positions. */
const HISTORY_SLOTS = 20;

function HistoryPage() {
  const { sessionSignals, results, phase } = useRobot();
  const entries = useMemo(() => historyEntries(sessionSignals, results), [sessionSignals, results]);
  const counts = useMemo(() => {
    let green = 0,
      g1 = 0,
      red = 0;
    for (const e of entries) {
      if (e.result === "green") green++;
      else if (e.result === "green_g1") g1++;
      else if (e.result === "red") red++;
    }
    return { green, g1, red };
  }, [entries]);

  return (
    <div className="mx-auto space-y-3 pt-2 sm:space-y-4 sm:pt-3 lg:max-w-3xl">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Histórico</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Sinais desde que o robô foi ligado
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Count label="Green" value={counts.green} tone="text-success" dot="bg-success" />
        <Count label="Green G1" value={counts.g1} tone="text-success" dot="bg-tie-glow" />
        <Count label="Red" value={counts.red} tone="text-destructive" dot="bg-destructive" />
      </div>

      {entries.length === 0 ? (
        <div className="glass-premium rounded-2xl px-4 py-10 text-center">
          <History className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">Nenhum sinal ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {phase === "off"
              ? "Quando o robô for ligado, os sinais aparecem aqui."
              : "O robô está analisando a mesa. Os sinais aparecem aqui assim que saírem."}
          </p>
        </div>
      ) : (
        <HistoryGrid entries={entries} />
      )}
    </div>
  );
}

function Count({
  label,
  value,
  tone,
  dot,
}: {
  label: string;
  value: number;
  tone: string;
  dot: string;
}) {
  return (
    <div className="glass-premium rounded-2xl px-2 py-2.5 text-center">
      <p className={cn("font-display text-lg font-extrabold tabular-nums sm:text-xl", tone)}>
        {value}
      </p>
      <p className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
        <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
        {label}
      </p>
    </div>
  );
}

/** Rim color of each indicator: the result the robot already scored for that signal. */
const RIM: Record<HistoryEntry["result"], string> = {
  green: "bg-success",
  green_g1: "bg-tie-glow",
  red: "bg-destructive",
  pending: "bg-white/20 animate-pulse motion-reduce:animate-none",
};

const RESULT_LABEL: Record<HistoryEntry["result"], string> = {
  green: "Green",
  green_g1: "Green no G1",
  red: "Red",
  pending: "em andamento",
};

/**
 * One compact card with the last 20 signals, oldest to newest. When a new signal arrives with
 * the card full, the oldest one leaves and the new one enters; the card never changes size.
 */
function HistoryGrid({ entries }: { entries: HistoryEntry[] }) {
  const shouldReduceMotion = useReducedMotion();
  const recent = useMemo(() => entries.slice(0, HISTORY_SLOTS).reverse(), [entries]);
  const empty = HISTORY_SLOTS - recent.length;

  return (
    <section
      aria-label={`Últimos ${HISTORY_SLOTS} sinais`}
      className="glass-premium rounded-2xl p-3 sm:p-4"
    >
      <ol className="grid grid-cols-10 gap-1.5 sm:gap-2.5">
        {recent.map((e) => {
          const player = e.side === "player";
          return (
            <motion.li
              key={e.key}
              layout={!shouldReduceMotion}
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              aria-label={`${player ? "Player" : "Banker"}: ${RESULT_LABEL[e.result]}`}
              className={cn("aspect-square min-w-0 rounded-full p-[2px]", RIM[e.result])}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "block h-full w-full rounded-full",
                  player ? "ball-player" : "ball-banker",
                )}
              />
            </motion.li>
          );
        })}
        {Array.from({ length: empty }, (_, i) => (
          <li
            key={`empty-${i}`}
            aria-hidden="true"
            className="aspect-square min-w-0 rounded-full border border-dashed border-white/10 bg-white/[0.03]"
          />
        ))}
      </ol>
    </section>
  );
}
