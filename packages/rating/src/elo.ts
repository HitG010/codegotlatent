export interface EloPlayer {
  rating: number;
  /** Maximum rating swing for this player in one contest. */
  k: number;
}

/** 1 if a beats b, 0.5 on a tie, 0 if b beats a — where the lower value wins. */
export function lowerWins(a: number, b: number): number {
  if (a < b) return 1;
  if (a > b) return 0;
  return 0.5;
}

export function expectedOutcome(rating: number, opponentRating: number, scale: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / scale));
}

/**
 * Multi-player Elo: every player plays one virtual game against each of
 * their opponents, and the per-game surprise is averaged so a player's swing
 * is bounded by their k regardless of field size. Returns unrounded deltas.
 */
export function pairwiseEloDeltas(
  players: readonly EloPlayer[],
  outcome: (i: number, j: number) => number,
  opponentsOf: (i: number) => readonly number[],
  scale: number,
): number[] {
  return players.map((player, i) => {
    const opponents = opponentsOf(i);
    if (opponents.length === 0) return 0;
    let surprise = 0;
    for (const j of opponents) {
      surprise += outcome(i, j) - expectedOutcome(player.rating, players[j]!.rating, scale);
    }
    return (player.k * surprise) / opponents.length;
  });
}
