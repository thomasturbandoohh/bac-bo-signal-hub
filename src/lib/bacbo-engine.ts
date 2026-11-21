import { summarizeRoundFrequencies } from "./round-statistics";

/**
 * Bac Bo pattern engine — expanded classic strategy set.
 * Only entry + 1 gale. No G2.
 * Every candidate pattern is checked against the table odds and its own recent record here
 * (see `analyze`), so the robot holds back on weak, conflicting or cold readings.
 */

export type Outcome = "P" | "B" | "T";
export type Side = "player" | "banker";
export type SignalResult = "green_g0" | "green_g1" | "red";

export interface Round {
  p: [number, number];
  b: [number, number];
  outcome: Outcome;
}

export interface Run {
  side: "P" | "B";
  len: number;
}

export interface PatternMatch {
  side: Side;
  pattern: string;
  confidence: number;
}

const die = (rng: () => number) => 1 + Math.floor(rng() * 6);

export function rollRound(rng: () => number = Math.random): Round {
  const p: [number, number] = [die(rng), die(rng)];
  const b: [number, number] = [die(rng), die(rng)];
  const ps = p[0] + p[1];
  const bs = b[0] + b[1];
  return { p, b, outcome: ps > bs ? "P" : bs > ps ? "B" : "T" };
}

export function seedHistory(n = 40, rng: () => number = Math.random): Round[] {
  return Array.from({ length: n }, () => rollRound(rng));
}

const toSide = (o: "P" | "B"): Side => (o === "P" ? "player" : "banker");
const opposite = (o: "P" | "B"): "P" | "B" => (o === "P" ? "B" : "P");

export function toRuns(outcomes: Outcome[]): Run[] {
  const runs: Run[] = [];
  for (const o of outcomes) {
    if (o === "T") continue;
    const last = runs[runs.length - 1];
    if (last && last.side === o) last.len += 1;
    else runs.push({ side: o, len: 1 });
  }
  return runs;
}

export function matchPatterns(outcomes: Outcome[]): PatternMatch[] {
  const runs = toRuns(outcomes);
  const n = runs.length;
  const matches: PatternMatch[] = [];
  if (n === 0) return matches;
  const cur = runs[n - 1]!;
  const at = (i: number) => runs[n - 1 - i]!;

  if (cur.len >= 3) {
    matches.push({
      side: toSide(cur.side),
      pattern: "Surf de tendência",
      confidence: Math.min(90, 64 + (cur.len - 3) * 5),
    });
  }

  let singles = 0;
  for (let i = 0; i < n && at(i).len === 1; i++) singles++;
  if (singles >= 4) {
    matches.push({
      side: toSide(opposite(cur.side)),
      pattern: "Xadrez 1-1-1",
      confidence: Math.min(88, 66 + (singles - 4) * 4),
    });
  }

  if (n >= 3 && at(1).len === 2 && at(2).len === 2) {
    if (cur.len === 1) {
      matches.push({ side: toSide(cur.side), pattern: "Parzinho 2-2", confidence: 74 });
    } else if (cur.len === 2) {
      matches.push({ side: toSide(opposite(cur.side)), pattern: "Parzinho 2-2", confidence: 72 });
    }
  }

  if (n >= 4 && at(1).len === 1 && at(2).len === 2 && at(3).len === 2) {
    matches.push({ side: toSide(cur.side), pattern: "Parzinho 2-1-2", confidence: 71 });
  }

  if (n >= 3 && at(2).len === 3 && at(1).len === 1 && cur.side === at(2).side && cur.len < 3) {
    matches.push({
      side: toSide(cur.side),
      pattern: "3-1-3",
      confidence: cur.len === 2 ? 80 : 76,
    });
  }

  if (n >= 3 && at(2).len === 3 && at(1).len === 2 && cur.side === at(2).side && cur.len < 3) {
    matches.push({
      side: toSide(cur.side),
      pattern: "3-2-3",
      confidence: cur.len === 2 ? 78 : 74,
    });
  }

  if (n >= 4) {
    const a = at(3).len;
    if (at(2).len === a + 1 && at(1).len === a + 2 && cur.len < a + 3) {
      matches.push({ side: toSide(cur.side), pattern: "Rampa", confidence: 73 });
    }
  }

  if (n >= 4 && at(0).len <= 2 && at(1).len <= 2 && at(2).len <= 2 && at(3).len <= 2) {
    const alternating = at(0).side !== at(1).side && at(1).side !== at(2).side;
    if (alternating) {
      matches.push({
        side: toSide(opposite(cur.side)),
        pattern: "Perninhas",
        confidence: 68,
      });
    }
  }

  if (n >= 6) {
    const recent = runs.slice(-6);
    const firstHalf = recent
      .slice(0, 3)
      .map((r) => r.side + r.len)
      .join("");
    const secondHalf = recent
      .slice(3)
      .map((r) => r.side + r.len)
      .join("");
    if (firstHalf === secondHalf) {
      matches.push({
        side: toSide(cur.side),
        pattern: "Espelho",
        confidence: 75,
      });
    }
  }

  if (n >= 2 && at(1).len >= 4 && cur.len === 1) {
    matches.push({
      side: toSide(cur.side),
      pattern: "Inversão",
      confidence: 69,
    });
  }

  return matches.sort((x, y) => y.confidence - x.confidence);
}

