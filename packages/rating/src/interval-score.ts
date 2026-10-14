import type { PercentileGuess } from "@cgl/shared";

/**
 * Interval score (Gneiting & Raftery, 2007) of a central (1 − α) prediction
 * interval. Lower is better: the width always costs, and a miss costs an
 * extra 2/α per percentile of distance.
 *
 * It is a proper scoring rule — reporting your honest α/2 and 1 − α/2
 * quantiles minimises your expected score — so the best strategy is to
 * guess the range you genuinely believe, as narrow as you dare.
 */
export function intervalScore(
  guess: PercentileGuess,
  actualPercentile: number,
  alpha: number,
): number {
  const width = guess.worst - guess.best;
  let missBy = 0;
  if (actualPercentile < guess.best) missBy = guess.best - actualPercentile;
  else if (actualPercentile > guess.worst) missBy = actualPercentile - guess.worst;
  return width + (2 / alpha) * missBy;
}
