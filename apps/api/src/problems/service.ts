// Problem reading, running and submitting, shared by the practice and contest routes.
import {
  checkerSchema,
  type Language,
  type ProblemDetail,
  type ProblemStatus,
  type RunResponse,
  type Sample,
  type SubmissionView,
  type TestResult,
} from "@cgl/shared";
import type { Db } from "../db.js";
import type { Prisma } from "../generated/prisma/client.js";
import { HttpError } from "../http/errors.js";
import { execute } from "../judge/execute.js";
import type { Sandbox } from "../judge/gojudge.js";

/**
 * Problems a contest is using right now: from its guess window until its
 * results are out. They stay out of practice even if they were public before,
 * so nobody outside the contest can attempt them while it runs.
 */
export const inContestNow = (now: Date): Prisma.ProblemWhereInput => ({
  contests: { some: { contest: { guessOpensAt: { lte: now }, publishedAt: null } } },
});

/** Released to practice and not held by a running contest. */
export const practiceVisible = (now: Date = new Date()): Prisma.ProblemWhereInput => ({
  publishedAt: { lte: now },
  NOT: inContestNow(now),
});

export const statusOf = (progress: { solvedAt: Date | null } | null | undefined): ProblemStatus =>
  progress ? (progress.solvedAt ? "solved" : "attempted") : null;

export const CONTEST_SLOTS = { select: { label: true, contest: { select: { title: true, startsAt: true } } } } as const;

/** "Round 12 · A" for the earliest contest a problem appeared in. */
export function firstSeen(slots: Array<{ label: string; contest: { title: string; startsAt: Date } }>): string | null {
  const first = [...slots].sort((a, b) => a.contest.startsAt.getTime() - b.contest.startsAt.getTime())[0];
  return first ? `${first.contest.title} · ${first.label}` : null;
}

/** The problem page, or null if `where` matches nothing with a published version. */
export async function loadDetail(
  db: Db,
  where: Prisma.ProblemWhereInput,
  userId: string | undefined,
  contest: ProblemDetail["contest"] = null,
): Promise<{ id: string; detail: ProblemDetail } | null> {
  const problem = await db.problem.findFirst({
    where,
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      tags: { select: { name: true }, orderBy: { name: "asc" } },
      contests: CONTEST_SLOTS,
      currentVersion: {
        select: {
          statementHtml: true,
          editorialHtml: true,
          samples: true,
          timeLimitMs: true,
          memoryLimitMb: true,
          _count: { select: { tests: true } },
        },
      },
    },
  });
  const version = problem?.currentVersion;
  if (!problem || !version) return null;
  const progress = userId
    ? await db.problemProgress.findUnique({ where: { userId_problemId: { userId, problemId: problem.id } }, select: { solvedAt: true } })
    : null;
  return {
    id: problem.id,
    detail: {
      slug: problem.slug,
      title: problem.title,
      difficulty: problem.difficulty,
      tags: problem.tags.map((t) => t.name),
      timeLimitMs: version.timeLimitMs,
      memoryLimitMb: version.memoryLimitMb,
      statementHtml: version.statementHtml,
      // An editorial would give the game away mid-contest
      editorialHtml: contest ? null : version.editorialHtml,
      samples: version.samples as unknown as Sample[],
      testCount: version._count.tests,
      from: contest ? `${contest.title} · ${contest.label}` : firstSeen(problem.contests),
      status: statusOf(progress),
      contest,
    },
  };
}

export interface Judgeable {
  id: string;
  version: { id: string; timeLimitMs: number; memoryLimitMb: number; checker: unknown; samples: unknown; testCount: number };
}

export async function loadJudgeable(db: Db, where: Prisma.ProblemWhereInput): Promise<Judgeable | null> {
  const problem = await db.problem.findFirst({
    where,
    select: {
      id: true,
      currentVersion: {
        select: { id: true, timeLimitMs: true, memoryLimitMb: true, checker: true, samples: true, _count: { select: { tests: true } } },
      },
    },
  });
  if (!problem?.currentVersion) return null;
  const { _count, ...version } = problem.currentVersion;
  return { id: problem.id, version: { ...version, testCount: _count.tests } };
}

/** Runs code on the samples, or once on custom input, without recording anything. */
export async function runOnce(
  sandbox: Sandbox,
  problem: Judgeable,
  body: { language: Language; code: string; input?: string | undefined },
  log: { error: (obj: object, msg: string) => void },
): Promise<RunResponse> {
  const custom = body.input !== undefined;
  const samples = problem.version.samples as Sample[];
  const tests = custom ? [{ input: body.input!, answer: "" }] : samples.map((s) => ({ input: s.input, answer: s.output }));

  let execution;
  try {
    execution = await execute(sandbox, {
      language: body.language,
      code: body.code,
      tests,
      limits: { timeLimitMs: problem.version.timeLimitMs, memoryLimitMb: problem.version.memoryLimitMb },
      checker: custom ? null : checkerSchema.parse(problem.version.checker),
      stopOnFailure: false,
    });
  } catch (error) {
    log.error({ err: error }, "sandbox unavailable");
    throw new HttpError(503, "judge_unavailable", "The judge isn't responding. Try again in a moment.");
  }
  if (execution.compileError !== null) return { compileError: execution.compileError, cases: [] };
  return {
    compileError: null,
    cases: execution.outcomes.map((outcome, i) => ({
      input: tests[i]!.input,
      expected: custom ? null : tests[i]!.answer,
      output: outcome.stdout,
      stderr: outcome.stderr.slice(0, 4096),
      // Custom input has no answer: a clean run is just output, not a verdict
      verdict: custom && outcome.verdict === "ACCEPTED" ? null : outcome.verdict,
      reason: outcome.reason,
      timeMs: outcome.timeMs,
      memoryKb: outcome.memoryKb,
    })),
  };
}

export const SUBMISSION_FIELDS = {
  id: true,
  language: true,
  status: true,
  verdict: true,
  testsPassed: true,
  testsTotal: true,
  results: true,
  compileOutput: true,
  timeMs: true,
  memoryKb: true,
  createdAt: true,
} as const;

export function toView(
  submission: {
    id: string;
    language: SubmissionView["language"];
    status: SubmissionView["status"];
    verdict: SubmissionView["verdict"];
    testsPassed: number;
    testsTotal: number;
    results: unknown;
    compileOutput: string | null;
    timeMs: number | null;
    memoryKb: number | null;
    createdAt: Date;
  },
  problemSlug: string,
): SubmissionView {
  return {
    id: submission.id,
    problemSlug,
    language: submission.language,
    status: submission.status,
    verdict: submission.verdict,
    testsPassed: submission.testsPassed,
    testsTotal: submission.testsTotal,
    results: Array.isArray(submission.results) ? (submission.results as TestResult[]) : [],
    compileOutput: submission.compileOutput,
    timeMs: submission.timeMs,
    memoryKb: submission.memoryKb,
    createdAt: submission.createdAt.toISOString(),
  };
}

/** Queues a submission for the judge worker. */
export async function createSubmission(
  db: Db,
  problem: Judgeable & { slug: string },
  userId: string,
  body: { language: Language; code: string },
  contestId: string | null,
): Promise<SubmissionView> {
  const submission = await db.submission.create({
    data: {
      userId,
      problemId: problem.id,
      problemVersionId: problem.version.id,
      contestId,
      language: body.language,
      code: body.code,
      testsTotal: problem.version.testCount,
    },
    select: SUBMISSION_FIELDS,
  });
  return toView(submission, problem.slug);
}
