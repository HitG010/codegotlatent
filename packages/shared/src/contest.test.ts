import { describe, expect, it } from "vitest";
import { percentileGuessSchema } from "./contest.js";

describe("percentileGuessSchema", () => {
  it("accepts a range from better to worse percentile", () => {
    expect(percentileGuessSchema.safeParse({ best: 15, worst: 30 }).success).toBe(true);
    expect(percentileGuessSchema.safeParse({ best: 0, worst: 100 }).success).toBe(true);
  });

  it("rejects inverted, empty, fractional and out-of-range guesses", () => {
    for (const guess of [
      { best: 30, worst: 15 },
      { best: 20, worst: 20 },
      { best: 10.5, worst: 20 },
      { best: -1, worst: 20 },
      { best: 10, worst: 101 },
    ]) {
      expect(percentileGuessSchema.safeParse(guess).success).toBe(false);
    }
  });
});
