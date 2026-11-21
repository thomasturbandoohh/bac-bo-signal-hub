import { describe, expect, it } from "vitest";
import {
  analyze,
  BASE_GREEN,
  computeStats,
  estimateGreen,
  P_TIE,
  detectSignal,
  distribution,
  matchPatterns,
  resolveSignal,
  rollRound,
  type Outcome,
  type Round,
} from "./bacbo-engine";

const seq = (s: string) => s.split("") as Outcome[];
const rounds = (s: string): Round[] => seq(s).map((outcome) => ({ p: [1, 1], b: [1, 1], outcome }));

describe("bac bo patterns", () => {
  it("Surf: a run of 3+ follows the trend", () => {
    expect(matchPatterns(seq("BPPP"))[0]).toMatchObject({
      pattern: "Surf de tendência",
      side: "player",
    });
  });

  it("Xadrez 1-1-1: four alternating singles breaks to the opposite side", () => {
    const m = matchPatterns(seq("PBPB")).find((x) => x.pattern === "Xadrez 1-1-1");
    expect(m?.side).toBe("player");
  });

  it("Parzinho 2-2: PP BB P → completes the pair on player", () => {
    const m = matchPatterns(seq("PPBBP")).find((x) => x.pattern === "Parzinho 2-2");
    expect(m?.side).toBe("player");
  });

  it("3-1-3: BBB P BB → completes the banker block", () => {
    const m = matchPatterns(seq("BBBPBB")).find((x) => x.pattern === "3-1-3");
    expect(m).toMatchObject({ side: "banker", confidence: 80 });
  });

  it("ties are skipped when reading runs", () => {
    expect(matchPatterns(seq("BPTPTP"))[0]).toMatchObject({
      pattern: "Surf de tendência",
      side: "player",
    });
  });

  it("no signal below the minimum confidence", () => {
    expect(detectSignal(rounds("BPPP"), 70)).toBeNull();
    expect(detectSignal(rounds("BPPP"), 60)).not.toBeNull();
  });
});

describe("signal resolution (entry + 1 gale, tie covered)", () => {
  it("first round win is GREEN DIRETO", () => {
    expect(resolveSignal("player", seq("P")).result).toBe("green_g0");
  });
  it("win on the second round is G1; there is no G2", () => {
    expect(resolveSignal("player", seq("BP")).result).toBe("green_g1");
    expect(resolveSignal("banker", seq("PPB")).result).toBe("red");
  });
  it("a tie counts as green because the tie is covered", () => {
    expect(resolveSignal("banker", seq("PT"))).toMatchObject({ result: "green_g1", tieHit: true });
  });
  it("two losses is RED", () => {
    expect(resolveSignal("player", seq("BB")).result).toBe("red");
  });
});

describe("stats", () => {
  it("accuracy, streak and gale counts", () => {
    const s = computeStats(["green_g0", "green_g1", "red", "green_g1"]);
    expect(s).toMatchObject({ total: 4, greens: 3, accuracy: 75, streak: 2, g0: 1, g1: 2, reds: 1 });
  });
  it("distribution reports observed frequencies without clipping ties", () => {
    const d = distribution(rounds("PPPPPPPPPPTTTTTTTTTT"));
    expect(d).toEqual({ player: 50, banker: 0, tie: 50 });
  });
  it("rolls follow dice sums", () => {
    const r = rollRound(() => 0.99);
    expect(r.outcome).toBe("T");
  });
});

describe("signal math", () => {
  it("uses the exact dice odds: tie 146/1296, one covered entry ≈ 55.6% green", () => {
    expect(P_TIE).toBeCloseTo(0.1127, 4);
    expect(BASE_GREEN).toBeCloseTo(0.5563, 4);
  });
  it("a pattern with no record here is estimated at the table odds", () => {
    expect(estimateGreen({ n: 0, hits: 0 })).toBeCloseTo(BASE_GREEN, 6);
    expect(estimateGreen({ n: 6, hits: 6 })).toBeGreaterThan(BASE_GREEN);
    expect(estimateGreen({ n: 6, hits: 0 })).toBeLessThan(BASE_GREEN);
  });
  it("no forced entry when no pattern is formed", () => {
    expect(analyze(rounds("PPPBB"), 60)).toEqual({ signal: null, reason: "no_pattern" });
  });
  it("waits when the robot's last two readings were red (cold table)", () => {
    expect(analyze(rounds("BPBBPPP"), 60).reason).toBe("cold_table");
  });
  it("skips when Player and Banker readings are equally strong", () => {
    expect(analyze(rounds("PPBBPB"), 60).reason).toBe("conflict");
  });
  it("ignores a pattern that keeps failing at this table", () => {
    expect(analyze(rounds("BPBPPPBPBPBB"), 60).reason).toBe("weak_pattern");
  });
  it("a signal carries its estimated chance, record and explanation", () => {
    const s = analyze(rounds("PPPPPPPPPP"), 60).signal!;
    expect(s.side).toBe("player");
    expect(s.record).toEqual({ n: 6, hits: 6 });
    expect(s.probability).toBeGreaterThanOrEqual(50);
    expect(s.probability).toBeLessThanOrEqual(85);
    expect(s.reasons[1]).toContain("6 de 6");
  });
});
