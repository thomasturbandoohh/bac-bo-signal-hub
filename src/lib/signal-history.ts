import type { Side } from "./bacbo-engine";
import type { SessionSignal } from "./robot-schedule";
import type { SignalResult } from "./scoreboard";

export interface HistoryEntry {
  key: string;
  side: Side;
  at: number;
  /** green = won on the entry, green_g1 = won on the single gale, red = entry and gale lost. */
  result: "green" | "green_g1" | "red" | "pending";
}

/** Every signal the robot sent in this run, newest first, with its result (or still pending). */
export function historyEntries(signals: SessionSignal[], results: SignalResult[]): HistoryEntry[] {
  const byKey = new Map<string, SignalResult>();
  for (let i = 0; i < results.length; i++) {
    const r = results[i]!;
    byKey.set(r.key, r);
  }
  return signals
    .map((s): HistoryEntry => {
      const r = byKey.get(s.key);
      const result = !r ? "pending" : !r.green ? "red" : r.gale ? "green_g1" : "green";
      return { key: s.key, side: s.side, at: s.at, result };
    })
    .sort((a, b) => b.at - a.at);
}
