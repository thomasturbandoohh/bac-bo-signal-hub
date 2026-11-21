import { describe, expect, it } from "vitest";
import { pendingGales, scoreSignals, summarize } from "./scoreboard";
import type { LiveRound } from "./live-table";

const r = (id: string, outcome: "P" | "B" | "T"): LiveRound =>
  ({
    id,
    outcome,
    p: [1, 1],
    b: [1, 1],
    settledAt: 0,
    pScore: 2,
    bScore: 2,
    multiplier: null,
  }) as LiveRound;

describe("scoreboard", () => {
  const rounds = [r("1", "P"), r("2", "B"), r("3", "T"), r("4", "P")];
  it("judges a signal by the next real round", () => {
    const res = scoreSignals(
      [
        { key: "1", side: "banker", at: 1 },
        { key: "2", side: "banker", at: 2 },
      ],
      rounds,
    );
    expect(res.map((x) => [x.green, x.gale])).toEqual([
      [true, false],
      [true, false],
    ]);
  });
  it("a missed entry turns green when the single gale hits", () => {
    const res = scoreSignals([{ key: "1", side: "player", at: 1 }], rounds);
    expect(res[0]).toMatchObject({ green: true, gale: true, tie: true });
  });
  it("red only when both the entry and the gale miss", () => {
    const more = [r("1", "P"), r("2", "B"), r("3", "B"), r("4", "P")];
    expect(scoreSignals([{ key: "1", side: "player", at: 1 }], more)[0]).toMatchObject({
      green: false,
      gale: false,
    });
  });
  it("a missed entry waits for its gale before being scored", () => {
    const signals = [{ key: "3", side: "banker" as const, at: 3 }];
    expect(scoreSignals(signals, rounds)).toEqual([]);
    expect(pendingGales(signals, rounds).map((s) => s.key)).toEqual(["3"]);
  });
  it("tie counts as green", () => {
    expect(scoreSignals([{ key: "2", side: "player", at: 1 }], rounds)[0]!.green).toBe(true);
  });
  it("pending signal is not scored", () => {
    expect(scoreSignals([{ key: "4", side: "player", at: 1 }], rounds)).toEqual([]);
  });
  it("summarizes rate and best streak", () => {
    const s = summarize(
      [true, true, false, true].map((g, i) => ({
        key: `${i}`,
        side: "player",
        green: g,
        gale: false,
        tie: false,
        at: i,
      })),
    );
    expect(s).toMatchObject({ greens: 3, reds: 1, rate: 75, best: 2 });
  });
});
