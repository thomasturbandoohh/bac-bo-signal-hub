import { motion } from "framer-motion";
import type { Side, Signal } from "@/lib/bacbo-engine";
import { Water } from "@/components/bacbo/Water";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

/** Calm, low water layer used on standby/analyzing panels. */
export function WaterWave({ side }: { side?: Side; raised?: boolean }) {
  return <Water level={10} tone={side ?? "neutral"} calm className="opacity-50" />;
}

export function SignalOrb({
  side,
  signal: _signal,
  gale = false,
  phaseStart,
  phaseEnd,
}: {
  side: Side;
  signal?: Signal | null;
  gale?: boolean;
  phaseStart: number;
  phaseEnd: number;
}) {
  const now = useNow(1000);
  const isPlayer = side === "player";
  const left = Math.max(0, Math.min(1, (phaseEnd - now) / (phaseEnd - phaseStart)));
  const secondsLeft = Math.max(0, Math.ceil((phaseEnd - now) / 1000));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className="liquid-glass relative isolate flex flex-col items-center overflow-hidden rounded-[1.6rem] px-4 py-5 sm:px-5 sm:py-6"
    >
      {/* Transparent tint of the side to bet on, with a matching border */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-inset",
          isPlayer ? "bg-player/15 ring-player-glow/70" : "bg-banker/15 ring-banker-glow/70",
        )}
      />

      <div className="relative z-10 flex flex-col items-center">
        {gale && (
          <span className="mb-2 rounded-full bg-tie/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-tie-glow ring-1 ring-tie/40">
            Gale 1 · última tentativa
          </span>
        )}
        <div className="glass-icon h-14 w-14 rounded-full sm:h-16 sm:w-16">
          <div
            className={cn(
              "h-9 w-9 rounded-full animate-bob sm:h-10 sm:w-10",
              isPlayer ? "ball-player" : "ball-banker",
            )}
          />
        </div>

        <span className="mt-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70">
          {gale ? "Faça o gale em" : "Entrada confirmada"}
        </span>
        <h2
          className={cn(
            "mt-0.5 font-display text-2xl font-extrabold tracking-[0.12em] text-emboss sm:text-3xl",
            isPlayer ? "text-player-glow" : "text-banker-glow",
          )}
        >
          {isPlayer ? "PLAYER" : "BANKER"}
        </h2>

        <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/75">
          Aposte agora · <span className="tabular-nums text-foreground">{secondsLeft}s</span>
        </p>

        <div className="mt-2.5 h-1.5 w-28 overflow-hidden rounded-full bg-background/40 sm:w-32">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-1000 ease-linear",
              isPlayer ? "bg-player-glow" : "bg-banker-glow",
            )}
            style={{ width: `${left * 100}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}
