import { memo, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRobot } from "@/lib/robot-context";
import type { Side } from "@/lib/bacbo-engine";
import { pendingGales, summarize } from "@/lib/scoreboard";
import { cn } from "@/lib/utils";
import checkEmoji from "@/assets/emoji/check_mark_button.webp";
import crossEmoji from "@/assets/emoji/cross_mark.webp";
import warningEmoji from "@/assets/emoji/warning.webp";
import fireEmoji from "@/assets/emoji/fire.webp";
import moneyBagEmoji from "@/assets/emoji/money_bag.webp";
import moneyWingsEmoji from "@/assets/emoji/money_with_wings.webp";
import partyEmoji from "@/assets/emoji/party_popper.webp";

/** Results of the robot's current run, scored once in the RobotProvider. */
export function useSessionResults() {
  return useRobot().results;
}

export const Emoji3D = memo(function Emoji3D({
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
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cn("select-none drop-shadow-lg", className)}
    />
  );
});

export const Scoreboard = memo(function Scoreboard() {
  const results = useSessionResults();
  const s = useMemo(() => summarize(results), [results]);
  const items = useMemo(
    () => [
      { label: "Greens", value: s.greens, tone: "text-success", emoji: checkEmoji },
      { label: "Reds", value: s.reds, tone: "text-destructive", emoji: crossEmoji },
      {
        label: "Acerto",
        value: s.total ? `${s.rate}%` : "—",
        tone: "text-foreground",
        emoji: moneyBagEmoji,
      },
      { label: "Sequência", value: s.best, tone: "text-tie-glow", emoji: fireEmoji },
    ],
    [s],
  );

  return (
    <div className="glass-premium grid grid-cols-4 rounded-xl px-1.5 py-2.5 sm:py-3">
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
          <span className="text-[0.625rem] font-bold uppercase tracking-wider text-muted-foreground sm:text-[0.6875rem]">
            {i.label}
          </span>
        </div>
      ))}
    </div>
  );
});

type NoteKind = "green" | "green_tie" | "green_gale" | "gale" | "red" | "streak" | "streak_up";
export interface Note {
  id: string;
  kind: NoteKind;
  side?: Side;
  /** Greens in a row, for the streak_up note (6, 7, 8...). */
  count?: number;
}

/** Result notifications stay fully on screen for 2s (plus the fade in); the gale call keeps its 7s. */
const NOTE_ENTER_S = 0.7;
const NOTE_EXIT_S = 0.6;
const noteMs = (kind: NoteKind) => (kind === "gale" ? 7_000 : 2_000 + NOTE_ENTER_S * 1000);

const NUM_WORDS = [
  "zero",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "catorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
  "vinte",
];
const numWord = (n: number) => NUM_WORDS[n] ?? String(n);
const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** A result older than this (since its entry showed) is not announced: the gale makes it ~2 rounds. */
const RESULT_FRESH_MS = 120_000;

const sideName = (side?: Side) => (side === "player" ? "PLAYER" : "BANKER");

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
    case "streak_up": {
      const word = numWord(n.count ?? 6);
      return {
        emoji: [partyEmoji, moneyBagEmoji],
        title: `${capitalize(word)} green seguidos`.toUpperCase(),
        tone: "text-success",
        body: `Estamos com uma sequência de ${word} green`,
      };
    }
  }
}

export function ResultBanner() {
  const { sessionSignals, historyRounds } = useRobot();
  const results = useSessionResults();
  const gales = useMemo(
    () => pendingGales(sessionSignals, historyRounds),
    [sessionSignals, historyRounds],
  );
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
    if (freshResults.length) {
      let run = 0;
      for (let i = results.length - 1; i >= 0 && results[i]!.green; i--) run++;
      if (run === 5) add.push({ id: `s:${results.at(-1)!.key}`, kind: "streak" });
      if (run >= 6)
        add.push({ id: `s${run}:${results.at(-1)!.key}`, kind: "streak_up", count: run });
    }
    if (add.length) setQueue((q) => [...q, ...add].slice(-4));
  }, [results, gales]);

  const current = queue[0] ?? null;
  const currentId = current?.id;
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), noteMs(current.kind));
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
      // Slides down while fading in, then fades out softly, lifting slightly as it goes.
      initial={{ opacity: 0, y: -28, scale: 0.97, filter: "blur(6px)" }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: { duration: NOTE_ENTER_S, ease: [0.22, 1, 0.36, 1] },
      }}
      exit={{
        opacity: 0,
        y: -14,
        scale: 0.98,
        filter: "blur(4px)",
        transition: { duration: NOTE_EXIT_S, ease: [0.4, 0, 0.2, 1] },
      }}
      className={cn(
        "liquid-glass flex items-center gap-3 overflow-hidden rounded-[1.4rem] px-3.5 py-3",
        note.kind === "gale" && "ring-1 ring-tie/40",
        note.kind === "red" && "ring-1 ring-destructive/40",
        (note.kind === "green" ||
          note.kind === "green_gale" ||
          note.kind === "streak" ||
          note.kind === "streak_up") &&
          "ring-1 ring-success/40",
      )}
      style={{ width: "min(24rem, 94vw)", willChange: "transform, opacity, filter" }}
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
        <p className={cn("font-display text-[0.9375rem] font-extrabold tracking-wide", c.tone)}>
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
