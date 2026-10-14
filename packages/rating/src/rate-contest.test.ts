import { describe, expect, it } from "vitest";
import { pairwiseEloDeltas, lowerWins } from "./elo.js";
import { rateContest, type ContestEntry, type EntryResult } from "./rate-contest.js";

const SETTLED = { rating: 1500, ratedContests: 10 };
const NEWCOMER = { rating: 1500, ratedContests: 0 };

function entry(userId: string, fields: Partial<ContestEntry> = {}): ContestEntry {
  return {
    userId,
    score: 0,
    penaltyTimeMs: 0,
    solvedCount: 0,
    submissionCount: 0,
    guess: null,
    latent: SETTLED,
    form: SETTLED,
    ...fields,
  };
}

function solver(userId: string, score: number, guess: ContestEntry["guess"]): ContestEntry {
  return entry(userId, { score, penaltyTimeMs: 1000, solvedCount: 1, submissionCount: 1, guess });
}

function rated(results: EntryResult[], userId: string) {
  const result = results.find((r) => r.userId === userId);
  if (result?.status !== "rated") throw new Error(`${userId} was not rated`);
  return result;
}

describe("rateContest", () => {
  it("rewards the best-calibrated guess and the best finish", () => {
    const results = rateContest([
      solver("a", 300, { best: 30, worst: 40 }), // finishes top 33%, inside, S = 10
      solver("b", 200, { best: 50, worst: 80 }), // finishes top 67%, inside, S = 30
      solver("c", 100, { best: 10, worst: 20 }), // finishes top 100%, misses by 80
    ]);
    expect(results.map((r) => rated(results, r.userId).latentDelta)).toEqual([20, 0, -20]);
    expect(results.map((r) => rated(results, r.userId).formDelta)).toEqual([20, 0, -20]);
    expect(rated(results, "c").intervalScore).toBeCloseTo(10 + 10 * 80);
  });

  it("separates the ratings: a top finisher with a bad guess still loses Latent", () => {
    const results = rateContest([
      solver("winner", 300, { best: 80, worst: 100 }),
      solver("modest", 100, { best: 60, worst: 100 }),
    ]);
    expect(rated(results, "winner").formDelta).toBeGreaterThan(0);
    expect(rated(results, "winner").latentDelta).toBeLessThan(0);
  });

  describe("sandbagging (guess last, solve nothing)", () => {
    const solvers = [
      solver("a", 300, { best: 20, worst: 30 }),
      solver("b", 200, { best: 45, worst: 60 }),
      solver("c", 100, { best: 0, worst: 10 }),
    ];
    const accurate = rateContest([...solvers, entry("d", { guess: { best: 95, worst: 100 } })]);
    const wild = rateContest([...solvers, entry("d", { guess: { best: 0, worst: 5 } })]);

    it("can never gain Latent", () => {
      expect(rated(accurate, "d").intervalScore).toBe(5);
      expect(rated(accurate, "d").latentDelta).toBe(0);
      expect(rated(wild, "d").latentDelta).toBeLessThan(0);
    });

    it("can't move anyone else's rating", () => {
      for (const id of ["a", "b", "c"]) {
        expect(rated(accurate, id).latentDelta).toBe(rated(wild, id).latentDelta);
        expect(rated(accurate, id).formDelta).toBe(rated(wild, id).formDelta);
      }
    });
  });

  it("charges a fixed penalty for competing without a guess", () => {
    const results = rateContest([
      solver("a", 300, { best: 20, worst: 60 }),
      entry("silent", { score: 100, solvedCount: 1, submissionCount: 3 }),
    ]);
    const silent = rated(results, "silent");
    expect(silent.noGuess).toBe(true);
    expect(silent.intervalScore).toBeNull();
    expect(silent.latentDelta).toBe(-15);
    // With no other guessers, "a" has nobody to be compared against
    expect(rated(results, "a").latentDelta).toBe(0);
  });

  it("leaves no-shows unrated and out of the percentiles", () => {
    const results = rateContest([
      solver("a", 300, { best: 30, worst: 40 }),
      solver("b", 200, { best: 60, worst: 70 }),
      solver("c", 100, { best: 90, worst: 100 }),
      entry("ghost"),
    ]);
    expect(results[3]).toEqual({ userId: "ghost", status: "no-show" });
    expect(rated(results, "a").percentile).toBeCloseTo(100 / 3);
  });

  it("moves provisional ratings twice as fast", () => {
    const results = rateContest([
      { ...solver("new", 300, { best: 40, worst: 60 }), latent: NEWCOMER, form: NEWCOMER },
      solver("old", 100, { best: 0, worst: 10 }),
    ]);
    expect(rated(results, "new").latentDelta).toBe(40);
    expect(rated(results, "new").formDelta).toBe(40);
    expect(rated(results, "old").latentDelta).toBe(-20);
  });

  it("keeps ratings put in a field of one", () => {
    const results = rateContest([solver("solo", 100, { best: 90, worst: 100 })]);
    expect(rated(results, "solo")).toMatchObject({ latentDelta: 0, formDelta: 0, rank: 1 });
  });

  it("is deterministic, keeps input order, and stays zero-sum among equals", () => {
    let seed = 42;
    const random = () => (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
    const entries = Array.from({ length: 60 }, (_, i) => {
      const best = Math.floor(random() * 90);
      return solver(`u${i}`, Math.floor(random() * 5) * 100, {
        best,
        worst: best + 1 + Math.floor(random() * 10),
      });
    });

    const first = rateContest(entries);
    expect(rateContest(entries)).toEqual(first);
    expect(first.map((r) => r.userId)).toEqual(entries.map((e) => e.userId));

    const rounding = entries.length / 2;
    const sum = (key: "latentDelta" | "formDelta") =>
      first.reduce((total, r) => total + rated(first, r.userId)[key], 0);
    expect(Math.abs(sum("latentDelta"))).toBeLessThanOrEqual(rounding);
    expect(Math.abs(sum("formDelta"))).toBeLessThanOrEqual(rounding);
  });
});

describe("pairwiseEloDeltas", () => {
  it("is exactly zero-sum when every player has the same k", () => {
    const players = [1400, 1500, 1650, 1900].map((rating) => ({ rating, k: 40 }));
    const deltas = pairwiseEloDeltas(
      players,
      (i, j) => lowerWins(i, j), // index order is finishing order
      (i) => players.map((_, j) => j).filter((j) => j !== i),
      400,
    );
    expect(deltas.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 9);
  });

  it("pays more for an upset than for the expected result", () => {
    const opponents = (i: number) => [1 - i];
    const favouriteWins = pairwiseEloDeltas(
      [{ rating: 1800, k: 40 }, { rating: 1400, k: 40 }],
      (i, j) => lowerWins(i, j),
      opponents,
      400,
    );
    const underdogWins = pairwiseEloDeltas(
      [{ rating: 1400, k: 40 }, { rating: 1800, k: 40 }],
      (i, j) => lowerWins(i, j),
      opponents,
      400,
    );
    expect(underdogWins[0]!).toBeGreaterThan(favouriteWins[0]!);
  });
});
