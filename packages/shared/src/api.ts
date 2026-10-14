// Shapes of the problems and judging API, shared by the server and the web app.
import { z } from "zod";
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
