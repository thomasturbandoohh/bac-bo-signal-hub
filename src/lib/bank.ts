/** Bank management math for the Bac Bo table. Pure and browser-safe. */

/** Smallest bet the Bac Bo Live table accepts, in Kwanza. */
export const MIN_BET = 1000;

export interface BankInput {
  bank: number;
  win: number;
  loss: number;
  stake: number;
}

export interface BankPlan {
  /** Bet per signal, never below the table minimum, rounded down to 100 Kz. */
  entry: number;
  /** True when the chosen % would give less than the table minimum. */
  raisedToMin: boolean;
  /** Smallest bank where the chosen % already reaches the table minimum. */
  minBankForStake: number;
  /** True when the bank cannot cover even one minimum bet. */
  belowMin: boolean;
  target: number;
  floor: number;
  /** How many full entries fit between the bank and the stop-loss. */
  entriesToStop: number;
}

export const kz = (n: number) =>
  `${n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`;

export function bankPlan({ bank, win, loss, stake }: BankInput): BankPlan {
  const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
  const b = safe(bank);
  const raw = Math.floor((b * safe(stake)) / 100 / 100) * 100;
  const entry = Math.max(MIN_BET, raw);
  const floor = b * (1 - Math.min(100, safe(loss)) / 100);
  return {
    entry,
    raisedToMin: raw < MIN_BET,
    minBankForStake: safe(stake) ? Math.ceil((MIN_BET * 100) / safe(stake)) : Infinity,
    belowMin: b < MIN_BET,
    target: b * (1 + safe(win) / 100),
    floor,
    entriesToStop: Math.floor((b - floor) / entry),
  };
}
