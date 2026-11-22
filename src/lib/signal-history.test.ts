import { describe, expect, it } from "vitest";
import { historyEntries } from "./signal-history";
import type { SignalResult } from "./scoreboard";

const sig = (key: string, at: number) => ({ key, side: "player" as const, at });
const res = (key: string, green: boolean, gale: boolean): SignalResult => ({
  key,
  side: "player",
  green,
  gale,
  tie: false,
  at: 0,
});

describe("historyEntries", () => {
  it("labels a win on the entry as green", () => {
    expect(historyEntries([sig("a", 1)], [res("a", true, false)])[0]?.result).toBe("green");
  });
  it("labels a win on the gale as green_g1", () => {
    expect(historyEntries([sig("a", 1)], [res("a", true, true)])[0]?.result).toBe("green_g1");
  });
  it("labels a lost entry and gale as red", () => {
    expect(historyEntries([sig("a", 1)], [res("a", false, false)])[0]?.result).toBe("red");
  });
  it("keeps a signal without result as pending, newest first", () => {
    const out = historyEntries([sig("old", 1), sig("new", 2)], [res("old", true, false)]);
    expect(out.map((e) => [e.key, e.result])).toEqual([
      ["new", "pending"],
      ["old", "green"],
    ]);
  });
});
