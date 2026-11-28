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
      className={cn(
        "glass-premium relative flex flex-col items-center justify-center overflow-hidden rounded-2xl px-4 py-6 text-center sm:px-6 sm:py-7 lg:h-full transition-all duration-300",
        isPlayer
          ? "border-player-glow/30 shadow-[0_0_50px_-15px_rgba(56,189,248,0.35)]"
          : "border-banker-glow/30 shadow-[0_0_50px_-15px_rgba(244,63,94,0.35)]",
      )}
    >
      {/* Corner HUD Accent Brackets */}
      <span className="pointer-events-none absolute left-3 top-3 h-2.5 w-2.5 border-l-2 border-t-2 border-white/20" />
      <span className="pointer-events-none absolute right-3 top-3 h-2.5 w-2.5 border-r-2 border-t-2 border-white/20" />
      <span className="pointer-events-none absolute bottom-3 left-3 h-2.5 w-2.5 border-b-2 border-l-2 border-white/20" />
      <span className="pointer-events-none absolute bottom-3 right-3 h-2.5 w-2.5 border-b-2 border-r-2 border-white/20" />

      {/* Gale badge if active */}
      {gale && (
        <span
          role="status"
          className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-amber-500/60 bg-amber-500/20 px-3.5 py-1 text-[0.6875rem] font-black uppercase tracking-[0.2em] text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse"
        >
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Gale 1 · Última tentativa
        </span>
      )}

      {/* Futuristic Concentric Target Radar Orb */}
      <div className="relative my-1 flex items-center justify-center">
        {/* Pulsing Sonar Ring */}
        {!shouldReduceMotion && (
          <span
            className={cn(
              "absolute h-20 w-20 sm:h-24 sm:w-24 rounded-full opacity-35 animate-ping",
              isPlayer ? "bg-player-glow" : "bg-banker-glow",
            )}
          />
        )}

        <div
          aria-hidden="true"
          className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full border-2 border-white/20 bg-[#080b12] shadow-[inset_0_2px_8px_rgba(0,0,0,0.9),0_0_30px_rgba(0,0,0,0.7)]"
        >
          {/* Outer Ring */}
          <div
            className={cn(
              "absolute inset-1 rounded-full border border-dashed opacity-50",
              isPlayer ? "border-player-glow" : "border-banker-glow",
            )}
          />
          {/* Inner Glowing Core */}
          <div
            className={cn(
              "h-8 w-8 sm:h-10 sm:w-10 rounded-full transition-all duration-300",
              isPlayer
                ? "bg-gradient-to-br from-cyan-300 via-blue-500 to-indigo-700 shadow-[0_0_25px_rgba(56,189,248,0.9)]"
                : "bg-gradient-to-br from-rose-300 via-red-500 to-rose-800 shadow-[0_0_25px_rgba(244,63,94,0.9)]",
            )}
          />
        </div>
      </div>

      {/* Subtitle Status */}
      <div className="mt-3 flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-75" />
          <span className="relative h-2 w-2 rounded-full bg-success" />
        </span>
        <span className="text-[0.6875rem] sm:text-xs font-black uppercase tracking-[0.25em] text-white/90">
          {gale ? "ENTRADA GALE 1" : "SINAL CONFIRMADO"}
        </span>
      </div>

      {/* Target Big Label: PLAYER / BANKER */}
      <h2
        className={cn(
          "mt-0.5 max-w-full font-display text-4xl font-black tracking-wider drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] sm:text-5xl lg:text-6xl",
          isPlayer
            ? "text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 via-sky-400 to-blue-600 drop-shadow-[0_0_20px_rgba(56,189,248,0.6)]"
            : "text-transparent bg-clip-text bg-gradient-to-b from-rose-200 via-red-400 to-rose-600 drop-shadow-[0_0_20px_rgba(244,63,94,0.6)]",
        )}
      >
        {sideTitle}
      </h2>

      {/* Timing and Protection Directives Pills */}
      <div className="mt-3.5 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[0.625rem] sm:text-[0.6875rem] font-bold">
        <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/[0.08] px-3 py-1 text-white shadow-sm backdrop-blur-md">
          Apostar em até{" "}
          <strong className="text-white tabular-nums font-black">{secondsLeft}s</strong>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-500/20 px-3 py-1 text-amber-200 shadow-sm backdrop-blur-md">
          Proteção no Empate 🟡 8x
        </span>
        {signal && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3 py-1 text-emerald-200 shadow-sm backdrop-blur-md">
            Assertividade {signal.confidence}%
          </span>
        )}
      </div>

      {/* Progress Bar with Glowing Head */}
      <div
        role="progressbar"
        aria-valuenow={Math.round(left * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Tempo restante de entrada"
        className="mt-4 h-2 w-40 overflow-hidden rounded-full bg-white/10 p-[1px] sm:w-48 shadow-inner"
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
          className="absolute inset-y-0 left-0 w-1/2 animate-sheen bg-gradient-to-r from-transparent via-white/40 to-transparent"
        />
      )}
    </motion.div>
  );
}
