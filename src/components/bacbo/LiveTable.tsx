import { motion } from "framer-motion";
import { Ball, outcomeKind, outcomeLabel } from "@/components/bacbo/Ball";
import type { LiveRound } from "@/lib/live-table";
import { cn } from "@/lib/utils";

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function LiveWavesIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      <path d="M16.2 7.8a6 6 0 0 1 0 8.4" />
      <path d="M7.8 7.8a6 6 0 0 0 0 8.4" />
      <path d="M19.5 4.5a11 11 0 0 1 0 15" />
      <path d="M4.5 4.5a11 11 0 0 0 0 15" />
    </svg>
  );
}

/** A translucent 3D casino die (blue for Player, red for Banker) with white pips */
export function DieFace({
  value,
  tone,
  size = 32,
}: {
  value: number;
  tone: "player" | "banker";
  size?: number;
}) {
  const on = PIPS[value] ?? [];
  return (
    <span
      role="img"
      aria-label={value ? `Dado ${value}` : "Dado"}
      className={cn(
        "grid shrink-0 grid-cols-3 grid-rows-3 place-items-center rounded-[24%] transition-transform duration-200",
        tone === "player"
          ? "bg-gradient-to-br from-[#3b82f6] via-[#1d4ed8] to-[#1e40af] shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.45),inset_0_-2px_4px_rgba(0,0,0,0.5),0_4px_10px_-2px_rgba(30,64,175,0.6)]"
          : "bg-gradient-to-br from-[#ef4444] via-[#b91c1c] to-[#991b1b] shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.45),inset_0_-2px_4px_rgba(0,0,0,0.5),0_4px_10px_-2px_rgba(185,28,28,0.6)]",
        !value && "opacity-35",
      )}
      style={{ width: size, height: size, padding: Math.round(size * 0.14) }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "rounded-full transition-opacity",
            on.includes(i)
              ? "bg-white shadow-[0_0.5px_1px_rgba(0,0,0,0.4)]"
              : "opacity-0",
          )}
          style={{ width: Math.round(size * 0.18), height: Math.round(size * 0.18) }}
        />
      ))}
    </span>
  );
}

export function LiveTableCard({ rounds }: { rounds: LiveRound[] }) {
  const last = rounds[rounds.length - 1] ?? null;
  const pDice = last ? last.p : [0, 0];
  const bDice = last ? last.b : [0, 0];
  const pScore = last ? last.pScore : "–";
  const bScore = last ? last.bScore : "–";
  const outcome = last?.outcome ?? null;

  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-[#12151c]/90 p-3.5 sm:p-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.65)] backdrop-blur-xl">
      {/* Top Header: MESA AO VIVO and Ao Vivo status badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#34d399] shadow-inner">
            <LiveWavesIcon className="h-4.5 w-4.5" />
          </div>
          <span className="font-display text-xs font-black uppercase tracking-[0.18em] text-white/90">
            MESA AO VIVO
          </span>
        </div>

        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border transition-colors",
            last
              ? "border-[#1b5e3a]/70 bg-[#0e2a1b]/90 text-[#34d399] shadow-[0_0_12px_rgba(52,211,153,0.15)]"
              : "border-destructive/40 bg-destructive/10 text-destructive",
          )}
        >
          <span className="relative flex h-2 w-2">
            {last && (
              <span className="absolute inset-0 animate-ping rounded-full bg-[#34d399] opacity-75" />
            )}
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                last ? "bg-[#34d399]" : "bg-destructive",
              )}
            />
          </span>
          {last ? "Ao vivo" : "Sem conexão"}
        </span>
      </div>

      {/* Main Table Display: PLAYER | OUTCOME SPHERE | BANKER */}
      <motion.div
        key={last?.id ?? "none"}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative mt-3 flex items-center justify-between gap-1.5 sm:gap-2.5"
      >
        {/* PLAYER Side */}
        <div
          className={cn(
            "flex flex-1 flex-col justify-between rounded-2xl border p-2.5 sm:p-3 transition-all duration-300 min-w-0",
            outcome === "P"
              ? "border-[#38bdf8]/60 bg-[#0e223d]/90 shadow-[0_0_20px_-4px_rgba(56,189,248,0.3)]"
              : "border-[#1e3458]/70 bg-[#0c1626]/85",
          )}
        >
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#38bdf8]">
            PLAYER
          </span>
          <div className="mt-2.5 flex items-center gap-2">
            <DieFace value={pDice[0] ?? 0} tone="player" size={30} />
            <DieFace value={pDice[1] ?? 0} tone="player" size={30} />
            <span className="ml-1 sm:ml-2 font-display text-2xl sm:text-3xl font-black tabular-nums text-white/95">
              {pScore}
            </span>
          </div>
        </div>

        {/* Center 3D Outcome Ball */}
        <div className="relative z-10 -mx-2.5 sm:-mx-3 flex items-center justify-center">
          {last ? (
            <Ball kind={outcomeKind(last.outcome)} label={outcomeLabel(last.outcome)} size={34} />
          ) : (
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#181c26] border border-white/10 font-display text-sm font-bold text-muted-foreground">
              –
            </span>
          )}
        </div>

        {/* BANKER Side */}
        <div
          className={cn(
            "flex flex-1 flex-col justify-between rounded-2xl border p-2.5 sm:p-3 transition-all duration-300 min-w-0",
            outcome === "B"
              ? "border-[#f87171]/60 bg-[#351319]/90 shadow-[0_0_20px_-4px_rgba(248,113,113,0.3)]"
              : "border-[#521c22]/70 bg-[#240f13]/85",
          )}
        >
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#f87171] text-right">
            BANKER
          </span>
          <div className="mt-2.5 flex items-center justify-end gap-2">
            <span className="mr-1 sm:mr-2 font-display text-2xl sm:text-3xl font-black tabular-nums text-white/95">
              {bScore}
            </span>
            <DieFace value={bDice[0] ?? 0} tone="banker" size={30} />
            <DieFace value={bDice[1] ?? 0} tone="banker" size={30} />
          </div>
        </div>
      </motion.div>

      {last?.outcome === "T" && last.multiplier && (
        <p className="mt-2 text-center text-xs font-bold text-tie-glow">
          Empate pagou {last.multiplier}x
        </p>
      )}
    </div>
  );
}
