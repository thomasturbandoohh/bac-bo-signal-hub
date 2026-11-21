import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Two smooth wave periods across 600 units, so sliding the 200%-wide strip by -50% loops seamlessly. */
const CREST = "M0 8 C 50 1, 100 1, 150 8 S 250 15, 300 8 S 400 1, 450 8 S 550 15, 600 8 V 16 H 0 Z";

/**
 * One layer of water: a wavy crest and the body under it, composited as a single group
 * (opacity + mask on the wrapper) so the crest and the body never show a seam or a line.
 */
function Layer({
  className,
  waveClass,
  offset,
}: {
  className?: string;
  waveClass: string;
  offset: number;
}) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 [mask-image:linear-gradient(to_bottom,black_0%,black_35%,rgb(0_0_0/0.55)_100%)]",
        className,
      )}
      style={{ top: -offset }}
    >
      <div className="absolute inset-x-0 top-0 h-4 overflow-hidden">
        <svg
          viewBox="0 0 600 16"
          preserveAspectRatio="none"
          className={cn("absolute inset-y-0 left-0 h-full w-[200%]", waveClass)}
        >
          <path d={CREST} fill="currentColor" />
        </svg>
      </div>
      {/* Overlaps the crest by 1px inside the same composited group: no visible join. */}
      <div className="absolute inset-x-0 bottom-0 top-[15px] bg-current" />
    </div>
  );
}

/**
 * Soft water inside a card: two drifting wave layers with no lines or edges.
 * `level` is the water height in % of the card; it rises and falls smoothly.
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
      transition={{ type: "spring", stiffness: 32, damping: 13, mass: 1.3 }}
    >
      <Layer
        offset={14}
        className="opacity-30"
        waveClass={cn(calm ? "animate-wave-slow" : "animate-wave", "[animation-direction:reverse]")}
      />
      <Layer
        offset={10}
        className={calm ? "opacity-45" : "opacity-60"}
        waveClass={calm ? "animate-wave-slow" : "animate-wave"}
      />
    </motion.div>
  );
}
