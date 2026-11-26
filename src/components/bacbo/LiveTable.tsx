import { motion, useReducedMotion } from "framer-motion";
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
      aria-hidden="true"
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
  size = 28,
}: {
  value: number;
  tone: "player" | "banker";
  size?: number;
}) {
  const on = PIPS[value] ?? [];
  const toneLabel = tone === "player" ? "azul do Jogador" : "vermelho da Banca";
  return (
    <span
      role="img"
      aria-label={value ? `Dado ${toneLabel} com valor ${value}` : `Dado ${toneLabel} aguardando resultado`}
      className={cn(
        "grid shrink-0 grid-cols-3 grid-rows-3 place-items-center rounded-[24%] transition-transform duration-200 motion-reduce:transition-none",
        tone === "player"
          ? "bg-gradient-to-br from-[#3b82f6] via-[#1d4ed8] to-[#1e40af] shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.6),0_3px_8px_-2px_rgba(30,64,175,0.7)]"
          : "bg-gradient-to-br from-[#ef4444] via-[#b91c1c] to-[#991b1b] shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.6),0_3px_8px_-2px_rgba(185,28,28,0.7)]",
        !value && "opacity-30",
      )}
      style={{ width: size, height: size, padding: Math.max(3, Math.round(size * 0.13)) }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn(
            "rounded-full transition-opacity motion-reduce:transition-none",
            on.includes(i)
              ? "bg-white shadow-[0_0.5px_1px_rgba(0,0,0,0.5)]"
              : "opacity-0",
          )}
          style={{ width: Math.max(3, Math.round(size * 0.18)), height: Math.max(3, Math.round(size * 0.18)) }}
        />
      ))}
    </span>
  );
}

export function LiveTableCard({ rounds }: { rounds: LiveRound[] }) {
  const shouldReduceMotion = useReducedMotion();
  const last = rounds[rounds.length - 1] ?? null;
  const pDice = last ? last.p : [0, 0];
  const bDice = last ? last.b : [0, 0];
  const pScore = last ? last.pScore : "–";
  const bScore = last ? last.bScore : "–";
  const outcome = last?.outcome ?? null;

  return (
    <section
      aria-label="Mesa ao vivo Bac Bo"
      className="rounded-xl border border-white/15 bg-[#12151c]/95 p-3 sm:p-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl"
    >
      {/* Top Header: MESA AO VIVO and Ao Vivo status badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-[#34d399] shadow-inner">
            <LiveWavesIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </div>
          <h2 className="font-display text-[11px] sm:text-xs font-black uppercase tracking-[0.16em] text-white">
            MESA AO VIVO
          </h2>
        </div>

        <span
          role="status"
          aria-label={last ? "Mesa conectada e ao vivo" : "Mesa sem conexão no momento"}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold border transition-colors motion-reduce:transition-none",
            last
              ? "border-[#1b5e3a] bg-[#0c2417] text-[#34d399] shadow-[0_0_12px_rgba(52,211,153,0.2)]"
              : "border-destructive/40 bg-destructive/15 text-destructive",
          )}
        >
          <span className="relative flex h-2 w-2" aria-hidden="true">
            {last && (
              <span className="absolute inset-0 rounded-full bg-[#34d399] opacity-75 animate-ping motion-reduce:animate-none" />
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
        initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
        className="relative mt-2.5 sm:mt-3 flex items-center justify-between gap-1 sm:gap-2.5"
      >
        {/* PLAYER Side */}
        <div
          className={cn(
            "flex flex-1 flex-col justify-between rounded-lg border p-2 sm:p-3 transition-all duration-200 motion-reduce:transition-none min-w-0",
            outcome === "P"
              ? "border-[#38bdf8] bg-[#0e223d]/95 shadow-[0_0_20px_-4px_rgba(56,189,248,0.4)]"
              : "border-[#1e3458]/80 bg-[#0c1626]/90",
          )}
        >
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#38bdf8]">
            PLAYER
          </span>
          <div className="mt-2 flex items-center gap-1 sm:gap-2">
            <DieFace value={pDice[0] ?? 0} tone="player" size={28} />
            <DieFace value={pDice[1] ?? 0} tone="player" size={28} />
            <span className="ml-1 sm:ml-2 font-display text-xl sm:text-2xl lg:text-3xl font-black tabular-nums text-white">
              {pScore}
            </span>
          </div>
        </div>

        {/* Center 3D Outcome Ball */}
        <div className="relative z-10 -mx-1.5 sm:-mx-3 flex shrink-0 items-center justify-center">
          {last ? (
            <Ball kind={outcomeKind(last.outcome)} label={outcomeLabel(last.outcome)} size={32} />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#181c26] border border-white/15 font-display text-xs font-bold text-muted-foreground">
              –
            </span>
          )}
        </div>

        {/* BANKER Side */}
        <div
          className={cn(
            "flex flex-1 flex-col justify-between rounded-lg border p-2 sm:p-3 transition-all duration-200 motion-reduce:transition-none min-w-0",
            outcome === "B"
              ? "border-[#f87171] bg-[#351319]/95 shadow-[0_0_20px_-4px_rgba(248,113,113,0.4)]"
              : "border-[#521c22]/80 bg-[#240f13]/90",
          )}
        >
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#f87171] text-right">
            BANKER
          </span>
          <div className="mt-2 flex items-center justify-end gap-1 sm:gap-2">
            <span className="mr-1 sm:mr-2 font-display text-xl sm:text-2xl lg:text-3xl font-black tabular-nums text-white">
              {bScore}
            </span>
            <DieFace value={bDice[0] ?? 0} tone="banker" size={28} />
            <DieFace value={bDice[1] ?? 0} tone="banker" size={28} />
          </div>
        </div>
      </motion.div>

      {last?.outcome === "T" && last.multiplier && (
        <p className="mt-2 text-center text-xs font-bold text-tie-glow">
          Empate pagou {last.multiplier}x
        </p>
      )}
    </section>
  );
}