export const PATTERN_EXPLANATION: Record<string, string> = {
  "Surf de tendência": "Surf: 3 ou mais vitórias seguidas do mesmo lado — seguir a tendência",
  "Xadrez 1-1-1": "Xadrez 1-1-1: alternância perfeita de lados há 4+ rodadas — quebrar",
  "Parzinho 2-2": "Parzinho 2-2: pares de 2 seguidos",
  "Parzinho 2-1-2": "Parzinho 2-1-2: estrutura de pares com um isolado",
  "3-1-3": "3-1-3: bloco de 3, um oposto e completando o próximo",
  "3-2-3": "3-2-3: bloco de 3, dois opostos e completando",
  Rampa: "Rampa: sequências crescentes de comprimento — continuar subindo",
  Perninhas: "Perninhas: sequências curtas alternadas — quebrar o ritmo",
  Espelho: "Espelho: o padrão recente está a repetir-se",
  Inversão: "Inversão: sequência longa quebrada — seguir o novo lado",
};

export const TREND_WINDOW = 8;

export function tieAlert(outcomes: Outcome[]): boolean {
  const lastTie = outcomes.lastIndexOf("T");
  const since = lastTie === -1 ? outcomes.length : outcomes.length - 1 - lastTie;
  return since >= 12 || since <= 2;
}

/* ------------------------------------------------------------------ */
/* Math of the table                                                   */
/* ------------------------------------------------------------------ */

/** Exact Bac Bo odds with two fair dice per side: 146 of the 1296 throws are a tie. */
export const P_TIE = 146 / 1296;
/** Chance that Player (or Banker) wins one round. */
export const P_SIDE = (1 - P_TIE) / 2;
/** Chance that one entry is green when the tie is covered (side wins or tie) ≈ 55.6%. */
export const BASE_GREEN = P_SIDE + P_TIE;

/** How many past rounds each pattern is replayed over to measure how it is doing at this table. */
export const BACKTEST_ROUNDS = 40;
/** Weight of the table's base odds in the estimate (like 6 imaginary past entries). */
const PRIOR_WEIGHT = 6;
/** A pattern that has been tried 4+ times here and hits less than this is ignored. */
export const MIN_PATTERN_RATE = 0.45;
const MIN_PATTERN_SAMPLES = 4;
/** Player and Banker readings closer than this are a conflict: no entry. */
export const CONFLICT_MARGIN = 0.03;
/** The robot's own last readings that, if all red, mark the table as cold. */
export const COLD_STREAK = 2;

