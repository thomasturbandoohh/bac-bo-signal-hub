import { summarizeRoundFrequencies } from "./round-statistics";

/**
 * Bac Bo pattern engine — expanded classic strategy set.
 * Only entry + 1 gale. No G2. Never a forced entry: only strict confluence (see `analyze`).
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
/** The robot's own last readings that, if all red, mark the table as cold. */
export const COLD_STREAK = 2;

export interface PatternRecord {
  n: number;
  hits: number;
}

/* ------------------------------------------------------------------ */
/* Table cycle: trend (surf) vs. alternation (xadrez / picotada)        */
/* ------------------------------------------------------------------ */

export type TableCycle = "trend" | "chop" | "mixed";
/** Recent non-tie rounds read to tell a trending table from a choppy one. */
export const CYCLE_WINDOW = 12;
/** Share of side switches at or above which the table is choppy (picotada). */
export const CHOP_SWITCH_RATE = 0.65;
/** Share of side switches at or below which the table is trending (surf). */
export const TREND_SWITCH_RATE = 0.35;

export interface CycleReading {
  cycle: TableCycle;
  /** Fraction of consecutive rounds that changed side (0 = one long run, 1 = perfect alternation). */
  switchRate: number;
  /** Average run length in the window. */
  avgRun: number;
}

export function tableCycle(outcomes: Outcome[]): CycleReading {
  const seq = outcomes.filter((o) => o !== "T").slice(-CYCLE_WINDOW);
  if (seq.length < 4) return { cycle: "mixed", switchRate: 0.5, avgRun: 2 };
  let switches = 0;
  for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) switches++;
  const switchRate = switches / (seq.length - 1);
  const avgRun = seq.length / (switches + 1);
  const cycle: TableCycle =
    switchRate >= CHOP_SWITCH_RATE ? "chop" : switchRate <= TREND_SWITCH_RATE ? "trend" : "mixed";
  return { cycle, switchRate, avgRun };
}

/** Patterns that follow a trend (bad on a choppy table). */
export const TREND_PATTERNS = new Set(["Surf de tendência", "Rampa"]);
/** Patterns that bet on alternation (bad on a trending table). */
export const CHOP_PATTERNS = new Set(["Xadrez 1-1-1", "Perninhas"]);

/** -1 = pattern goes against the table cycle (blocked), 1 = fits it, 0 = neutral. */
export function cycleFit(pattern: string, cycle: TableCycle): -1 | 0 | 1 {
  if (TREND_PATTERNS.has(pattern)) return cycle === "chop" ? -1 : cycle === "trend" ? 1 : 0;
  if (CHOP_PATTERNS.has(pattern)) return cycle === "trend" ? -1 : cycle === "chop" ? 1 : 0;
  return 0;
}

export const CYCLE_LABEL: Record<TableCycle, string> = {
  trend: "tendência (surf)",
  chop: "alternância (picotada)",
  mixed: "mista",
};

/* ------------------------------------------------------------------ */
/* Tie reading from the point margin of the 4 dice                      */
/* ------------------------------------------------------------------ */

/** Exact chance that the two dice sums differ by 0 or 1 point: 426 of 1296 throws. */
export const P_CLOSE = 426 / 1296;
/** Rounds whose dice margins are read. */
export const TIE_WINDOW = 12;
/** Rounds whose ties are counted (blended with the exact odds). */
const TIE_COUNT_WINDOW = 20;
/** Tie chance from which the robot asks for reinforced tie protection. */
export const TIE_REINFORCE = 0.14;

export interface TieReading {
  /** Estimated tie chance for the next round, 0-100. */
  probability: number;
  /** Average point difference between Player and Banker dice in the recent rounds. */
  avgMargin: number;
  /** Share of recent rounds decided by 0 or 1 point. */
  closeRate: number;
  /** The tie chance is clearly above the normal 11%: reinforce the tie protection. */
  reinforced: boolean;
}

const diceSum = (d: [number, number]) => d[0] + d[1];

export function tieReading(history: Round[]): TieReading {
  const recent = history.slice(-TIE_WINDOW);
  if (!recent.length) {
    return { probability: Math.round(P_TIE * 100), avgMargin: 0, closeRate: 0, reinforced: false };
  }
  const margins = recent.map((r) => Math.abs(diceSum(r.p) - diceSum(r.b)));
  const avgMargin = Math.round((margins.reduce((a, m) => a + m, 0) / margins.length) * 10) / 10;
  const closeRate = margins.filter((m) => m <= 1).length / margins.length;
  const counted = history.slice(-TIE_COUNT_WINDOW);
  const ties = counted.filter((r) => r.outcome === "T").length;
  const tieRate = (ties + TIE_COUNT_WINDOW * P_TIE) / (counted.length + TIE_COUNT_WINDOW);
  const p = Math.max(0.06, Math.min(0.25, tieRate * (0.7 + 0.3 * (closeRate / P_CLOSE))));
  return {
    probability: Math.round(p * 100),
    avgMargin,
    closeRate,
    reinforced: p >= TIE_REINFORCE,
  };
}

