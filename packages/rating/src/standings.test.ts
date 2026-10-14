import { describe, expect, it } from "vitest";
import { computeStandings, percentileFromMidrank } from "./standings.js";

describe("computeStandings", () => {
  it("orders by score, then by penalty time", () => {
    const standings = computeStandings([
      { score: 100, penaltyTimeMs: 50 },
      { score: 300, penaltyTimeMs: 90 },
      { score: 100, penaltyTimeMs: 10 },
    ]);
    expect(standings.map((s) => s.rank)).toEqual([3, 1, 2]);
  });

  it("gives equal score and time a shared rank and skips the next ones", () => {
    // v1 compared Date objects with ===, so ties never tied
    const standings = computeStandings([
      { score: 200, penaltyTimeMs: 1000 },
      { score: 100, penaltyTimeMs: 1000 },
      { score: 100, penaltyTimeMs: 1000 },
      { score: 0, penaltyTimeMs: 0 },
    ]);
    expect(standings.map((s) => s.rank)).toEqual([1, 2, 2, 4]);
    expect(standings.map((s) => s.midrank)).toEqual([1, 2.5, 2.5, 4]);
  });

  it("puts a whole tied bottom group at its middle position", () => {
    const standings = computeStandings([
      { score: 10, penaltyTimeMs: 5 },
      { score: 0, penaltyTimeMs: 0 },
      { score: 0, penaltyTimeMs: 0 },
      { score: 0, penaltyTimeMs: 0 },
    ]);
    expect(standings.slice(1).every((s) => s.rank === 2 && s.midrank === 3)).toBe(true);
  });
});

describe("percentileFromMidrank", () => {
  it("reads as 'top X%'", () => {
    expect(percentileFromMidrank(1, 10)).toBe(10);
    expect(percentileFromMidrank(10, 10)).toBe(100);
    expect(percentileFromMidrank(1, 1)).toBe(100);
  });
});
