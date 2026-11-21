import { describe, expect, it } from "vitest";
import { summarizeRoundFrequencies } from "./round-statistics";

const history = (sequence: string) =>
  sequence.split("").map((value) => ({
    outcome: value as "P" | "B" | "T",
  }));

describe("historical round frequencies", () => {
  it("reports exact observed frequencies for the selected window", () => {
    expect(summarizeRoundFrequencies(history("PPPPPPPPPPBBBBBBTTTT"))).toEqual({
      player: 50,
      banker: 30,
      tie: 20,
      sampleSize: 20,
    });
  });

  it("uses only the most recent rounds in the requested window", () => {
    expect(summarizeRoundFrequencies(history("PPPPBBBBTT"), 4)).toEqual({
      player: 0,
      banker: 50,
      tie: 50,
      sampleSize: 4,
    });
  });

  it("does not clamp or artificially adjust the observed tie frequency", () => {
    expect(summarizeRoundFrequencies(history("PPPPPPPPPPPPPPPPPPPP"))).toEqual({
      player: 100,
      banker: 0,
      tie: 0,
      sampleSize: 20,
    });
  });

  it("rounds percentages deterministically so that they sum to 100", () => {
    const result = summarizeRoundFrequencies(history("PBT"));
    expect(result).toEqual({
      player: 34,
      banker: 33,
      tie: 33,
      sampleSize: 3,
    });
    expect(result.player + result.banker + result.tie).toBe(100);
  });

  it("returns an empty summary for an empty history", () => {
    expect(summarizeRoundFrequencies([])).toEqual({
      player: 0,
      banker: 0,
      tie: 0,
      sampleSize: 0,
    });
  });
});
