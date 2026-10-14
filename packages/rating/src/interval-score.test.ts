import { describe, expect, it } from "vitest";
import { intervalScore } from "./interval-score.js";

const ALPHA = 0.2;

describe("intervalScore", () => {
  it("costs only the width when the finish lands inside the range", () => {
    expect(intervalScore({ best: 15, worst: 30 }, 22, ALPHA)).toBe(15);
    expect(intervalScore({ best: 15, worst: 30 }, 15, ALPHA)).toBe(15);
    expect(intervalScore({ best: 15, worst: 30 }, 30, ALPHA)).toBe(15);
  });

  it("adds 2/α per percentile missed on either side", () => {
    expect(intervalScore({ best: 20, worst: 24 }, 30, ALPHA)).toBeCloseTo(4 + 10 * 6);
    expect(intervalScore({ best: 20, worst: 24 }, 12, ALPHA)).toBeCloseTo(4 + 10 * 8);
  });

  it("makes the everything-range safe but expensive", () => {
    for (const actual of [1, 50, 100]) {
      expect(intervalScore({ best: 0, worst: 100 }, actual, ALPHA)).toBe(100);
    }
  });

  it("is proper: no range beats the honest 10th–90th percentile range", () => {
    // A player who believes their finish is uniform over top 1%..100%
    const outcomes = Array.from({ length: 100 }, (_, i) => i + 1);
    const expected = (best: number, worst: number) =>
      outcomes.reduce((sum, x) => sum + intervalScore({ best, worst }, x, ALPHA), 0) /
      outcomes.length;

    const honest = expected(10, 90);
    let bestAlternative = Infinity;
    for (let best = 0; best <= 100; best++) {
      for (let worst = best + 1; worst <= 100; worst++) {
        bestAlternative = Math.min(bestAlternative, expected(best, worst));
      }
    }
    expect(bestAlternative).toBeGreaterThanOrEqual(honest - 1e-9);
    // Shading the range narrower or wider than you believe is strictly worse
    expect(expected(20, 80)).toBeGreaterThan(honest);
    expect(expected(2, 98)).toBeGreaterThan(honest);
  });
});
