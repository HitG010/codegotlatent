// Shapes of the problems and judging API, shared by the server and the web app.
import { z } from "zod";
import type { ContestPhase, PercentileGuess } from "./contest.js";
import { languageSchema, type Language, type SubmissionStatus, type Verdict } from "./judge.js";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type ProblemStatus = "solved" | "attempted" | null;

export interface ProblemSummary {
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  /** Accepted submissions as a share of all submissions, 0–100; null before anyone submits. */
  acceptance: number | null;
  solvers: number;
  status: ProblemStatus;
  /** Where it first appeared, e.g. "Round 12 · A"; null for practice-only problems. */
  from: string | null;
}

export interface ProblemListResponse {
  problems: ProblemSummary[];
  totals: Record<Difficulty, { total: number; solved: number }>;
}

export interface Sample {
  input: string;
  output: string;
}

export interface ProblemDetail {
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  timeLimitMs: number;
  memoryLimitMb: number;
  statementHtml: string;
  editorialHtml: string | null;
  samples: Sample[];
  /** Samples plus hidden tests. */
  testCount: number;
  from: string | null;
  status: ProblemStatus;
  /** Set when the problem is being viewed as part of a contest. */
  contest: { slug: string; title: string; label: string; points: number; endsAt: string } | null;
}

export const MAX_CODE_BYTES = 64 * 1024;

export const runRequestSchema = z.object({
  language: languageSchema,
  code: z.string().min(1).max(MAX_CODE_BYTES),
  /** Custom input to run once; omit to run the samples. */
  input: z.string().max(MAX_CODE_BYTES).optional(),
});

export const submitRequestSchema = z.object({
  language: languageSchema,
  code: z.string().min(1).max(MAX_CODE_BYTES),
});

export interface RunCase {
  input: string;
  /** Null for custom input, which has no answer to compare against. */
  expected: string | null;
  output: string;
  stderr: string;
  /** Null for custom input that ran cleanly: there's nothing to judge it against. */
  verdict: Verdict | null;
  /** Why the output was wrong. Only given for samples, never for hidden tests. */
  reason: string | null;
  timeMs: number | null;
  memoryKb: number | null;
}

export interface RunResponse {
  compileError: string | null;
  cases: RunCase[];
}

// A type alias, not an interface, so it can be stored as a JSON column
export type TestResult = {
  verdict: Verdict;
  timeMs: number | null;
  memoryKb: number | null;
};

export interface SubmissionView {
  id: string;
  problemSlug: string;
  language: Language;
  status: SubmissionStatus;
  verdict: Verdict | null;
  testsPassed: number;
  testsTotal: number;
  /** One entry per test judged so far, in order. Judging stops at the first failure. */
  results: TestResult[];
  compileOutput: string | null;
  timeMs: number | null;
  memoryKb: number | null;
  createdAt: string;
}

// ─── Contests ──────────────────────────────────────────────────────────────

export interface ContestSummary {
  slug: string;
  title: string;
  phase: ContestPhase;
  guessOpensAt: string;
  startsAt: string;
  endsAt: string;
  isRated: boolean;
  registered: number;
  /** How many problems, though not which, before it starts. */
  problemCount: number;
  /** The signed-in user's part in it; null when signed out. */
  you: { registered: boolean; guess: PercentileGuess | null } | null;
}

export interface ContestListResponse {
  contests: ContestSummary[];
}

export interface ContestProblemSummary {
  label: string;
  /** Its practice page, once results are out. */
  slug: string;
  title: string;
  points: number;
  /** Contestants who have solved it. */
  solvedBy: number;
  you: ProblemStatus;
}

export interface ContestDetail extends ContestSummary {
  descriptionHtml: string | null;
  rulesHtml: string | null;
  penaltyMinutes: number;
  maxParticipants: number | null;
  /** Null until the contest is live, and while live for anyone not registered. */
  problems: ContestProblemSummary[] | null;
  /** Your running totals, once you've entered. */
  standing: { points: number; penaltyMinutes: number; solved: number } | null;
}

export interface ContestResultCell {
  label: string;
  solved: boolean;
  wrongAttempts: number;
  /** Minutes from the start to the accepted submission. */
  minute: number | null;
}

export interface ContestResultRow {
  rank: number;
  handle: string;
  you: boolean;
  points: number;
  penaltyMinutes: number;
  cells: ContestResultCell[];
  guess: PercentileGuess | null;
  /** "Top X%" finish. */
  finish: number;
  latentDelta: number;
  formDelta: number;
}

export interface RatingChange {
  before: number;
  after: number;
  delta: number;
}

export interface ContestResults {
  contest: { slug: string; title: string; field: number; isRated: boolean; problems: Array<{ label: string; title: string; points: number }> };
  you: {
    rank: number;
    finish: number;
    guess: PercentileGuess | null;
    predictionScore: number | null;
    latent: RatingChange | null;
    form: RatingChange | null;
    points: number;
    solved: number;
    penaltyMinutes: number;
  } | null;
  rows: ContestResultRow[];
}

// ─── Profiles ──────────────────────────────────────────────────────────────

/** One finished round on a player's profile. */
export interface ProfileContest {
  slug: string;
  title: string;
  startsAt: string;
  /** Ranked entrants. */
  field: number;
  rank: number;
  /** "Top X%" finish. */
  finish: number;
  guess: PercentileGuess | null;
  predictionScore: number | null;
  points: number;
  solved: number;
  /** Null for unrated rounds. */
  latent: RatingChange | null;
  form: RatingChange | null;
}

export interface ProfileSubmission {
  id: string;
  problemSlug: string;
  problemTitle: string;
  language: Language;
  status: SubmissionStatus;
  verdict: Verdict | null;
  createdAt: string;
}

export interface UserProfile {
  handle: string;
  joinedAt: string;
  /** True on your own profile. */
  you: boolean;
  latent: { rating: number; contests: number };
  form: { rating: number; contests: number };
  /** Oldest first. */
  contests: ProfileContest[];
  practice: Record<Difficulty, { solved: number; total: number }>;
  /** Your latest submissions, on your own profile only; null on anyone else's. */
  recentSubmissions: ProfileSubmission[] | null;
}
