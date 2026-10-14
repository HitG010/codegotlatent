import {
  checkerSchema,
  type Difficulty,
  type ProblemDetail,
  type ProblemListResponse,
  type ProblemStatus,
  type RunResponse,
  runRequestSchema,
  type Sample,
  submitRequestSchema,
  type SubmissionView,
  type TestResult,
} from "@cgl/shared";
import { Router } from "express";
import type { Db } from "../db.js";
import { optionalUser, requireUser } from "../http/auth.js";
import { HttpError } from "../http/errors.js";
import { perUserLimit } from "../http/rate-limit.js";
import { execute } from "../judge/execute.js";
import type { GoJudge } from "../judge/gojudge.js";

export interface ProblemDeps {
  db: Db;
  sandbox: GoJudge;
  accessTokenSecret: string;
}

const isPublished = () => ({ publishedAt: { lte: new Date() } });

/** A route parameter as a plain string (Express types allow arrays for wildcards). */
const param = (params: Record<string, string | string[] | undefined>, name: string) => String(params[name] ?? "");

const statusOf = (progress: { solvedAt: Date | null } | undefined): ProblemStatus =>
  progress ? (progress.solvedAt ? "solved" : "attempted") : null;

/** "Round 12 · A" for the earliest contest a problem appeared in. */
function firstSeen(slots: Array<{ label: string; contest: { title: string; startsAt: Date } }>): string | null {
  const first = [...slots].sort((a, b) => a.contest.startsAt.getTime() - b.contest.startsAt.getTime())[0];
  return first ? `${first.contest.title} · ${first.label}` : null;
}

const CONTEST_SLOTS = { select: { label: true, contest: { select: { title: true, startsAt: true } } } } as const;

