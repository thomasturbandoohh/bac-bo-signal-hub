/**
 * Shared robot timeline driven by the real Bac Bo Live table.
 * Signals reveal after a short analysis window. Each entry has at most 1 gale: if the entry
 * round is lost, the robot repeats the same side once (the gale) before reading a new pattern.
 * When no pattern is confirmed, it analyzes at most MAX_ANALYSIS_ROUNDS rounds, then enters anyway.
 */
import {
  analyze,
  fallbackSignal,
  isGreen,
  type Analysis,
  type Round,
  type Side,
  type Signal,
} from "./bacbo-engine";
import type { LiveRound } from "./live-table";

/** Typical time between two results at the Bac Bo Live table (measured ~33-38s). */
export const ROUND_MS = 35_000;
/** How long to wait after a round settles before revealing the signal (natural analysis window). */
export const ANALYSIS_MS = 8_000;
/** A gale repeats the side already chosen, so it shows almost right away. */
export const GALE_REVEAL_MS = 1_500;
/** Estimated moment, after a round settles, when bets for the next round close. */
export const BET_CLOSE_MS = 24_000;
/** A round reaching us later than this after settling leaves too little time to bet: no signal. */
export const LATE_MS = 17_000;
/** No new round for this long: the table is treated as quiet and the robot waits. */
export const STALE_MS = 120_000;
const HISTORY = 60;
/** Past real rounds the robot needs before it reads a pattern. */
export const MIN_HISTORY = 5;
/** Rounds the robot may spend analyzing without a pattern; on the next one it enters anyway. */
export const MAX_ANALYSIS_ROUNDS = 2;
/** Max signals kept for scoreboard / streaks (was 20; longer sequences no longer get truncated). */
export const SIGNAL_HISTORY_LIMIT = 100;

export function liveWindow(rounds: LiveRound[], now: number): LiveRound[] {
  const last = rounds[rounds.length - 1];
  if (!last || now - last.settledAt > STALE_MS) return [];
  let start = rounds.length - 1;
  while (start > 0 && rounds[start]!.settledAt - rounds[start - 1]!.settledAt <= STALE_MS) start--;
  return start === 0 ? rounds : rounds.slice(start);
}

/** When the signal after this round shows: after the analysis window (a gale shows sooner). */
export const revealTime = (r: LiveRound, gale = false) =>
  r.settledAt + (gale ? GALE_REVEAL_MS : ANALYSIS_MS);
export const arrivedLate = (r: LiveRound) =>
  r.receivedAt !== undefined && r.receivedAt - r.settledAt > LATE_MS;

export const AUTO_CONFIDENCE = 60;

export interface ScheduleConfig {
  startedAt: number;
  minConfidence: number;
}

export type RobotPhase = "off" | "analyzing" | "signal" | "paused";
export type WaitReason =
  | "no_connection"
  | "collecting"
  | "next_round"
  | "no_pattern"
  | "weak_pattern"
  | "conflict"
  | "cold_table"
  | "result"
  | "paused"
  | null;

export interface RobotView {
  phase: RobotPhase;
  key: string;
  phaseStart: number;
  phaseEnd: number;
  wakeAt: number;
  waiting: boolean;
  reason: WaitReason;
  signal: Signal | null;
  /** The current signal is the gale (second and last attempt) of the previous entry. */
  gale: boolean;
  history: Round[];
  lastRound: LiveRound | null;
}

const analysisCache = new Map<string, Analysis | null>();

/** The robot's pattern reading after round `index` (signal, or why it held back). Cached per round. */
export function analysisAfter(
  rounds: LiveRound[],
  index: number,
  minConfidence: number,
): Analysis | null {
  const round = rounds[index];
  if (!round || index + 1 < MIN_HISTORY) return null;
  const key = `${round.id}:${minConfidence}`;
  if (analysisCache.has(key)) return analysisCache.get(key)!;
  const history = rounds.slice(Math.max(0, index + 1 - HISTORY), index + 1);
  const result = analyze(history, minConfidence);
  if (analysisCache.size > 500) analysisCache.clear();
  analysisCache.set(key, result);
  return result;
}

/** What the robot does after a round: a new entry, the gale of the last entry, or nothing. */
export type Decision =
  | { kind: "entry"; signal: Signal; forced: boolean }
  | { kind: "gale"; signal: Signal; late: boolean }
  | { kind: "skip"; reason: WaitReason; counts: boolean };

const decisionCache = new Map<string, Decision>();

/**
 * Deterministic decision after round `index`, the same on every device:
 * 1. the previous round had an entry and this round lost it → gale on the same side (only 1);
 * 2. otherwise a confirmed pattern → entry;
 * 3. otherwise, after MAX_ANALYSIS_ROUNDS rounds analyzed with nothing → forced entry.
 */
