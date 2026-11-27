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

  // "CASA" para Banker, "VISITANTE" para Player
  const sideTitle = isPlayer ? "VISITANTE" : "CASA";

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
        className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-[#121622]/95 px-4 py-6 sm:px-6 sm:py-7 text-center shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl"
      >
        {/* Gale badge if active */}
        {gale && (
          <span
            role="status"
            className="mb-2.5 rounded-full border border-amber-500/50 bg-amber-500/20 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-300 shadow-sm"
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
        <span className="mt-3 text-[11px] sm:text-xs font-black uppercase tracking-[0.22em] text-white/80">
          {gale ? "ENTRADA GALE 1" : "ENTRADA CONFIRMADA"}
        </span>

        {/* Target Big Label: CASA / VISITANTE */}
        <h2
          className={cn(
            "mt-1 font-display text-3xl sm:text-5xl font-black tracking-wider drop-shadow-md",
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
        <div className="mt-3 sm:mt-3.5 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-bold">
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
          className="mt-3.5 h-1.5 w-28 sm:w-36 overflow-hidden rounded-full bg-white/15"
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-1000 ease-linear motion-reduce:transition-none",
              isPlayer ? "bg-[#38bdf8]" : "bg-[#ef4444]",
            )}
            style={{ width: `${left * 100}%` }}
          />
        </div>
      </motion.section>
  );
}
