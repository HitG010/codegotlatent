export interface StandingInput {
  score: number;
  /** Finish time including penalties, in ms from contest start. Lower is better. */
  penaltyTimeMs: number;
}

export interface Standing {
  /** Competition rank ("1224"): tied entries share the best rank of their group. */
  rank: number;
  /** Average position of the tie group; used for percentiles so ties are fair. */
  midrank: number;
}

function compareEntries(a: StandingInput, b: StandingInput): number {
  return b.score - a.score || a.penaltyTimeMs - b.penaltyTimeMs;
}

/** Ranks entries by score (desc), then penalty time (asc). Output is in input order. */
export function computeStandings(entries: readonly StandingInput[]): Standing[] {
  const order = entries
    .map((_, i) => i)
    .sort((a, b) => compareEntries(entries[a]!, entries[b]!));
  const standings = new Array<Standing>(entries.length);

  let groupStart = 0;
  while (groupStart < order.length) {
    let groupEnd = groupStart;
    while (
      groupEnd + 1 < order.length &&
      compareEntries(entries[order[groupStart]!]!, entries[order[groupEnd + 1]!]!) === 0
    ) {
      groupEnd++;
    }
    const rank = groupStart + 1;
    const midrank = (groupStart + groupEnd) / 2 + 1;
    for (let k = groupStart; k <= groupEnd; k++) {
      standings[order[k]!] = { rank, midrank };
    }
    groupStart = groupEnd + 1;
  }
  return standings;
}

/** "Top X%" for a position in a field: rank 1 of 10 is the top 10%. */
export function percentileFromMidrank(midrank: number, fieldSize: number): number {
  return (100 * midrank) / fieldSize;
}
