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

// Status strings stored by the v1 app, for the data migration.
export const LEGACY_STATUS_TO_PHASE: Record<string, ContestPhase> = {
  Upcoming: "SCHEDULED",
  "Rank Guess Phase": "GUESS_WINDOW",
  Ongoing: "LIVE",
  "Rating Update Pending": "JUDGING",
  Ended: "RESULTS",
};

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