function toView(
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

const SUBMISSION_FIELDS = {
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

export function problemsRouter({ db, sandbox, accessTokenSecret }: ProblemDeps): Router {
  const router = Router();
  const signedIn = requireUser(accessTokenSecret);
  const maybeSignedIn = optionalUser(accessTokenSecret);
  const runLimit = perUserLimit({ max: 20, windowMs: 60_000, message: "That's a lot of runs. Wait a minute and try again." });
  const submitLimit = perUserLimit({ max: 10, windowMs: 60_000, message: "That's a lot of submissions. Wait a minute and try again." });

  async function findPublished(slug: string) {
    const problem = await db.problem.findFirst({
      where: { slug, ...isPublished() },
      select: {
        id: true,
        currentVersion: {
          select: {
            id: true,
            timeLimitMs: true,
            memoryLimitMb: true,
            checker: true,
            samples: true,
            _count: { select: { tests: true } },
          },
        },
      },
    });
    if (!problem?.currentVersion) throw new HttpError(404, "not_found", "No such problem");
    return { id: problem.id, version: problem.currentVersion };
  }

  router.get("/problems", maybeSignedIn, async (req, res) => {
    const problems = await db.problem.findMany({
      where: isPublished(),
      orderBy: [{ publishedAt: "desc" }, { title: "asc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        submissionCount: true,
        acceptedCount: true,
        solverCount: true,
        tags: { select: { name: true }, orderBy: { name: "asc" } },
        contests: CONTEST_SLOTS,
      },
    });
    const progress = req.user
      ? new Map(
          (await db.problemProgress.findMany({ where: { userId: req.user.id }, select: { problemId: true, solvedAt: true } })).map((p) => [
            p.problemId,
            p,
          ]),
        )
      : new Map<string, { solvedAt: Date | null }>();

    const totals: ProblemListResponse["totals"] = { EASY: { total: 0, solved: 0 }, MEDIUM: { total: 0, solved: 0 }, HARD: { total: 0, solved: 0 } };
    const list = problems.map((problem) => {
      const status = statusOf(progress.get(problem.id));
      const bucket = totals[problem.difficulty as Difficulty];
      bucket.total++;
      if (status === "solved") bucket.solved++;
      return {
        slug: problem.slug,
        title: problem.title,
        difficulty: problem.difficulty,
        tags: problem.tags.map((t) => t.name),
        acceptance: problem.submissionCount ? Math.round((100 * problem.acceptedCount) / problem.submissionCount) : null,
        solvers: problem.solverCount,
        status,
        from: firstSeen(problem.contests),
      };
    });
    res.json({ problems: list, totals } satisfies ProblemListResponse);
  });

  router.get("/problems/:slug", maybeSignedIn, async (req, res) => {
    const problem = await db.problem.findFirst({
      where: { slug: param(req.params, "slug"), ...isPublished() },
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
    if (!problem || !version) throw new HttpError(404, "not_found", "No such problem");
    const progress = req.user
      ? await db.problemProgress.findUnique({ where: { userId_problemId: { userId: req.user.id, problemId: problem.id } }, select: { solvedAt: true } })
      : null;

    res.json({
      slug: problem.slug,
      title: problem.title,
      difficulty: problem.difficulty,
      tags: problem.tags.map((t) => t.name),
      timeLimitMs: version.timeLimitMs,
      memoryLimitMb: version.memoryLimitMb,
      statementHtml: version.statementHtml,
      editorialHtml: version.editorialHtml,
      samples: version.samples as unknown as Sample[],
      testCount: version._count.tests,
      from: firstSeen(problem.contests),
      status: statusOf(progress ?? undefined),
    } satisfies ProblemDetail);
  });

  router.post("/problems/:slug/runs", signedIn, runLimit, async (req, res) => {
    const body = runRequestSchema.parse(req.body);
    const { version } = await findPublished(param(req.params, "slug"));
    const custom = body.input !== undefined;
    const samples = version.samples as unknown as Sample[];
    const tests = custom ? [{ input: body.input!, answer: "" }] : samples.map((s) => ({ input: s.input, answer: s.output }));

    let execution;
    try {
      execution = await execute(sandbox, {
        language: body.language,
        code: body.code,
        tests,
        limits: { timeLimitMs: version.timeLimitMs, memoryLimitMb: version.memoryLimitMb },
        checker: custom ? null : checkerSchema.parse(version.checker),
        stopOnFailure: false,
      });
    } catch (error) {
      req.log.error({ err: error }, "sandbox unavailable");
      throw new HttpError(503, "judge_unavailable", "The judge isn't responding. Try again in a moment.");
    }
    if (execution.compileError !== null) {
      res.json({ compileError: execution.compileError, cases: [] } satisfies RunResponse);
      return;
    }
    res.json({
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
    } satisfies RunResponse);
  });

  router.post("/problems/:slug/submissions", signedIn, submitLimit, async (req, res) => {
    const body = submitRequestSchema.parse(req.body);
    const slug = param(req.params, "slug");
    const problem = await findPublished(slug);
    const submission = await db.submission.create({
      data: {
        userId: req.user!.id,
        problemId: problem.id,
        problemVersionId: problem.version.id,
        language: body.language,
        code: body.code,
        testsTotal: problem.version._count.tests,
      },
      select: SUBMISSION_FIELDS,
    });
    res.status(201).json(toView(submission, slug));
  });

  router.get("/problems/:slug/submissions", signedIn, async (req, res) => {
    const slug = param(req.params, "slug");
    const submissions = await db.submission.findMany({
      where: { userId: req.user!.id, problem: { slug } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: SUBMISSION_FIELDS,
    });
    res.json({ submissions: submissions.map((s) => toView(s, slug)) });
  });

  router.get("/submissions/:id", signedIn, async (req, res) => {
    const submission = await db.submission.findFirst({
      // Only your own, for now
      where: { id: param(req.params, "id"), userId: req.user!.id },
      select: { ...SUBMISSION_FIELDS, problem: { select: { slug: true } } },
    });
    if (!submission) throw new HttpError(404, "not_found", "No such submission");
    res.json(toView(submission, submission.problem.slug));
  });

  return router;
}
