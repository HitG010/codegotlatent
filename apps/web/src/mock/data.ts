// Sample data for the prototype. Every person and result here is invented.
import type { PercentileGuess, Verdict } from "@cgl/shared";

const HOUR = 3_600_000;
const loadedAt = Date.now();
// The sample round starts at 20:00 local time, two days from now
const showStart = new Date(loadedAt + 2 * 24 * HOUR);
showStart.setHours(20, 0, 0, 0);

export interface Me {
  handle: string;
  name: string;
  location: string;
  joined: string;
}

export const ME: Me = { handle: "hitesh", name: "Hitesh Gupta", location: "New Delhi", joined: "Mar 2025" };

export interface ContestRecord {
  round: number;
  field: number;
  guess: PercentileGuess;
  finish: number;
  solved: number;
  of: number;
  latentAfter: number;
  latentDelta: number;
  formAfter: number;
  formDelta: number;
}

// Oldest first. A guess "hits" when the finish lands inside the range.
export const HISTORY: ContestRecord[] = [
  { round: 6, field: 88, guess: { best: 10, worst: 25 }, finish: 41, solved: 2, of: 4, latentAfter: 1479, latentDelta: -21, formAfter: 1496, formDelta: -4 },
  { round: 7, field: 102, guess: { best: 30, worst: 55 }, finish: 47, solved: 2, of: 4, latentAfter: 1491, latentDelta: 12, formAfter: 1505, formDelta: 9 },
  { round: 8, field: 117, guess: { best: 25, worst: 40 }, finish: 22, solved: 3, of: 5, latentAfter: 1485, latentDelta: -6, formAfter: 1520, formDelta: 15 },
  { round: 9, field: 121, guess: { best: 15, worst: 35 }, finish: 28, solved: 3, of: 4, latentAfter: 1502, latentDelta: 17, formAfter: 1526, formDelta: 6 },
  { round: 10, field: 134, guess: { best: 20, worst: 28 }, finish: 24, solved: 3, of: 4, latentAfter: 1533, latentDelta: 31, formAfter: 1537, formDelta: 11 },
  { round: 11, field: 139, guess: { best: 10, worst: 20 }, finish: 33, solved: 2, of: 4, latentAfter: 1509, latentDelta: -24, formAfter: 1529, formDelta: -8 },
  { round: 12, field: 143, guess: { best: 15, worst: 30 }, finish: 22, solved: 3, of: 4, latentAfter: 1527, latentDelta: 18, formAfter: 1536, formDelta: 7 },
];

export const isHit = (r: Pick<ContestRecord, "guess" | "finish">) =>
  r.finish >= r.guess.best && r.finish <= r.guess.worst;

export interface ContestProblemSummary {
  label: string;
  title: string;
  slug: string;
  points: number;
  solvedBy: number;
}

export const ROUND_12 = {
  slug: "round-12",
  round: 12,
  title: "Round 12",
  guessOpensAt: new Date(showStart.getTime() - 10 * 60_000),
  startsAt: showStart,
  durationMinutes: 90,
  penaltyMinutes: 5,
  registered: 143,
  problems: [
    { label: "A", title: "Self-Aware", slug: "self-aware", points: 500, solvedBy: 131 },
    { label: "B", title: "Judges' Panel", slug: "judges-panel", points: 1000, solvedBy: 96 },
    { label: "C", title: "Standing Ovation", slug: "standing-ovation", points: 1500, solvedBy: 41 },
    { label: "D", title: "Golden Buzzer", slug: "golden-buzzer", points: 2000, solvedBy: 9 },
  ] satisfies ContestProblemSummary[],
};

// ─── Standings for the results screen ─────────────────────────────────────

export interface ProblemCell {
  solved: boolean;
  wrong: number; // rejected attempts
  minute: number | null; // solve time from start
}

export interface StandingRow {
  rank: number;
  handle: string;
  finish: number;
  guess: PercentileGuess;
  cells: ProblemCell[];
  score: number;
  penaltyMinutes: number;
  latentDelta: number;
  formDelta: number;
  isMe: boolean;
}

