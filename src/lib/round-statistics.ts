import type { Round } from "./bacbo-engine";

export interface RoundFrequencies {
  player: number;
  banker: number;
  tie: number;
  sampleSize: number;
}

type OutcomeCount = {
  key: "player" | "banker" | "tie";
  count: number;
};

const EMPTY_FREQUENCIES: RoundFrequencies = {
  player: 0,
  banker: 0,
  tie: 0,
  sampleSize: 0,
};

/**
 * Descriptive frequencies for completed rounds only.
 * This function does not estimate or predict the next outcome.
 */
export function summarizeRoundFrequencies(
  history: ReadonlyArray<Pick<Round, "outcome">>,
  windowSize = 20,
): RoundFrequencies {
  const safeWindowSize = Number.isFinite(windowSize) ? Math.max(1, Math.floor(windowSize)) : 20;
  const recent = history.slice(-safeWindowSize);
  const sampleSize = recent.length;

  if (sampleSize === 0) return { ...EMPTY_FREQUENCIES };

  let pCount = 0;
  let bCount = 0;
  let tCount = 0;
  for (let i = 0; i < sampleSize; i++) {
    const o = recent[i]!.outcome;
    if (o === "P") pCount++;
    else if (o === "B") bCount++;
    else if (o === "T") tCount++;
  }

  const counts: OutcomeCount[] = [
    { key: "player", count: pCount },
    { key: "banker", count: bCount },
    { key: "tie", count: tCount },
  ];

  const values = counts.map(({ key, count }) => ({
    key,
    value: (count / sampleSize) * 100,
  }));
  const rounded = Object.fromEntries(
    values.map(({ key, value }) => [key, Math.floor(value)]),
  ) as Pick<RoundFrequencies, "player" | "banker" | "tie">;

  let remaining = 100 - rounded.player - rounded.banker - rounded.tie;
  const byRemainder = [...values].sort((a, b) => {
    const remainderDifference = (b.value % 1) - (a.value % 1);
    if (remainderDifference !== 0) return remainderDifference;

    const orderA = a.key === "player" ? 0 : a.key === "banker" ? 1 : 2;
    const orderB = b.key === "player" ? 0 : b.key === "banker" ? 1 : 2;
    return orderA - orderB;
  });

  for (let index = 0; remaining > 0; index++, remaining--) {
    const key = byRemainder[index % byRemainder.length]!.key;
    rounded[key] += 1;
  }

  return { ...rounded, sampleSize };
}
