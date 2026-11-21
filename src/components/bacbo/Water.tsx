import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** One wave period, drawn twice so sliding it by -50% loops seamlessly. */
const WAVE = "M0 6 C 25 0, 50 0, 75 6 S 125 12, 150 6 S 200 0, 225 6 S 275 12, 300 6 V 14 H 0 Z";

/**
 * Soft water inside a card: a body of colour with two drifting wave crests on top.
 * `level` is the water height in % of the card; it rises/falls smoothly.
 */
export function Water({
  level,
  tone,
  className,
  calm = false,
  from,
}: {
  level: number;
  tone: "player" | "banker" | "tie" | "success" | "neutral";
  className?: string;
  calm?: boolean;
  /** Start height on mount (in %), to make the water rise into place. */
  from?: number;
}) {
  const fill = {
    player: "text-player-glow",
    banker: "text-banker-glow",
    tie: "text-tie-glow",
    success: "text-success",
    neutral: "text-muted-foreground",
  }[tone];

  return (
    <motion.div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-x-0 bottom-0", fill, className)}
      initial={from === undefined ? false : { height: `${from}%` }}
      animate={{ height: `${level}%` }}
      transition={{ type: "spring", stiffness: 38, damping: 14, mass: 1.2 }}
    >
      <div className="absolute inset-x-0 -top-[9px] h-[10px] overflow-hidden">
        <svg
          viewBox="0 0 300 14"
          preserveAspectRatio="none"
          className={cn(
            "absolute inset-y-0 left-0 h-full w-[200%] opacity-35",
            calm ? "animate-wave-slow" : "animate-wave",
          )}
        >
          <path d={WAVE} transform="translate(0 0)" fill="currentColor" />
          <path d={WAVE} transform="translate(300 0)" fill="currentColor" />
        </svg>
        <svg
          viewBox="0 0 300 14"
          preserveAspectRatio="none"
          className="absolute inset-y-0 left-0 h-full w-[200%] opacity-60 animate-wave-slow [animation-direction:reverse]"
        >
          <path d={WAVE} fill="currentColor" />
          <path d={WAVE} transform="translate(300 0)" fill="currentColor" />
        </svg>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-current/60 to-current/25" />
      {/* Bright top edge only on raised (signal) water — on calm panels it sat on the progress bar */}
      {!calm && (
        <div className="absolute inset-x-0 top-0 h-px bg-current/80 blur-[0.5px]" />
      )}
    </motion.div>
  );
}
