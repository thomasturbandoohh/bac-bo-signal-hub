import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Wordmark de luxo e identidade visual premium Bac · Bo Live. */
export function Logo({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("flex flex-col items-center select-none", className)}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Brand Icon Emblem */}
      <div className="relative mb-1 flex items-center justify-center">
        <div className="relative flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-md">
          {/* Player Blue Gem */}
          <span className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-player-glow/60 blur-[3px]" />
            <span className="relative h-2 w-2 rounded-full bg-gradient-to-br from-cyan-300 via-blue-500 to-indigo-600 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          </span>

          {/* Central Gold Tie Diamond */}
          <span className="h-1.5 w-1.5 rotate-45 rounded-[1px] bg-gradient-to-br from-amber-200 to-amber-500 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />

          {/* Banker Red Gem */}
          <span className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-banker-glow/60 blur-[3px]" />
            <span className="relative h-2 w-2 rounded-full bg-gradient-to-br from-rose-300 via-red-500 to-rose-700 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
          </span>
        </div>
      </div>

      {/* Main Title BAC·BO with Metallic / Crystal Gradient */}
      <div className="relative flex items-center">
        <span className="font-display text-[1.75rem] sm:text-[1.95rem] font-black leading-none tracking-[0.18em] bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
          BAC
          <span className="mx-1 text-player-glow drop-shadow-[0_0_10px_rgba(56,189,248,0.7)]">
            ·
          </span>
          BO
        </span>
      </div>

      {/* Sleek Subtitle Tag */}
      <div className="mt-1.5 flex items-center gap-2">
        <span className="h-px w-6 bg-gradient-to-r from-transparent to-player/60" />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[0.5625rem] sm:text-[0.625rem] font-extrabold uppercase tracking-[0.3em] text-foreground/80">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-75" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
          </span>
          LIVE VIP
        </span>
        <span className="h-px w-6 bg-gradient-to-l from-transparent to-banker/60" />
      </div>
    </motion.div>
  );
}
