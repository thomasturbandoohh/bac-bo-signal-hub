import { motion, useReducedMotion } from "framer-motion";
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
  size = 32,
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
      aria-label={
        value ? `Dado ${toneLabel} com valor ${value}` : `Dado ${toneLabel} aguardando resultado`
      }
      className={cn(
        "grid shrink-0 grid-cols-3 grid-rows-3 place-items-center rounded-[26%] transition-all duration-300 motion-reduce:transition-none shadow-md",
        tone === "player"
          ? "bg-gradient-to-br from-[#60a5fa] via-[#2563eb] to-[#1e3a8a] shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.6),inset_0_-2px_4px_rgba(0,0,0,0.6),0_4px_12px_-2px_rgba(37,99,235,0.7)] border border-blue-400/30"
          : "bg-gradient-to-br from-[#f87171] via-[#dc2626] to-[#7f1d1d] shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.6),inset_0_-2px_4px_rgba(0,0,0,0.6),0_4px_12px_-2px_rgba(220,38,38,0.7)] border border-rose-400/30",
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
            on.includes(i) ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.7)]" : "opacity-0",
          )}
          style={{
            width: Math.max(3, Math.round(size * 0.18)),
            height: Math.max(3, Math.round(size * 0.18)),
          }}
        />
      ))}
    </span>
  );
}

export function LiveTableCard({ rounds }: { rounds: LiveRound[] }) {
  const shouldReduceMotion = useReducedMotion();
  const last = rounds[rounds.length - 1] ?? null;
  const recent = rounds.slice(-10);
  const pDice = last ? last.p : [0, 0];
  const bDice = last ? last.b : [0, 0];
  const pScore = last ? last.pScore : "–";
  const bScore = last ? last.bScore : "–";
  const outcome = last?.outcome ?? null;

  return (
    <section
      aria-label="Mesa ao vivo Bac Bo"
      className="glass-premium rounded-2xl p-3.5 sm:p-4.5 border border-white/10 shadow-[0_16px_36px_-12px_rgba(0,0,0,0.8)]"
    >
      {/* Top Header: MESA AO VIVO and Ao Vivo status badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-[#34d399] shadow-inner">
            <LiveWavesIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </div>
          <div className="leading-none">
            <h2 className="font-display text-[0.6875rem] sm:text-xs font-black uppercase tracking-[0.18em] text-white">
              MESA AO VIVO
            </h2>
            <span className="text-[0.5625rem] font-bold text-muted-foreground uppercase tracking-wider">
              Bac Bo Live Studio
            </span>
          </div>
        </div>

        <span
          role="status"
          aria-label={last ? "Mesa conectada e ao vivo" : "Mesa sem conexão no momento"}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 sm:py-1 text-[0.625rem] sm:text-[0.6875rem] font-bold border transition-colors motion-reduce:transition-none",
            last
              ? "border-[#1b5e3a] bg-[#0c2417] text-[#34d399] shadow-[0_0_12px_rgba(52,211,153,0.25)]"
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

      {/* Main Table Display: PLAYER | BANKER */}
      <motion.div
        key={last?.id ?? "none"}
        initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: "easeOut" }}
        className="relative mt-3 grid grid-cols-2 gap-2 sm:gap-3"
      >
        {/* PLAYER Side */}
        <div
          className={cn(
            "side-player flex min-w-0 flex-col items-center justify-center rounded-2xl px-2 py-3 transition-all duration-300 motion-reduce:transition-none sm:px-3 sm:py-3.5",
            outcome === "P" && "side-player-win shadow-[0_0_24px_rgba(56,189,248,0.3)]",
          )}
        >
          <span className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-player-glow sm:text-xs">
            PLAYER
          </span>
          <div className="mt-2.5 flex items-center justify-center gap-2">
            <DieFace value={pDice[0] ?? 0} tone="player" size={32} />
            <DieFace value={pDice[1] ?? 0} tone="player" size={32} />
            <span className="ml-1 min-w-[2ch] text-center font-display text-2xl font-black leading-none tabular-nums text-white sm:text-3xl lg:text-4xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {pScore}
            </span>
          </div>
        </div>

        {/* BANKER Side */}
        <div
          className={cn(
            "side-banker flex min-w-0 flex-col items-center justify-center rounded-2xl px-2 py-3 transition-all duration-300 motion-reduce:transition-none sm:px-3 sm:py-3.5",
            outcome === "B" && "side-banker-win shadow-[0_0_24px_rgba(244,63,94,0.3)]",
          )}
        >
          <span className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-banker-glow sm:text-xs">
            BANKER
          </span>
          <div className="mt-2.5 flex items-center justify-center gap-2">
            <span className="mr-1 min-w-[2ch] text-center font-display text-2xl font-black leading-none tabular-nums text-white sm:text-3xl lg:text-4xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {bScore}
            </span>
            <DieFace value={bDice[0] ?? 0} tone="banker" size={32} />
            <DieFace value={bDice[1] ?? 0} tone="banker" size={32} />
          </div>
        </div>
      </motion.div>

      {last?.outcome === "T" && last.multiplier && (
        <div className="mt-2.5 flex items-center justify-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 py-1 text-center text-xs font-black text-amber-300 shadow-sm">
          <span>🟡</span>
          <span>EMPATE CONFIRMADO · PAGOU {last.multiplier}X</span>
        </div>
      )}

      {/* Recent Rounds Road / Bead Plate Strip */}
      {recent.length > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-2.5">
          <span className="text-[0.5625rem] font-extrabold uppercase tracking-[0.16em] text-white/50">
            Últimas rodadas
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {recent.map((r) => {
              const isP = r.outcome === "P";
              const isB = r.outcome === "B";
              const isT = r.outcome === "T";
              return (
                <span
                  key={r.id}
                  title={`Rodada ${r.outcome}: P ${r.pScore} x ${r.bScore} B`}
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-black leading-none shadow-sm",
                    isP &&
                      "bg-gradient-to-br from-blue-400 to-blue-700 text-white shadow-blue-500/30",
                    isB && "bg-gradient-to-br from-red-400 to-red-700 text-white shadow-red-500/30",
                    isT &&
                      "bg-gradient-to-br from-amber-300 to-amber-600 text-black shadow-amber-500/30",
                  )}
                >
                  {r.outcome}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