/* ------------------------------------------------------------------ */
/* Signal                                                              */
/* ------------------------------------------------------------------ */

/** Minimum calculated confluence confidence (0-100) for an entry. Below it: no entry. */
export const STRICT_CONFIDENCE = 75;

export interface Signal extends PatternMatch {
  /** Reinforce the tie protection on this entry. */
  tieAlert: boolean;
  tie: TieReading;
  cycle: TableCycle;
  /** Estimated chance (0-100) that the entry is green, from the table odds and the pattern's record here. */
  probability: number;
  record: PatternRecord;
  /** Other patterns that point to the same side. */
  agree: string[];
  /** Short explanation lines shown with the signal. */
  reasons: string[];
}

export type SkipReason =
  | "no_pattern"
  | "weak_pattern"
  | "conflict"
  | "cold_table"
  | "choppy_table"
  | "trending_table"
  | "low_confidence";

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

/**
 * Confluence confidence (0-95): the pattern's own strength, plus agreeing patterns (+4 each, max +8),
 * plus its hit rate at this table versus the odds (±10, once it has 4+ samples),
 * plus 4 when the pattern fits the table cycle.
 */
export function confluenceConfidence(
  base: number,
  agreeing: number,
  record: PatternRecord,
  fit: -1 | 0 | 1,
): number {
  let c = base + Math.min(8, agreeing * 4);
  if (record.n >= MIN_PATTERN_SAMPLES) {
    c += Math.max(-10, Math.min(10, Math.round((record.hits / record.n - BASE_GREEN) * 40)));
  }
  if (fit === 1) c += 4;
  return Math.max(0, Math.min(95, c));
}

const pct = (x: number) => Math.round(x * 100);

export function analyze(history: Round[], minConfidence: number): Analysis {
  const outcomes = history.map((r) => r.outcome);
  const matches = matchPatterns(outcomes).filter((m) => m.confidence >= minConfidence);
  if (!matches.length) return { signal: null, reason: "no_pattern" };

  const { cycle } = tableCycle(outcomes);
  const fitting = matches.filter((m) => cycleFit(m.pattern, cycle) !== -1);
  if (!fitting.length) {
    return { signal: null, reason: cycle === "chop" ? "choppy_table" : "trending_table" };
  }

  const { records, picks } = backtest(outcomes, minConfidence);
  const recent = picks.slice(-COLD_STREAK);
  if (recent.length === COLD_STREAK && recent.every((g) => !g)) {
    return { signal: null, reason: "cold_table" };
  }

  const scored = fitting
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
  // Strict confluence: any valid pattern pointing the other way means no entry.
  if (p && b) return { signal: null, reason: "conflict" };
  const pick = (p ?? b)!;

  const { record } = pick;
  const confidence = confluenceConfidence(
    pick.m.confidence,
    pick.agree.length,
    record,
    cycleFit(pick.m.pattern, cycle),
  );
  if (confidence < STRICT_CONFIDENCE || pick.score < BASE_GREEN) {
    return { signal: null, reason: "low_confidence" };
  }

  const tie = tieReading(history);
  const probability = Math.max(50, Math.min(85, pct(pick.score)));
  const reasons = [
    PATTERN_EXPLANATION[pick.m.pattern] ?? pick.m.pattern,
    record.n
      ? `Nesta mesa acertou ${record.hits} de ${record.n} (${pct(record.hits / record.n)}%) nas últimas ${BACKTEST_ROUNDS} rodadas`
      : `Padrão novo nesta mesa · base matemática de ${pct(BASE_GREEN)}% com empate coberto`,
    `Confluência ${confidence}% · mesa em ${CYCLE_LABEL[cycle]}`,
  ];
  if (pick.agree.length) reasons.push(`Confirmado por: ${pick.agree.join(", ")}`);
  reasons.push(
    `Empate ${tie.probability}% (margem média dos dados ${tie.avgMargin} pts)${tie.reinforced ? " · proteção reforçada" : ""}`,
  );

  return {
    signal: {
      ...pick.m,
      confidence,
      tieAlert: tie.reinforced,
      tie,
      cycle,
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
