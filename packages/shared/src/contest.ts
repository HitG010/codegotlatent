import { z } from "zod";

// The broadcast-style lifecycle every contest moves through, in order.
export const CONTEST_PHASES = [
  "SCHEDULED", // registration open
  "GUESS_WINDOW", // registration closed, participants lock in their range
  "LIVE", // problems revealed
  "JUDGING", // contest over, standings and ratings being computed
  "RESULTS", // final standings and rating changes published
] as const;

export const contestPhaseSchema = z.enum(CONTEST_PHASES);
export type ContestPhase = z.infer<typeof contestPhaseSchema>;

/**
 * A percentile range guess: "I'll finish between top `best`% and top `worst`%".
 * Percentiles are "top X%" — smaller is better — so best ≤ worst.
 * Players are asked for a range they're 80% sure about; see @cgl/rating.
 */
export const MIN_GUESS_WIDTH = 1;

export const percentileGuessSchema = z
  .object({
    best: z.number().int().min(0).max(100),
    worst: z.number().int().min(0).max(100),
  })
  .refine((g) => g.worst - g.best >= MIN_GUESS_WIDTH, {
    message: `Range must span at least ${MIN_GUESS_WIDTH} percentile`,
  });

export type PercentileGuess = z.infer<typeof percentileGuessSchema>;

export interface ContestTimes {
  guessOpensAt: Date;
  startsAt: Date;
  endsAt: Date;
  /** When results and ratings went out; null until then. */
  publishedAt: Date | null;
}

/**
 * A contest's phase follows from its times, so nothing has to flip it on
 * schedule and a restart can't lose track. Only publishing results is an
 * action (the judge worker does it once every submission is judged).
 */
export function phaseAt(contest: ContestTimes, now: Date = new Date()): ContestPhase {
  if (contest.publishedAt) return "RESULTS";
  if (now < contest.guessOpensAt) return "SCHEDULED";
  if (now < contest.startsAt) return "GUESS_WINDOW";
  if (now < contest.endsAt) return "LIVE";
  return "JUDGING";
}
