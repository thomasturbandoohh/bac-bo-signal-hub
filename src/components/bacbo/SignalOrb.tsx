import { motion } from "framer-motion";
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
  const now = useNow(1000);
  const isPlayer = side === "player";
  const secondsLeft = Math.max(0, Math.ceil((phaseEnd - now) / 1000));
  const left = Math.max(0, Math.min(1, (phaseEnd - now) / (phaseEnd - phaseStart)));

  // "CASA" for Banker, "VISITANTE" for Player
  const sideTitle = isPlayer ? "VISITANTE" : "CASA";

  return (
    <div className="flex flex-col gap-3">
      {/* Main Signal Card inspired directly by reference */}
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.98 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative flex flex-col items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#121622]/95 px-5 py-7 text-center shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl"
      >
        {/* Gale badge if active */}
        {gale && (
          <span className="mb-3 rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/20 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#fbbf24] shadow-sm">
            Gale 1 · Última tentativa
          </span>
        )}

        {/* Concentric Target Orb */}
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#202738] bg-[#0b0e17] shadow-[inset_0_2px_6px_rgba(0,0,0,0.8),0_0_20px_rgba(0,0,0,0.5)]">
          <div
            className={cn(
              "h-8 w-8 rounded-full transition-all duration-300",
              isPlayer
                ? "bg-gradient-to-br from-[#60a5fa] via-[#3b82f6] to-[#1d4ed8] shadow-[0_0_18px_rgba(59,130,246,0.85)]"
                : "bg-gradient-to-br from-[#f87171] via-[#ef4444] to-[#b91c1c] shadow-[0_0_18px_rgba(239,68,68,0.85)]",
            )}
          />
        </div>

        {/* Subtitle */}
        <span className="mt-3.5 text-xs font-bold uppercase tracking-[0.24em] text-white/65">
          {gale ? "ENTRADA GALE 1" : "ENTRADA CONFIRMADA"}
        </span>

        {/* Target Big Label: CASA / VISITANTE */}
        <h2
          className={cn(
            "mt-1 font-display text-4xl font-black tracking-wider drop-shadow-md sm:text-5xl",
            isPlayer ? "text-[#38bdf8]" : "text-[#ef4444]",
          )}
        >
          {sideTitle}
        </h2>

        {/* Three Indicator Dashes */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="h-1 w-6 rounded-full bg-white/20" />
          <span className="h-1 w-6 rounded-full bg-white/20" />
          <span className="h-1 w-6 rounded-full bg-white/20" />
        </div>

        {/* Timing and Protection Details */}
        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold">
          <span className="rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-0.5 text-white/80">
            Aposte em até <strong className="text-white tabular-nums">{secondsLeft}s</strong>
          </span>
          <span className="rounded-full bg-[#f59e0b]/15 border border-[#f59e0b]/30 px-2.5 py-0.5 text-[#fbbf24]">
            Proteção no Empate 🟡
          </span>
          {signal && (
            <span className="rounded-full bg-[#10b981]/15 border border-[#10b981]/30 px-2.5 py-0.5 text-[#34d399]">
              Confluência {signal.confidence}%
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-3.5 h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-1000 ease-linear",
              isPlayer ? "bg-[#38bdf8]" : "bg-[#ef4444]",
            )}
            style={{ width: `${left * 100}%` }}
          />
        </div>
      </motion.div>

      {/* CASINO 1 Gold Button below the card */}
      <a
        href="#casino"
        onClick={(e) => {
          e.preventDefault();
          // Scroll or open casino
          window.open("https://bacbo.live", "_blank", "noopener,noreferrer");
        }}
        className="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffd44d] via-[#f7c22d] to-[#e8b31a] py-3.5 px-6 font-display text-sm font-black uppercase tracking-[0.16em] text-[#1c1400] shadow-[0_8px_24px_-4px_rgba(247,194,45,0.45)] transition-all duration-200 hover:brightness-105 active:scale-[0.99]"
      >
        <span>CASINO 1</span>
      </a>
    </div>
  );
}
