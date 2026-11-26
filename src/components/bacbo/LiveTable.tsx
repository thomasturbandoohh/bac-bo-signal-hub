import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import { Ball, outcomeKind, outcomeLabel } from "@/components/bacbo/Ball";
import type { LiveRound } from "@/lib/live-table";
import { cn } from "@/lib/utils";

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** A translucent casino die (blue for Player, red for Banker) with white pips. */
export function DieFace({
  value,
  tone,
  size = 26,
}: {
  value: number;
  tone: "player" | "banker";
  size?: number;
}) {
  const on = PIPS[value] ?? [];
  return (
    <span
      role="img"
      aria-label={value ? `Dado ${value}` : "Dado"}
      className={cn(
        "grid shrink-0 grid-cols-3 grid-rows-3 place-items-center rounded-[24%]",
        tone === "player" ? "die-player" : "die-banker",
        !value && "opacity-40",
      )}
      style={{ width: size, height: size, padding: Math.round(size * 0.14) }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className={cn("rounded-full", on.includes(i) && "bg-pip shadow-sm")}
          style={{ width: Math.round(size * 0.18), height: Math.round(size * 0.18) }}
        />
      ))}
    </span>
  );
}

function Side({ round, side }: { round: LiveRound | null; side: "player" | "banker" }) {
  const isPlayer = side === "player";
  const dice = round ? (isPlayer ? round.p : round.b) : [0, 0];
  const score = round ? (isPlayer ? round.pScore : round.bScore) : null;
  const won = !!round && round.outcome === (isPlayer ? "P" : "B");
  return (
    <div
      className={cn(
        "relative flex flex-1 flex-col gap-1.5 rounded-xl px-2.5 py-2 ring-1 transition-colors",
        isPlayer ? "items-start bg-player/10" : "items-end bg-banker/10",
        won
          ? isPlayer
            ? "ring-player-glow/60 bg-player/20"
            : "ring-banker-glow/60 bg-banker/20"
          : "ring-glass-border",
      )}
    >
      <span
        className={cn(
          "text-[10px] font-extrabold uppercase tracking-[0.16em]",
          isPlayer ? "text-player-glow" : "text-banker-glow",
        )}
      >
        {isPlayer ? "Player" : "Banker"}
      </span>
      <div className={cn("flex items-center gap-1.5", !isPlayer && "flex-row-reverse")}>
        <DieFace value={dice[0] ?? 0} tone={side} />
        <DieFace value={dice[1] ?? 0} tone={side} />
        <span
          className={cn(
            "ml-0.5 mr-0.5 font-display text-xl font-extrabold tabular-nums",
            won ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {score ?? "–"}
        </span>
      </div>
    </div>
  );
}

export function LiveTableCard({ rounds }: { rounds: LiveRound[] }) {
  const last = rounds[rounds.length - 1] ?? null;

  return (
    <div className="liquid-glass rounded-[1.4rem] p-3 sm:p-3.5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-foreground/85">
          <span className="glass-icon h-6 w-6">
            <Radio className={cn("h-3.5 w-3.5", last ? "text-success" : "text-muted-foreground")} />
          </span>
          Mesa ao vivo
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1",
            last
              ? "bg-success/10 text-success ring-success/30"
              : "bg-destructive/10 text-destructive ring-destructive/30",
          )}
        >
          <span className="relative flex h-1.5 w-1.5">
            {last && <span className="absolute inset-0 animate-ping rounded-full bg-success/70" />}
            <span
              className={cn(
                "relative h-1.5 w-1.5 rounded-full",
                last ? "bg-success" : "bg-destructive",
              )}
            />
          </span>
          {last ? "Ao vivo" : "Sem conexão"}
        </span>
      </div>

      <motion.div
        key={last?.id ?? "none"}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative mt-2.5 flex items-stretch gap-2"
      >
        <Side round={last} side="player" />
        <Side round={last} side="banker" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full p-1 bg-background/70 ring-1 ring-glass-border">
          {last ? (
            <Ball kind={outcomeKind(last.outcome)} label={outcomeLabel(last.outcome)} size={26} />
          ) : (
            <span className="flex h-[26px] w-[26px] items-center justify-center font-display text-sm font-bold text-muted-foreground">
              ×
            </span>
          )}
        </div>
      </motion.div>

      {last?.outcome === "T" && last.multiplier && (
        <p className="mt-1.5 text-center text-[11px] font-bold text-tie-glow">
          Empate pagou {last.multiplier}x
        </p>
      )}
    </div>
  );
}