export function decisionAfter(rounds: LiveRound[], index: number, cfg: ScheduleConfig): Decision {
  const round = rounds[index];
  if (!round || round.settledAt < cfg.startedAt) {
    return { kind: "skip", reason: "next_round", counts: false };
  }
  if (index + 1 < MIN_HISTORY) return { kind: "skip", reason: "collecting", counts: false };
  const key = `${round.id}:${arrivedLate(round) ? 1 : 0}:${cfg.startedAt}:${cfg.minConfidence}`;
  const cached = decisionCache.get(key);
  if (cached) return cached;

  const prev = index > 0 ? decisionAfter(rounds, index - 1, cfg) : null;
  let decision: Decision;
  if (prev?.kind === "entry" && !isGreen(prev.signal.side, round.outcome)) {
    decision = { kind: "gale", signal: prev.signal, late: arrivedLate(round) };
  } else if (arrivedLate(round)) {
    decision = { kind: "skip", reason: "next_round", counts: true };
  } else {
    const analysis = analysisAfter(rounds, index, cfg.minConfidence);
    if (analysis?.signal) {
      decision = { kind: "entry", signal: analysis.signal, forced: false };
    } else {
      let analyzed = 0;
      for (let j = index - 1; j >= 0 && analyzed < MAX_ANALYSIS_ROUNDS; j--) {
        const d = decisionAfter(rounds, j, cfg);
        if (d.kind !== "skip" || !d.counts) break;
        analyzed++;
      }
      if (analyzed >= MAX_ANALYSIS_ROUNDS) {
        const history = rounds.slice(Math.max(0, index + 1 - HISTORY), index + 1);
        decision = { kind: "entry", signal: fallbackSignal(history), forced: true };
      } else {
        decision = { kind: "skip", reason: analysis?.reason ?? "no_pattern", counts: true };
      }
    }
  }
  if (decisionCache.size > 1000) decisionCache.clear();
  decisionCache.set(key, decision);
  return decision;
}

/** The new entry (not a gale) the robot sends after round `index`, if any. */
export function entryAfter(rounds: LiveRound[], index: number, cfg: ScheduleConfig): Signal | null {
  const d = decisionAfter(rounds, index, cfg);
  return d.kind === "entry" ? d.signal : null;
}

export function robotView(cfg: ScheduleConfig | null, rounds: LiveRound[], now: number): RobotView {
  const lastRound = rounds[rounds.length - 1] ?? null;
  const base = { history: rounds as Round[], lastRound, signal: null, gale: false };
  if (!cfg) {
    return {
      ...base,
      phase: "off",
      key: "off",
      phaseStart: now,
      phaseEnd: Infinity,
      wakeAt: Infinity,
      waiting: false,
      reason: null,
    };
  }

  const waitFor = (from: number, key: string, reason: WaitReason): RobotView => ({
    ...base,
    phase: "analyzing",
    key,
    phaseStart: from,
    phaseEnd: Math.max(from + 1_000, from + ROUND_MS),
    wakeAt: Infinity,
    waiting: true,
    reason,
  });

  if (!lastRound || now - lastRound.settledAt > STALE_MS) {
    return waitFor(
      Math.max(cfg.startedAt, lastRound?.settledAt ?? 0),
      "no_connection",
      "no_connection",
    );
  }
  if (lastRound.settledAt < cfg.startedAt) {
    const reason = rounds.length < MIN_HISTORY ? "collecting" : "next_round";
    return waitFor(lastRound.settledAt, `wait:${cfg.startedAt}`, reason);
  }

  const i = rounds.length - 1;
  const settled = lastRound.settledAt;
  const decision = decisionAfter(rounds, i, cfg);
  const gale = decision.kind === "gale";
  const shown =
    decision.kind === "entry" || (decision.kind === "gale" && !decision.late)
      ? decision.signal
      : null;
  const revealAt = revealTime(lastRound, gale);
  const closeAt = settled + BET_CLOSE_MS;
  const history = rounds.slice(Math.max(0, i + 1 - HISTORY));
  const common = { history, lastRound, key: gale ? `${lastRound.id}:g1` : lastRound.id, gale };

  if (shown && now >= revealAt) {
    if (now >= closeAt) {
      return {
        ...common,
        phase: "analyzing",
        phaseStart: closeAt,
        phaseEnd: settled + ROUND_MS,
        wakeAt: Infinity,
        waiting: true,
        reason: "result",
        signal: shown,
      };
    }
    return {
      ...common,
      phase: "signal",
      phaseStart: revealAt,
      phaseEnd: Math.max(revealAt + 1_000, closeAt),
      wakeAt: closeAt,
      waiting: false,
      reason: null,
      signal: shown,
    };
  }
  if (shown) {
    return {
      ...common,
      phase: "analyzing",
      phaseStart: settled,
      phaseEnd: revealAt,
      wakeAt: revealAt,
      waiting: false,
      reason: null,
      signal: null,
    };
  }
  return {
    ...common,
    gale: false,
    phase: "analyzing",
    phaseStart: settled,
    phaseEnd: settled + ROUND_MS,
    wakeAt: settled + STALE_MS,
    waiting: true,
    reason: decision.kind === "skip" ? decision.reason : "next_round",
    signal: null,
  };
}

export interface SessionSignal {
  key: string;
  side: Side;
  at: number;
}

/** New entries (gales are judged as part of their entry) revealed between `from` and `to`. */
export function signalsBetween(
  cfg: ScheduleConfig,
  rounds: LiveRound[],
  from: number,
  to: number,
  limit = SIGNAL_HISTORY_LIMIT,
): SessionSignal[] {
  const out: SessionSignal[] = [];
  for (let i = rounds.length - 1; i >= 0 && out.length < limit; i--) {
    const r = rounds[i]!;
    if (r.settledAt < cfg.startedAt) break;
    const at = revealTime(r);
    if (at > to) continue;
    if (r.settledAt + ANALYSIS_MS < from) break;
    if (at < from) continue;
    const signal = entryAfter(rounds, i, cfg);
    if (signal) out.push({ key: r.id, side: signal.side, at });
  }
  return out;
}

export function mergeSignals(
  existing: SessionSignal[],
  incoming: SessionSignal[],
  limit = SIGNAL_HISTORY_LIMIT,
): SessionSignal[] {
  const map = new Map<string, SessionSignal>();
  for (const s of [...existing, ...incoming]) map.set(s.key, s);
  return [...map.values()].sort((a, b) => b.at - a.at).slice(0, limit);
}