export interface PatternRecord {
  n: number;
  hits: number;
}

export interface Signal extends PatternMatch {
  tieAlert: boolean;
  /** Estimated chance (0-100) that the entry is green, from the table odds and the pattern's record here. */
  probability: number;
  record: PatternRecord;
  /** Other patterns that point to the same side. */
  agree: string[];
  /** Short explanation lines shown with the signal. */
  reasons: string[];
}

export type SkipReason = "no_pattern" | "weak_pattern" | "conflict" | "cold_table";

export interface Analysis {
  signal: Signal | null;
  reason: SkipReason | null;
}

export const isGreen = (side: Side, outcome: Outcome) =>
  outcome === "T" || toSide(outcome) === side;

/**
 * Replays the engine over the recent rounds: for every past round, which patterns were formed
 * just before it and whether their side (or a tie) came. Also returns the robot's top reading per round.
 */
export function backtest(outcomes: Outcome[], minConfidence: number, rounds = BACKTEST_ROUNDS) {
  const records = new Map<string, PatternRecord>();
  const picks: boolean[] = [];
  for (let j = Math.max(4, outcomes.length - rounds); j < outcomes.length; j++) {
    const ms = matchPatterns(outcomes.slice(0, j)).filter((m) => m.confidence >= minConfidence);
    if (!ms.length) continue;
    const next = outcomes[j]!;
    for (const m of ms) {
      const rec = records.get(m.pattern) ?? { n: 0, hits: 0 };
      rec.n += 1;
      if (isGreen(m.side, next)) rec.hits += 1;
      records.set(m.pattern, rec);
    }
    picks.push(isGreen(ms[0]!.side, next));
  }
  return { records, picks };
}

/** Bayesian estimate of the green chance: the table odds, corrected by what the pattern did here. */
export function estimateGreen(rec: PatternRecord): number {
  return (rec.hits + PRIOR_WEIGHT * BASE_GREEN) / (rec.n + PRIOR_WEIGHT);
}

const pct = (x: number) => Math.round(x * 100);

export function analyze(history: Round[], minConfidence: number): Analysis {
  const outcomes = history.map((r) => r.outcome);
  const matches = matchPatterns(outcomes).filter((m) => m.confidence >= minConfidence);
  if (!matches.length) return { signal: null, reason: "no_pattern" };

  const { records, picks } = backtest(outcomes, minConfidence);
  const recent = picks.slice(-COLD_STREAK);
  if (recent.length === COLD_STREAK && recent.every((g) => !g)) {
    return { signal: null, reason: "cold_table" };
  }

  const scored = matches
    .map((m) => {
      const record = records.get(m.pattern) ?? { n: 0, hits: 0 };
      return { m, record, estimate: estimateGreen(record) };
    })
    .filter(
      ({ record }) => record.n < MIN_PATTERN_SAMPLES || record.hits / record.n >= MIN_PATTERN_RATE,
    );
  if (!scored.length) return { signal: null, reason: "weak_pattern" };

  // Each side's reading: its best pattern plus a small bonus for every other pattern agreeing.
  const sideScore = (side: Side) => {
    const own = scored.filter((x) => x.m.side === side).sort((a, b) => b.estimate - a.estimate);
    if (!own.length) return null;
    const best = own[0]!;
    const bonus = Math.min(0.03, (own.length - 1) * 0.01);
    return { ...best, score: best.estimate + bonus, agree: own.slice(1).map((x) => x.m.pattern) };
  };
  const p = sideScore("player");
  const b = sideScore("banker");
  if (p && b && Math.abs(p.score - b.score) < CONFLICT_MARGIN) {
    return { signal: null, reason: "conflict" };
  }
  const pick = !b || (p && p.score > b.score) ? p! : b;

  const probability = Math.max(50, Math.min(85, pct(pick.score)));
  const { record } = pick;
  const reasons = [
    PATTERN_EXPLANATION[pick.m.pattern] ?? pick.m.pattern,
    record.n
      ? `Nesta mesa acertou ${record.hits} de ${record.n} (${pct(record.hits / record.n)}%) nas últimas ${BACKTEST_ROUNDS} rodadas`
      : `Padrão novo nesta mesa · base matemática de ${pct(BASE_GREEN)}% com empate coberto`,
  ];
  if (pick.agree.length) reasons.push(`Confirmado por: ${pick.agree.join(", ")}`);
  if (p && b) reasons.push(`Lado oposto mais fraco (${pct((pick === p ? b : p).score)}%)`);

  return {
    signal: {
      ...pick.m,
      tieAlert: tieAlert(outcomes),
      probability,
      record,
      agree: pick.agree,
      reasons,
    },
    reason: null,
  };
}

