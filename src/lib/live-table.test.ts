import { describe, expect, it } from "vitest";
import { lynxToRow, rowToLiveRound, type LynxRound } from "./live-table";

const sample: LynxRound = {
  id: "v1794734273438",
  tableId: "BacBo00000000001",
  startedAt: "2026-11-15T09:17:38.268Z",
  settledAt: "2026-11-15T09:18:02.598Z",
  outcome: "player",
  data: {
    player: { dice: [3, 5], score: 8 },
    banker: { dice: [1, 6], score: 7 },
    multiplier: null,
  },
};

describe("live table rounds", () => {
  it("turns a real round into engine input with its dice and outcome", () => {
    const row = lynxToRow(sample)!;
    const r = rowToLiveRound({ ...row, multiplier: row.multiplier ?? null });
    expect(r).toMatchObject({ id: "v1794734273438", outcome: "P", p: [3, 5], b: [1, 6] });
    expect(r.pScore).toBe(8);
    expect(r.bScore).toBe(7);
    expect(r.settledAt).toBe(Date.parse("2026-11-15T09:18:02.598Z"));
  });

  it("maps a tie and keeps its multiplier", () => {
    const tie = { ...sample, outcome: "tie" as const, data: { ...sample.data, multiplier: 6 } };
    const row = lynxToRow(tie)!;
    expect(rowToLiveRound({ ...row, multiplier: row.multiplier ?? null })).toMatchObject({
      outcome: "T",
      multiplier: 6,
    });
  });

  it("rejects rounds with impossible dice", () => {
    expect(
      lynxToRow({ ...sample, data: { ...sample.data, player: { dice: [0, 7], score: 7 } } }),
    ).toBeNull();
  });
});
