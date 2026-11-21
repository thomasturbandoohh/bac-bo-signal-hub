import { describe, expect, it } from "vitest";
import { bankPlan, MIN_BET } from "./bank";

describe("bank plan", () => {
  it("table minimum bet is 1000 Kz", () => {
    expect(MIN_BET).toBe(1000);
  });

  it("never recommends an entry below 1000 Kz", () => {
    const p = bankPlan({ bank: 10000, win: 15, loss: 10, stake: 2 });
    expect(p.entry).toBe(1000);
    expect(p.raisedToMin).toBe(true);
    expect(p.minBankForStake).toBe(50000);
  });

  it("uses the chosen % when it is above the minimum, rounded down to 100 Kz", () => {
    const p = bankPlan({ bank: 123456, win: 15, loss: 10, stake: 2 });
    expect(p.entry).toBe(2400);
    expect(p.raisedToMin).toBe(false);
  });

  it("flags a bank that cannot cover one minimum bet", () => {
    expect(bankPlan({ bank: 500, win: 10, loss: 10, stake: 2 }).belowMin).toBe(true);
  });

  it("counts how many entries fit before the stop-loss", () => {
    expect(bankPlan({ bank: 100000, win: 10, loss: 10, stake: 2 }).entriesToStop).toBe(5);
  });
});
