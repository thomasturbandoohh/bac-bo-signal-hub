import { memo } from "react";
import { motion } from "framer-motion";
import { Water } from "@/components/bacbo/Water";
import { cn } from "@/lib/utils";

type Dist = { player: number; banker: number; tie: number; sampleSize: number };

/** Water while the robot searches or waits for the table. */
const LOW = 14;
/** Water on the side the robot says to bet on. */
const HIGH = 74;

const Pane = memo(function Pane({
  tone,
  label,
  value,
  level,
  highlight,
}: {
  tone: "player" | "banker";
  label: string;
  value: number | null;
  level: number;
  highlight: boolean;
}) {
  const isPlayer = tone === "player";
  return (
    <motion.div
      animate={{ scale: highlight ? 1.025 : 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={cn(
        "relative flex h-full flex-col items-center justify-end overflow-hidden pb-3 sm:pb-3.5",
        isPlayer
          ? "pane-player rounded-l-[1.6rem] rounded-r-md pr-[16%]"
          : "pane-banker rounded-r-[1.6rem] rounded-l-md pl-[16%]",
        highlight && (isPlayer ? "ring-2 ring-player-glow/70" : "ring-2 ring-banker-glow/70"),
      )}
    >
      <Water level={level} tone={tone} calm={!highlight} />
      {value !== null && (
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 font-display text-[1.7rem] font-extrabold leading-none tracking-tight tabular-nums text-foreground text-emboss sm:text-4xl"
        >
          {value}%
        </motion.span>
      )}
      <span className="relative z-10 mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/85 sm:text-[11px]">
        {label}
      </span>
    </motion.div>
  );
});

/**
 * Player / Tie / Banker board. While the robot searches or waits for the table the water stays
 * low and no numbers show; when a signal is sent, the water rises on the side to bet on.
 */
export const LiquidBoard = memo(function LiquidBoard({
  dist,
  winner,
}: {
  dist: Dist | null;
  /** Side of the signal currently open for betting (null = searching / waiting). */
  winner?: "player" | "banker" | null;
}) {
  const showNumbers = !!winner && !!dist;
  const level = (side: "player" | "banker") => (winner === side ? HIGH : LOW);

  return (
    <div className="relative h-28 sm:h-32 lg:h-44">
      <div className="absolute inset-y-0 left-0 w-[45%]">
        <Pane
          tone="player"
          label="Jogador"
          value={showNumbers && dist ? dist.player : null}
          level={level("player")}
          highlight={winner === "player"}
        />
      </div>
      <div className="absolute inset-y-0 right-0 w-[45%]">
        <Pane
          tone="banker"
          label="Casa"
          value={showNumbers && dist ? dist.banker : null}
          level={level("banker")}
          highlight={winner === "banker"}
        />
      </div>

      {/* The tie is never an entry: it only shows that the bet must be covered as protection. */}
      <div className="pane-tie absolute left-1/2 top-1/2 z-10 flex h-[5.6rem] w-[5.6rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center overflow-hidden rounded-full sm:h-[6.6rem] sm:w-[6.6rem]">
        <Water level={LOW + 2} tone="tie" calm />
        <span className="relative z-10 text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/90 sm:text-[10px]">
          Empate
        </span>
        {winner && (
          <motion.span
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 mt-0.5 text-[8px] font-extrabold uppercase tracking-[0.14em] text-foreground/75 sm:text-[9px]"
          >
            Proteção
          </motion.span>
        )}
      </div>
    </div>
  );
});