export function detectSignal(history: Round[], minConfidence: number): Signal | null {
  return analyze(history, minConfidence).signal;
}

export function resolveAttempt(side: Side, outcome: Outcome): "win" | "tie" | "loss" {
  if (outcome === "T") return "tie";
  return toSide(outcome) === side ? "win" : "loss";
}

export function resultFor(attemptIndex: number, won: boolean): SignalResult {
  if (!won) return "red";
  return (["green_g0", "green_g1"] as const)[attemptIndex] ?? "red";
}

export function resolveSignal(
  side: Side,
  next: Outcome[],
): { result: SignalResult; tieHit: boolean; used: number } {
  // Only entry + 1 gale
  for (let i = 0; i < Math.min(2, next.length); i++) {
    const r = resolveAttempt(side, next[i]!);
    if (r !== "loss") return { result: resultFor(i, true), tieHit: r === "tie", used: i + 1 };
  }
  return { result: "red", tieHit: false, used: Math.min(2, next.length) };
}

export function distribution(history: Round[]) {
  const { player, banker, tie } = summarizeRoundFrequencies(history);
  return { player, banker, tie };
}

export interface DayStats {
  total: number;
  greens: number;
  accuracy: number;
  streak: number;
  g0: number;
  g1: number;
  reds: number;
}

export function computeStats(results: SignalResult[]): DayStats {
  const g0 = results.filter((r) => r === "green_g0").length;
  const g1 = results.filter((r) => r === "green_g1").length;
  const reds = results.filter((r) => r === "red").length;
  const greens = g0 + g1;
  let streak = 0;
  for (const r of results) {
    if (r === "red") break;
    streak++;
  }
  return {
    total: results.length,
    greens,
    accuracy: results.length ? Math.round((greens / results.length) * 100) : 0,
    streak,
    g0,
    g1,
    reds,
  };
}

export const RESULT_LABEL: Record<SignalResult, string> = {
  green_g0: "GREEN DIRETO",
  green_g1: "GREEN G1",
  red: "RED",
};

/**
 * Entry used when the robot has already analyzed the maximum rounds without a confirmed pattern:
 * the strongest pattern on the table, or else the side of the current run (follow the trend).
 */
export function fallbackSignal(history: Round[]): Signal {
  const outcomes = history.map((r) => r.outcome);
  const best = matchPatterns(outcomes)[0];
  const runs = toRuns(outcomes);
  const last = runs[runs.length - 1];
  const match: PatternMatch = best ?? {
    side: last ? toSide(last.side) : "player",
    pattern: "Tendência",
    confidence: 60,
  };
  return {
    ...match,
    tieAlert: tieAlert(outcomes),
    probability: pct(BASE_GREEN),
    record: { n: 0, hits: 0 },
    agree: [],
    reasons: [
      best
        ? (PATTERN_EXPLANATION[best.pattern] ?? best.pattern)
        : "Tendência: seguir o lado que venceu por último",
      "Entrada após o limite de análise · com proteção de 1 gale",
    ],
  };
}
