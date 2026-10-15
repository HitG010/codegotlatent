import { type Difficulty, type ProblemListResponse, runRequestSchema, submitRequestSchema } from "@cgl/shared";
import { Router } from "express";
import type { Db } from "../db.js";
import { optionalUser, requireUser } from "../http/auth.js";
import { HttpError } from "../http/errors.js";
import { perUserLimit } from "../http/rate-limit.js";
import type { Sandbox } from "../judge/gojudge.js";
import {
  CONTEST_SLOTS,
  createSubmission,
  firstSeen,
  loadDetail,
  loadJudgeable,
  practiceVisible,
  runOnce,
  statusOf,
  SUBMISSION_FIELDS,
  toView,
} from "./service.js";

export interface ProblemDeps {
  db: Db;
  sandbox: Sandbox;
  accessTokenSecret: string;
}

/** A route parameter as a plain string (Express types allow arrays for wildcards). */
export const param = (params: Record<string, string | string[] | undefined>, name: string) => String(params[name] ?? "");

/** Shared so practice and contest routes spend from the same budget. */
export function judgeLimits() {
  return {
    run: perUserLimit({ max: 20, windowMs: 60_000, message: "That's a lot of runs. Wait a minute and try again." }),
    submit: perUserLimit({ max: 10, windowMs: 60_000, message: "That's a lot of submissions. Wait a minute and try again." }),
  };
}

export function problemsRouter({ db, sandbox, accessTokenSecret }: ProblemDeps, limits = judgeLimits()): Router {
  const router = Router();
  const signedIn = requireUser(accessTokenSecret);
  const maybeSignedIn = optionalUser(accessTokenSecret);

  async function judgeable(slug: string) {
    const problem = await loadJudgeable(db, { slug, ...practiceVisible() });
    if (!problem) throw new HttpError(404, "not_found", "No such problem");
    return { ...problem, slug };
  }

  router.get("/problems", maybeSignedIn, async (req, res) => {
    const problems = await db.problem.findMany({
      where: practiceVisible(),
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
    const progress = new Map(
      req.user
        ? (await db.problemProgress.findMany({ where: { userId: req.user.id }, select: { problemId: true, solvedAt: true } })).map((p) => [
            p.problemId,
            p,
          ])
        : [],
    );

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
    const found = await loadDetail(db, { slug: param(req.params, "slug"), ...practiceVisible() }, req.user?.id);
    if (!found) throw new HttpError(404, "not_found", "No such problem");
    res.json(found.detail);
  });

  router.post("/problems/:slug/runs", signedIn, limits.run, async (req, res) => {
    const body = runRequestSchema.parse(req.body);
    res.json(await runOnce(sandbox, await judgeable(param(req.params, "slug")), body, req.log));
  });

  router.post("/problems/:slug/submissions", signedIn, limits.submit, async (req, res) => {
    const body = submitRequestSchema.parse(req.body);
    const problem = await judgeable(param(req.params, "slug"));
    res.status(201).json(await createSubmission(db, problem, req.user!.id, body, null));
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
