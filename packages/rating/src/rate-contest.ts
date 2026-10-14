import type { PercentileGuess } from "@cgl/shared";
import { lowerWins, pairwiseEloDeltas } from "./elo.js";
import { intervalScore } from "./interval-score.js";
import { computeStandings, percentileFromMidrank } from "./standings.js";

export interface PlayerRating {
  rating: number;
  /** Contests this rating has been updated in before this one. */
  ratedContests: number;
}

export interface ContestEntry {
  userId: string;
  score: number;
  /** Finish time including penalties, in ms from contest start. */
  penaltyTimeMs: number;
  solvedCount: number;
  submissionCount: number;
  guess: PercentileGuess | null;
  latent: PlayerRating;
  form: PlayerRating;
}

export interface RatingConfig {
  /** Guesses are central (1 − alpha) ranges: 0.2 means "80% sure". */
  alpha: number;
  kFactor: number;
  /** Ratings with fewer contests than this move faster. */
  provisionalContests: number;
  provisionalMultiplier: number;
  /** Latent loss for competing without locking in a guess. */
  noGuessPenalty: number;
  eloScale: number;
}

export const DEFAULT_RATING_CONFIG: RatingConfig = {
  alpha: 0.2,
  kFactor: 40,
  provisionalContests: 5,
  provisionalMultiplier: 2,
  noGuessPenalty: 15,
  eloScale: 400,
};

export type EntryResult =
  | {
      userId: string;
      status: "rated";
      rank: number;
      /** "Top X%" finish, 0–100. */
      percentile: number;
      /** Null when the entrant didn't guess. Lower is better. */
      intervalScore: number | null;
      latentDelta: number;
      formDelta: number;
      noGuess: boolean;
      zeroSolve: boolean;
    }
  | { userId: string; status: "no-show" };

function roundDelta(delta: number): number {
  return Math.round(delta) + 0; // + 0 turns -0 into 0
}

/**
 * Computes standings and both rating changes for a finished contest.
 *
 * - The field is everyone who guessed or submitted. Registrants who did
 *   neither are no-shows: unrated and left out of the percentiles.
 * - Form: every entrant plays every other, decided by standings.
 * - Latent: entrants who guessed play each other on interval score.
 *   Entrants who solved nothing can't gain Latent and can't affect anyone
 *   else's — so guessing last and doing nothing is never worth it.
 * - Competing without a guess costs a fixed Latent penalty.
 *
 * Results are returned in input order.
 */
export function rateContest(
  entries: readonly ContestEntry[],
  config: RatingConfig = DEFAULT_RATING_CONFIG,
): EntryResult[] {
  const fieldIndex: number[] = [];
  entries.forEach((entry, i) => {
    if (entry.guess !== null || entry.submissionCount > 0) fieldIndex.push(i);
  });
  const field = fieldIndex.map((i) => entries[i]!);
  const fieldSize = field.length;

  const standings = computeStandings(field);
  const percentiles = standings.map((s) => percentileFromMidrank(s.midrank, fieldSize));
  const scores = field.map((entry, f) =>
    entry.guess === null ? null : intervalScore(entry.guess, percentiles[f]!, config.alpha),
  );

  const kFor = (rating: PlayerRating) =>
    config.kFactor *
    (rating.ratedContests < config.provisionalContests ? config.provisionalMultiplier : 1);

  const everyoneElse = (i: number) => field.map((_, j) => j).filter((j) => j !== i);
  const formDeltas = pairwiseEloDeltas(
    field.map((entry) => ({ rating: entry.form.rating, k: kFor(entry.form) })),
    (i, j) => lowerWins(standings[i]!.rank, standings[j]!.rank),
    everyoneElse,
    config.eloScale,
  );

  const guessers = field.map((_, f) => f).filter((f) => scores[f] !== null);
  const solvingGuessers = guessers.filter((f) => field[f]!.solvedCount > 0);
  const latentDeltas = pairwiseEloDeltas(
    field.map((entry) => ({ rating: entry.latent.rating, k: kFor(entry.latent) })),
    (i, j) => lowerWins(scores[i]!, scores[j]!),
    (i) => {
      if (scores[i] === null) return [];
      // Solvers are only measured against solvers, so a zero-solver's guess
      // can never move a solver's rating
      const pool = field[i]!.solvedCount > 0 ? solvingGuessers : guessers;
      return pool.filter((j) => j !== i);
    },
    config.eloScale,
  );

  const results: EntryResult[] = entries.map((entry) => ({
    userId: entry.userId,
    status: "no-show",
  }));
  field.forEach((entry, f) => {
    const noGuess = scores[f] === null;
    const zeroSolve = entry.solvedCount === 0;
    let latentDelta = latentDeltas[f]!;
    if (noGuess) latentDelta = -config.noGuessPenalty;
    else if (zeroSolve) latentDelta = Math.min(0, latentDelta);

    results[fieldIndex[f]!] = {
      userId: entry.userId,
      status: "rated",
      rank: standings[f]!.rank,
      percentile: percentiles[f]!,
      intervalScore: scores[f] ?? null,
      latentDelta: roundDelta(latentDelta),
      formDelta: roundDelta(formDeltas[f]!),
      noGuess,
      zeroSolve,
    };
  });
  return results;
}
