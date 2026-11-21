import { isGreen, type Side } from "./bacbo-engine";
import type { LiveRound } from "./live-table";
import type { SessionSignal } from "./robot-schedule";

export interface SignalResult {
  key: string;
  side: Side;
  /** Green on the entry round, or on the single gale right after it. A tie counts as green. */
  green: boolean;
  /** The green came on the gale (second attempt). */
  gale: boolean;
  tie: boolean;
  at: number;
}

/**
 * Real results with 1 gale: each entry (keyed by the round it was read after) is judged by the
 * next real round; if that loses, by the round after it (the gale). Pending entries are skipped.
 */
export function scoreSignals(signals: SessionSignal[], rounds: LiveRound[]): SignalResult[] {
  const index = new Map(rounds.map((r, i) => [r.id, i]));
  const out: SignalResult[] = [];
  for (const s of signals) {
    const i = index.get(s.key);
    if (i === undefined) continue;
    const first = rounds[i + 1];
    if (!first) continue;
    if (isGreen(s.side, first.outcome)) {
      out.push({
        key: s.key,
        side: s.side,
        green: true,
        gale: false,
        tie: first.outcome === "T",
        at: s.at,
      });
      continue;
    }
    const second = rounds[i + 2];
    if (!second) continue;
    const green = isGreen(s.side, second.outcome);
    out.push({
      key: s.key,
      side: s.side,
      green,
      gale: green,
      tie: green && second.outcome === "T",
      at: s.at,
    });
  }
  return out.sort((a, b) => a.at - b.at);
}

/** Entries whose first round lost and whose gale round has not come yet: "do the gale now". */
export function pendingGales(signals: SessionSignal[], rounds: LiveRound[]): SessionSignal[] {
  const index = new Map(rounds.map((r, i) => [r.id, i]));
  return signals.filter((s) => {
    const i = index.get(s.key);
    if (i === undefined) return false;
    const first = rounds[i + 1];
    return !!first && !isGreen(s.side, first.outcome) && !rounds[i + 2];
  });
}

export function summarize(results: SignalResult[]) {
  let greens = 0,
    best = 0,
    run = 0;
  for (const r of results) {
    if (r.green) {
      greens++;
      run++;
      best = Math.max(best, run);
    } else run = 0;
  }
  const total = results.length;
  return {
    greens,
    reds: total - greens,
    total,
    best,
    rate: total ? Math.round((greens / total) * 100) : 0,
  };
}