const HANDLES = [
  "tanvi_k", "arjun.dev", "mehul_codes", "priya_s", "kabir", "ananya.r", "rohan_x", "sneha.b",
  "dev_patel", "ishaan", "zoya_m", "vikram99", "neha.t", "aditya_k", "sara.j", "yash_o",
  "riya.m", "karan_v", "pooja_n", "nikhil.s", "aisha_q", "manav", "trisha.d", "omkar_p",
  "farhan.a", "lavanya", "siddh", "meera_k", "harsh.v", "gauri",
];

function seeded(seed: number) {
  let state = seed;
  return () => (state = (state * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
}

function buildStandings(): StandingRow[] {
  const random = seeded(12);
  const field = ROUND_12.registered;
  const myRank = 31; // top 22% of 143
  const rows: StandingRow[] = [];
  for (let rank = 1; rank <= field; rank++) {
    const solvedCount = rank <= 9 ? 4 : rank <= 40 ? 3 : rank <= 95 ? 2 : rank <= 130 ? 1 : 0;
    const finish = Math.round((100 * rank) / field);
    const isMe = rank === myRank;
    const cells = ROUND_12.problems.map((_, i) => {
      const solved = i < solvedCount;
      const wrong = solved ? (random() < 0.3 ? 1 + Math.floor(random() * 2) : 0) : random() < 0.4 ? 1 + Math.floor(random() * 3) : 0;
      const minute = solved ? Math.min(89, Math.round(6 + i * 17 + rank * 0.12 + random() * 9)) : null;
      return { solved, wrong, minute };
    });
    const centre = Math.max(1, Math.min(99, finish + Math.round((random() - 0.5) * 50)));
    const width = 6 + Math.floor(random() * 24);
    const guess = isMe
      ? { best: 15, worst: 30 }
      : { best: Math.max(0, centre - Math.floor(width / 2)), worst: Math.min(100, centre + Math.ceil(width / 2)) };
    const inside = finish >= guess.best && finish <= guess.worst;
    const miss = inside ? 0 : Math.min(Math.abs(finish - guess.best), Math.abs(finish - guess.worst));
    rows.push({
      rank,
      handle: isMe ? ME.handle : `${HANDLES[(rank * 7) % HANDLES.length]}${rank > HANDLES.length ? rank : ""}`,
      finish,
      guess,
      cells,
      score: cells.reduce((sum, cell, i) => sum + (cell.solved ? ROUND_12.problems[i]!.points : 0), 0),
      penaltyMinutes: cells.reduce((sum, c) => sum + (c.solved ? (c.minute ?? 0) + 5 * c.wrong : 0), 0),
      latentDelta: isMe ? 18 : solvedCount === 0 ? -Math.min(20, miss) : inside ? Math.round(28 - width / 2) : -Math.min(30, 6 + Math.round(miss / 2)),
      formDelta: isMe ? 7 : Math.round(24 - (rank / field) * 44 + (random() - 0.5) * 10),
      isMe,
    });
  }
  return rows;
}

export const STANDINGS = buildStandings();

// ─── Practice ─────────────────────────────────────────────────────────────

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface PracticeProblem {
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  acceptance: number;
  solvers: number;
  status: "solved" | "attempted" | null;
  from: string; // where it first appeared
}

export const PRACTICE: PracticeProblem[] = [
  { slug: "self-aware", title: "Self-Aware", difficulty: "EASY", tags: ["implementation"], acceptance: 71, solvers: 612, status: "solved", from: "Round 12 · A" },
  { slug: "judges-panel", title: "Judges' Panel", difficulty: "EASY", tags: ["sorting", "greedy"], acceptance: 54, solvers: 498, status: "solved", from: "Round 12 · B" },
  { slug: "standing-ovation", title: "Standing Ovation", difficulty: "MEDIUM", tags: ["prefix sums"], acceptance: 31, solvers: 207, status: "attempted", from: "Round 12 · C" },
  { slug: "golden-buzzer", title: "Golden Buzzer", difficulty: "HARD", tags: ["dp", "bitmasks"], acceptance: 9, solvers: 38, status: null, from: "Round 12 · D" },
  { slug: "green-room", title: "Green Room", difficulty: "EASY", tags: ["math"], acceptance: 66, solvers: 702, status: "solved", from: "Round 11 · A" },
  { slug: "laugh-track", title: "Laugh Track", difficulty: "MEDIUM", tags: ["strings", "hashing"], acceptance: 28, solvers: 233, status: null, from: "Round 11 · B" },
  { slug: "roast-order", title: "Roast Order", difficulty: "MEDIUM", tags: ["graphs", "topological sort"], acceptance: 24, solvers: 190, status: "attempted", from: "Round 11 · C" },
  { slug: "audience-poll", title: "Audience Poll", difficulty: "HARD", tags: ["segment tree"], acceptance: 7, solvers: 41, status: null, from: "Round 11 · D" },
  { slug: "mic-check", title: "Mic Check", difficulty: "EASY", tags: ["implementation"], acceptance: 78, solvers: 841, status: "solved", from: "Round 10 · A" },
  { slug: "spotlight", title: "Spotlight", difficulty: "MEDIUM", tags: ["binary search"], acceptance: 35, solvers: 302, status: "solved", from: "Round 10 · B" },
  { slug: "callback-joke", title: "Callback Joke", difficulty: "MEDIUM", tags: ["stacks"], acceptance: 29, solvers: 244, status: null, from: "Round 10 · C" },
  { slug: "encore", title: "Encore", difficulty: "HARD", tags: ["dp", "math"], acceptance: 11, solvers: 63, status: null, from: "Round 10 · D" },
  { slug: "cold-open", title: "Cold Open", difficulty: "EASY", tags: ["greedy"], acceptance: 62, solvers: 655, status: "solved", from: "Round 9 · A" },
  { slug: "seating-chart", title: "Seating Chart", difficulty: "MEDIUM", tags: ["two pointers", "sorting"], acceptance: 33, solvers: 281, status: "solved", from: "Round 9 · B" },
  { slug: "applause-meter", title: "Applause Meter", difficulty: "MEDIUM", tags: ["monotonic queue"], acceptance: 22, solvers: 167, status: null, from: "Round 9 · C" },
  { slug: "final-cut", title: "Final Cut", difficulty: "HARD", tags: ["graphs", "shortest paths"], acceptance: 13, solvers: 72, status: null, from: "Round 9 · D" },
];

export const PRACTICE_TOTALS: Record<Difficulty, number> = { EASY: 42, MEDIUM: 57, HARD: 23 };

// ─── Submissions ──────────────────────────────────────────────────────────

export interface SubmissionSummary {
  id: string;
  problem: string;
  problemSlug: string;
  verdict: Verdict;
  language: string;
  timeMs: number | null;
  ago: string;
}

export const RECENT_SUBMISSIONS: SubmissionSummary[] = [
  { id: "s9", problem: "Standing Ovation", problemSlug: "standing-ovation", verdict: "TIME_LIMIT_EXCEEDED", language: "Python", timeMs: null, ago: "2h ago" },
  { id: "s8", problem: "Standing Ovation", problemSlug: "standing-ovation", verdict: "WRONG_ANSWER", language: "Python", timeMs: 412, ago: "2h ago" },
  { id: "s7", problem: "Judges' Panel", problemSlug: "judges-panel", verdict: "ACCEPTED", language: "C++", timeMs: 46, ago: "yesterday" },
  { id: "s6", problem: "Self-Aware", problemSlug: "self-aware", verdict: "ACCEPTED", language: "C++", timeMs: 31, ago: "yesterday" },
  { id: "s5", problem: "Roast Order", problemSlug: "roast-order", verdict: "RUNTIME_ERROR", language: "C++", timeMs: 18, ago: "3 days ago" },
  { id: "s4", problem: "Spotlight", problemSlug: "spotlight", verdict: "ACCEPTED", language: "Java", timeMs: 188, ago: "last week" },
];

// ─── Landing page sample ──────────────────────────────────────────────────

export const SAMPLE_CONTESTANT = {
  handle: "tanvi_k",
  round: 11,
  field: 139,
  solved: 3,
  of: 4,
  wrong: 1,
  minutes: 72,
  finish: 18,
};
