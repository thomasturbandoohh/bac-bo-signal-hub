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
      animate={{ scale: highlight ? 1.02 : 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={cn(
        "relative flex h-full flex-col items-center justify-end overflow-hidden pb-3 sm:pb-3.5 transition-all duration-300",
        isPlayer
          ? "pane-player rounded-l-[1.8rem] rounded-r-lg pr-[16%]"
          : "pane-banker rounded-r-[1.8rem] rounded-l-lg pl-[16%]",
        highlight &&
          (isPlayer
            ? "ring-2 ring-player-glow/80 shadow-[0_0_30px_rgba(56,189,248,0.4)]"
            : "ring-2 ring-banker-glow/80 shadow-[0_0_30px_rgba(244,63,94,0.4)]"),
      )}
    >
      <Water level={level} tone={tone} calm={!highlight} />
      {value !== null && (
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 font-display text-[1.85rem] font-black leading-none tracking-tight tabular-nums text-foreground text-emboss sm:text-4xl"
        >
          {value}%
        </motion.span>
      )}
      <span className="relative z-10 mt-1 inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[0.625rem] font-extrabold uppercase tracking-[0.2em] text-foreground/90 sm:text-[0.6875rem]">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            isPlayer
              ? "bg-player-glow shadow-[0_0_6px_rgba(56,189,248,0.8)]"
              : "bg-banker-glow shadow-[0_0_6px_rgba(244,63,94,0.8)]",
          )}
        />
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
    <div className="relative h-28 sm:h-34 lg:h-44 select-none">
      <div className="absolute inset-y-0 left-0 w-[46%]">
        <Pane
          tone="player"
          label="Jogador"
          value={showNumbers && dist ? dist.player : null}
          level={level("player")}
          highlight={winner === "player"}
        />
      </div>
      <div className="absolute inset-y-0 right-0 w-[46%]">
        <Pane
          tone="banker"
          label="Casa"
          value={showNumbers && dist ? dist.banker : null}
          level={level("banker")}
          highlight={winner === "banker"}
        />
      </div>

      {/* The tie is never an entry: it only shows that the bet must be covered as protection. */}
      <div className="pane-tie absolute left-1/2 top-1/2 z-10 flex h-[5.8rem] w-[5.8rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center overflow-hidden rounded-full shadow-[0_0_26px_rgba(251,191,36,0.4),0_0_0_5px_#05070d] sm:h-[6.8rem] sm:w-[6.8rem]">
        <Water level={LOW + 2} tone="tie" calm />
        <span className="relative z-10 text-[0.625rem] font-black uppercase tracking-[0.2em] text-foreground sm:text-[0.6875rem] drop-shadow-sm">
          Empate
        </span>
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 mt-0.5 rounded-full border border-amber-300/40 bg-black/40 px-2 py-0.5 text-[0.5rem] font-black uppercase tracking-[0.16em] text-amber-200 sm:text-[0.5625rem] shadow-sm"
        >
          Proteção 8x
        </motion.span>
      </div>
    </div>
  );
});
