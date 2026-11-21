import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRobot } from "@/lib/robot-context";
import type { Side } from "@/lib/bacbo-engine";
import { pendingGales, scoreSignals, summarize } from "@/lib/scoreboard";
import { cn } from "@/lib/utils";
import checkEmoji from "@/assets/emoji/check_mark_button.webp";
import crossEmoji from "@/assets/emoji/cross_mark.webp";
import warningEmoji from "@/assets/emoji/warning.webp";
import fireEmoji from "@/assets/emoji/fire.webp";
import moneyBagEmoji from "@/assets/emoji/money_bag.webp";
import moneyWingsEmoji from "@/assets/emoji/money_with_wings.webp";
import partyEmoji from "@/assets/emoji/party_popper.webp";

export function useSessionResults() {
  const { sessionSignals, rounds } = useRobot();
  return useMemo(() => scoreSignals(sessionSignals, rounds), [sessionSignals, rounds]);
}

export function Emoji3D({
  src,
  size = 28,
  className,
}: {
  src: string;
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      draggable={false}
      className={cn("select-none drop-shadow-lg", className)}
    />
  );
}

export function Scoreboard() {
  const results = useSessionResults();
  const s = summarize(results);
  const items = [
    { label: "Greens", value: s.greens, tone: "text-success", emoji: checkEmoji },
    { label: "Reds", value: s.reds, tone: "text-destructive", emoji: crossEmoji },
    {
      label: "Acerto",
      value: s.total ? `${s.rate}%` : "—",
      tone: "text-foreground",
      emoji: moneyBagEmoji,
    },
    { label: "Sequência", value: s.best, tone: "text-tie-glow", emoji: fireEmoji },
  ];

  return (
    <div className="liquid-glass grid grid-cols-4 rounded-[1.4rem] px-1.5 py-2.5 sm:py-3">
      {items.map((i) => (
        <div key={i.label} className="flex flex-col items-center gap-0.5">
          <Emoji3D src={i.emoji} size={20} />
          <span
            className={cn(
              "font-display text-lg font-extrabold tabular-nums leading-tight sm:text-xl",
              i.tone,
            )}
          >
            {i.value}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
            {i.label}
          </span>
        </div>
      ))}
    </div>
  );
}

type NoteKind = "green" | "green_tie" | "green_gale" | "gale" | "red" | "streak";
export interface Note {
  id: string;
  kind: NoteKind;
  side?: Side;
}

const NOTE_MS: Record<NoteKind, number> = {
  green: 3_400,
  green_tie: 3_400,
  green_gale: 4_000,
  gale: 7_000,
  red: 3_400,
  streak: 4_500,
};
/** A result older than this (since its entry showed) is not announced: the gale makes it ~2 rounds. */
const RESULT_FRESH_MS = 120_000;

const sideName = (side?: Side) => (side === "player" ? "Azul (Player)" : "Vermelho (Banker)");

function noteContent(n: Note) {
  switch (n.kind) {
    case "green":
      return {
        emoji: [checkEmoji, moneyBagEmoji],
        title: "GREEN DE PRIMEIRA",
        tone: "text-success",
        body: `Entrada no ${sideName(n.side)} bateu`,
      };
    case "green_tie":
      return {
        emoji: [checkEmoji, moneyBagEmoji],
        title: "GREEN NO EMPATE",
        tone: "text-tie-glow",
        body: "Empate protegido, entrada paga",
      };
    case "green_gale":
      return {
        emoji: [fireEmoji, moneyWingsEmoji],
        title: "GREEN NO GALE",
        tone: "text-success",
        body: `O gale no ${sideName(n.side)} bateu`,
      };
    case "gale":
      return {
        emoji: [warningEmoji],
        title: "FAÇA O GALE 1",
        tone: "text-tie-glow",
        body: `Não bateu de primeira. Entre de novo no ${sideName(n.side)}`,
      };
    case "red":
      return {
        emoji: [crossEmoji],
        title: "RED",
        tone: "text-destructive",
        body: `Entrada e gale no ${sideName(n.side)} não bateram`,
      };
    case "streak":
      return {
        emoji: [partyEmoji],
        title: "5 GREENS SEGUIDOS",
        tone: "text-success",
        body: "Surra no branco, dinheiro no bolso",
      };
  }
}

export function ResultBanner() {
  const { sessionSignals, rounds } = useRobot();
  const results = useSessionResults();
  const gales = useMemo(() => pendingGales(sessionSignals, rounds), [sessionSignals, rounds]);
  const seen = useRef<Set<string> | null>(null);
  const [queue, setQueue] = useState<Note[]>([]);

  useEffect(() => {
    const ids = [...results.map((r) => `r:${r.key}`), ...gales.map((g) => `g:${g.key}`)];
    if (!seen.current) {
      seen.current = new Set(ids);
      return;
    }
    const known = seen.current;
    const add: Note[] = [];
    for (const g of gales) {
      const id = `g:${g.key}`;
      if (known.has(id)) continue;
      known.add(id);
      add.push({ id, kind: "gale", side: g.side });
    }
    const freshResults = results.filter((r) => !known.has(`r:${r.key}`));
    for (const r of freshResults) {
      known.add(`r:${r.key}`);
      if (Date.now() - r.at > RESULT_FRESH_MS) continue;
      const kind: NoteKind = !r.green
        ? "red"
        : r.gale
          ? "green_gale"
          : r.tie
            ? "green_tie"
            : "green";
      add.push({ id: `r:${r.key}`, kind, side: r.side });
    }
    const last5 = results.slice(-5);
    if (freshResults.length && last5.length === 5 && last5.every((r) => r.green)) {
      add.push({ id: `s:${results.at(-1)!.key}`, kind: "streak" });
    }
    if (add.length) setQueue((q) => [...q, ...add].slice(-4));
  }, [results, gales]);

  const current = queue[0] ?? null;
  const currentId = current?.id;
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), NOTE_MS[current.kind]);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-2 z-50 flex justify-center px-4"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <AnimatePresence mode="wait">
        {current && <NoteCard key={current.id} note={current} />}
      </AnimatePresence>
    </div>
  );
}

export function NoteCard({ note }: { note: Note }) {
  const c = noteContent(note);
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: -36, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -24, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={cn(
        "liquid-glass flex items-center gap-3 overflow-hidden rounded-[1.4rem] px-3.5 py-3",
        note.kind === "gale" && "ring-1 ring-tie/40",
        note.kind === "red" && "ring-1 ring-destructive/40",
        (note.kind === "green" || note.kind === "green_gale") && "ring-1 ring-success/40",
      )}
      style={{ width: "min(380px, 94vw)" }}
    >
      <div className="glass-icon relative h-12 w-12 shrink-0">
        <motion.div
          initial={{ scale: 0.4, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.05 }}
        >
          <Emoji3D src={c.emoji[0]!} size={34} />
        </motion.div>
        {c.emoji[1] && (
          <Emoji3D src={c.emoji[1]} size={20} className="absolute -bottom-1 -right-1" />
        )}
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className={cn("font-display text-[15px] font-extrabold tracking-wide", c.tone)}>
          {c.title}
        </p>
        <p className="mt-0.5 text-xs font-bold text-foreground/85">{c.body}</p>
      </div>
      {note.side && (
        <span
          className={cn(
            "h-6 w-6 shrink-0 rounded-full",
            note.side === "player" ? "ball-player" : "ball-banker",
          )}
        />
      )}
    </motion.div>
  );
}
