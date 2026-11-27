import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Side, Signal } from "@/lib/bacbo-engine";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

export function SignalOrb({
  side,
  signal,
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
  const shouldReduceMotion = useReducedMotion();
  const now = useNow(1000);
  const isPlayer = side === "player";
  const secondsLeft = Math.max(0, Math.ceil((phaseEnd - now) / 1000));
  const left = Math.max(0, Math.min(1, (phaseEnd - now) / (phaseEnd - phaseStart)));

  const sideTitle = isPlayer ? "PLAYER" : "BANKER";

  return (
    <motion.section
      aria-label={`Entrada confirmada no lado ${sideTitle}`}
      initial={
        shouldReduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.98 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={
        shouldReduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -4, scale: 0.98 }
      }
      transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: "easeOut" }}
      className="glass-premium relative flex flex-col items-center justify-center overflow-hidden rounded-xl px-4 py-6 text-center sm:px-6 sm:py-7 lg:h-full"
    >
      {/* Gale badge if active */}
      {gale && (
        <span
          role="status"
          className="mb-2.5 rounded-full border border-amber-500/50 bg-amber-500/20 px-3 py-0.5 text-[0.625rem] font-extrabold uppercase tracking-[0.2em] text-amber-300 shadow-sm"
        >
          Gale 1 · Última tentativa
        </span>
      )}

      {/* Concentric Target Orb */}
      <div
        aria-hidden="true"
        className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 border-[#202738] bg-[#0b0e17] shadow-[inset_0_2px_6px_rgba(0,0,0,0.8),0_0_20px_rgba(0,0,0,0.5)]"
      >
        <div
          className={cn(
            "h-7 w-7 sm:h-8 sm:w-8 rounded-full transition-all duration-300 motion-reduce:transition-none",
            isPlayer
              ? "bg-gradient-to-br from-[#60a5fa] via-[#3b82f6] to-[#1d4ed8] shadow-[0_0_18px_rgba(59,130,246,0.85)]"
              : "bg-gradient-to-br from-[#f87171] via-[#ef4444] to-[#b91c1c] shadow-[0_0_18px_rgba(239,68,68,0.85)]",
          )}
        />
      </div>

      {/* Subtitle */}
      <span className="mt-3 text-[0.6875rem] sm:text-xs font-black uppercase tracking-[0.22em] text-white/80">
        {gale ? "ENTRADA GALE 1" : "ENTRADA CONFIRMADA"}
      </span>

      {/* Target Big Label: PLAYER / BANKER */}
      <h2
        className={cn(
          "mt-1 max-w-full font-display text-3xl font-black tracking-wider drop-shadow-md sm:text-5xl",
          isPlayer ? "text-[#38bdf8]" : "text-[#f87171]",
        )}
      >
        {sideTitle}
      </h2>

      {/* Three Indicator Dashes */}
      <div aria-hidden="true" className="mt-2.5 sm:mt-3 flex items-center justify-center gap-2">
        <span className="h-1 w-5 sm:w-6 rounded-full bg-white/30" />
        <span className="h-1 w-5 sm:w-6 rounded-full bg-white/30" />
        <span className="h-1 w-5 sm:w-6 rounded-full bg-white/30" />
      </div>

      {/* Timing and Protection Details */}
      <div className="mt-3 sm:mt-3.5 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[0.625rem] sm:text-[0.6875rem] font-bold">
        <span className="rounded-full bg-white/[0.08] border border-white/15 px-2.5 py-0.5 text-white">
          Aposte em até <strong className="text-white tabular-nums">{secondsLeft}s</strong>
        </span>
        <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-amber-300">
          Proteção no Empate 🟡
        </span>
        {signal && (
          <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-emerald-300">
            Confluência {signal.confidence}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuenow={Math.round(left * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Tempo restante de entrada"
        className="mt-4 h-1.5 w-36 overflow-hidden rounded-full bg-white/10 sm:w-44"
      >
        <CountdownFill start={phaseStart} end={phaseEnd} reduceMotion={!!shouldReduceMotion} />
      </div>
    </motion.section>
  );
}

/** Blue fill that empties smoothly and continuously until the entry window closes. */
function CountdownFill({
  start,
  end,
  reduceMotion,
}: {
  start: number;
  end: number;
  reduceMotion: boolean;
}) {
  const [plan] = useState(() => {
    const now = Date.now();
    const total = Math.max(1, end - start);
    return {
      from: Math.min(1, Math.max(0, (end - now) / total)),
      seconds: Math.max(0.3, (end - now) / 1000),
    };
  });
  return (
    <motion.div
      className="progress-blue relative h-full overflow-hidden rounded-full"
      initial={{ width: `${plan.from * 100}%` }}
      animate={{ width: "0%" }}
      transition={{ duration: plan.seconds, ease: "linear" }}
    >
      {!reduceMotion && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1/2 animate-sheen bg-gradient-to-r from-transparent via-white/35 to-transparent"
        />
      )}
    </motion.div>
  );
}
