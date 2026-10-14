import { renderMarkdown } from "@cgl/problem-package";
import {
  type ContestDetail,
  type ContestListResponse,
  type ContestPhase,
  type ContestProblemSummary,
  type ContestResults,
  type ContestSummary,
  type PercentileGuess,
  percentileGuessSchema,
  phaseAt,
  type ProblemStatus,
  type RatingChange,
  runRequestSchema,
  submitRequestSchema,
} from "@cgl/shared";
import { Router } from "express";
import type { Db } from "../db.js";
import { optionalUser, requireUser } from "../http/auth.js";
import { HttpError } from "../http/errors.js";
import type { GoJudge } from "../judge/gojudge.js";
import { judgeLimits, param } from "../problems/routes.js";
import { createSubmission, loadDetail, loadJudgeable, runOnce, SUBMISSION_FIELDS, toView } from "../problems/service.js";

export interface ContestDeps {
  db: Db;
  sandbox: GoJudge;
  accessTokenSecret: string;
}

const CONTEST_FIELDS = {
  id: true,
  slug: true,
  title: true,
  isRated: true,
  guessOpensAt: true,
  startsAt: true,
  endsAt: true,
  publishedAt: true,
  _count: { select: { participants: true, problems: true } },
} as const;

type ContestRow = {
  id: string;
  slug: string;
  title: string;
  isRated: boolean;
  guessOpensAt: Date;
  startsAt: Date;
  endsAt: Date;
  publishedAt: Date | null;
  _count: { participants: number; problems: number };
};

type Participant = { id: string; guessBest: number | null; guessWorst: number | null };

const minutes = (ms: number) => Math.floor(ms / 60_000);

const guessOf = (p: { guessBest: number | null; guessWorst: number | null }): PercentileGuess | null =>
  p.guessBest !== null && p.guessWorst !== null ? { best: p.guessBest, worst: p.guessWorst } : null;

function summarize(contest: ContestRow, participant: Participant | null | undefined, signedIn: boolean, now: Date): ContestSummary {
  return {
    slug: contest.slug,
    title: contest.title,
    phase: phaseAt(contest, now),
    guessOpensAt: contest.guessOpensAt.toISOString(),
    startsAt: contest.startsAt.toISOString(),
    endsAt: contest.endsAt.toISOString(),
    isRated: contest.isRated,
    registered: contest._count.participants,
    problemCount: contest._count.problems,
    you: signedIn ? { registered: Boolean(participant), guess: participant ? guessOf(participant) : null } : null,
  };
}

const PHASE_ORDER: Record<ContestPhase, number> = { SCHEDULED: 0, GUESS_WINDOW: 1, LIVE: 2, JUDGING: 3, RESULTS: 4 };
const ended = (phase: ContestPhase) => PHASE_ORDER[phase] >= PHASE_ORDER.JUDGING;

export function contestsRouter({ db, sandbox, accessTokenSecret }: ContestDeps, limits = judgeLimits()): Router {
  const router = Router();
  const signedIn = requireUser(accessTokenSecret);
  const maybeSignedIn = optionalUser(accessTokenSecret);

  async function findContest(slug: string) {
    const contest = await db.contest.findFirst({
      where: { slug, isPublic: true },
      select: { ...CONTEST_FIELDS, description: true, rules: true, penaltyMinutes: true, maxParticipants: true },
    });
    if (!contest) throw new HttpError(404, "not_found", "No such contest");
    return { ...contest, phase: phaseAt(contest) };
  }

  const findParticipant = (contestId: string, userId: string | undefined) =>
    userId
      ? db.contestParticipant.findUnique({
          where: { contestId_userId: { contestId, userId } },
          select: { id: true, guessBest: true, guessWorst: true, score: true, penaltyTimeMs: true, solvedCount: true },
        })
      : null;

  /**
   * The contest and problem slot behind /contests/:slug/problems/:label, if
   * the caller may open it: registered contestants while it's live, anyone
   * once it's over, nobody before it starts.
   */
  async function openSlot(slug: string, label: string, userId: string | undefined) {
    const contest = await findContest(slug);
    const slot = await db.contestProblem.findUnique({
      where: { contestId_label: { contestId: contest.id, label } },
      select: { problemId: true, label: true, points: true },
    });
    if (!slot || PHASE_ORDER[contest.phase] < PHASE_ORDER.LIVE) throw new HttpError(404, "not_found", "No such problem in this contest");
    const participant = await findParticipant(contest.id, userId);
    if (contest.phase === "LIVE" && !participant) {
      throw new HttpError(403, "not_registered", "Only registered contestants can open this problem while the contest is live.");
    }
    return { contest, slot, participant };
  }

  /** Running and submitting: registered contestants, while the contest is live. */
  async function judgeableSlot(slug: string, label: string, userId: string) {
    const { contest, slot, participant } = await openSlot(slug, label, userId);
    if (contest.phase !== "LIVE") {
      throw new HttpError(
        403,
        "contest_over",
        contest.phase === "RESULTS"
          ? "The contest is over. This problem is in practice now."
          : "The contest is over. This problem joins practice once results are out.",
      );
    }
    const problem = await loadJudgeable(db, { id: slot.problemId });
    if (!problem) throw new HttpError(404, "not_found", "No such problem in this contest");
    const { slug: problemSlug } = await db.problem.findUniqueOrThrow({ where: { id: slot.problemId }, select: { slug: true } });
    return { contest, participant: participant!, problem: { ...problem, slug: problemSlug } };
  }

  router.get("/contests", maybeSignedIn, async (req, res) => {
    const now = new Date();
    const contests = await db.contest.findMany({ where: { isPublic: true }, orderBy: { startsAt: "desc" }, take: 100, select: CONTEST_FIELDS });
    const mine = new Map(
      req.user
        ? (
            await db.contestParticipant.findMany({
              where: { userId: req.user.id, contestId: { in: contests.map((c) => c.id) } },
              select: { id: true, contestId: true, guessBest: true, guessWorst: true },
            })
          ).map((p) => [p.contestId, p])
        : [],
    );
    res.json({ contests: contests.map((c) => summarize(c, mine.get(c.id), Boolean(req.user), now)) } satisfies ContestListResponse);
  });

  router.get("/contests/:slug", maybeSignedIn, async (req, res) => {
    const contest = await findContest(param(req.params, "slug"));
    const participant = await findParticipant(contest.id, req.user?.id);
    const showProblems = contest.phase === "LIVE" ? Boolean(participant) : ended(contest.phase);

    let problems: ContestProblemSummary[] | null = null;
    if (showProblems) {
      const slots = await db.contestProblem.findMany({
        where: { contestId: contest.id },
        orderBy: { label: "asc" },
        select: { problemId: true, label: true, points: true, problem: { select: { title: true, slug: true } } },
      });
      const solves = await db.contestProblemResult.groupBy({
        by: ["problemId"],
        where: { participant: { contestId: contest.id }, solvedAt: { not: null } },
        _count: { _all: true },
      });
      const solvedBy = new Map(solves.map((s) => [s.problemId, s._count._all]));
      const mine = new Map(
        participant
          ? (await db.contestProblemResult.findMany({ where: { participantId: participant.id } })).map((r) => [r.problemId, r])
          : [],
      );
      problems = slots.map((slot) => {
        const result = mine.get(slot.problemId);
        const you: ProblemStatus = result ? (result.solvedAt ? "solved" : "attempted") : null;
        return {
          label: slot.label,
          slug: slot.problem.slug,
          title: slot.problem.title,
          points: slot.points,
          solvedBy: solvedBy.get(slot.problemId) ?? 0,
          you,
        };
      });
    }

    const live = PHASE_ORDER[contest.phase] >= PHASE_ORDER.LIVE;
    const detail: ContestDetail = {
      ...summarize(contest, participant, Boolean(req.user), new Date()),
      phase: contest.phase,
      descriptionHtml: contest.description ? await renderMarkdown(contest.description) : null,
      rulesHtml: contest.rules ? await renderMarkdown(contest.rules) : null,
      penaltyMinutes: contest.penaltyMinutes,
      maxParticipants: contest.maxParticipants,
      problems,
      standing:
        participant && live
          ? { points: participant.score, penaltyMinutes: minutes(participant.penaltyTimeMs), solved: participant.solvedCount }
          : null,
    };
    res.json(detail);
  });

  router.post("/contests/:slug/registration", signedIn, async (req, res) => {
    const contest = await findContest(param(req.params, "slug"));
    if (contest.phase !== "SCHEDULED") throw new HttpError(409, "registration_closed", "Registration has closed for this contest.");
    const userId = req.user!.id;
    await db.$transaction(async (tx) => {
      // Lock the contest row so the capacity check and the insert can't interleave
      await tx.$queryRaw`SELECT "id" FROM "Contest" WHERE "id" = ${contest.id} FOR UPDATE`;
      const existing = await tx.contestParticipant.findUnique({ where: { contestId_userId: { contestId: contest.id, userId } } });
      if (existing) return;
      if (contest.maxParticipants !== null) {
        const count = await tx.contestParticipant.count({ where: { contestId: contest.id } });
        if (count >= contest.maxParticipants) throw new HttpError(409, "contest_full", "This contest is full.");
      }
      await tx.contestParticipant.create({ data: { contestId: contest.id, userId } });
    });
    res.status(204).end();
  });

  router.delete("/contests/:slug/registration", signedIn, async (req, res) => {
    const contest = await findContest(param(req.params, "slug"));
    if (contest.phase !== "SCHEDULED") {
      throw new HttpError(409, "registration_closed", "Registration has closed, so you can't withdraw now.");
    }
    await db.contestParticipant.deleteMany({ where: { contestId: contest.id, userId: req.user!.id } });
    res.status(204).end();
  });

  router.put("/contests/:slug/guess", signedIn, async (req, res) => {
    const guess = percentileGuessSchema.parse(req.body);
    const contest = await findContest(param(req.params, "slug"));
    if (contest.phase !== "GUESS_WINDOW") {
      throw new HttpError(
        409,
        "guess_window_closed",
        contest.phase === "SCHEDULED" ? "The guess window hasn't opened yet." : "The guess window has closed.",
      );
    }
    const { count } = await db.contestParticipant.updateMany({
      where: { contestId: contest.id, userId: req.user!.id },
      data: { guessBest: guess.best, guessWorst: guess.worst, guessedAt: new Date() },
    });
    if (count === 0) throw new HttpError(403, "not_registered", "Only registered contestants can lock in a guess.");
    res.json(guess);
  });

  router.get("/contests/:slug/problems/:label", maybeSignedIn, async (req, res) => {
    const { contest, slot, participant } = await openSlot(param(req.params, "slug"), param(req.params, "label"), req.user?.id);
    const found = await loadDetail(db, { id: slot.problemId }, req.user?.id, {
      slug: contest.slug,
      title: contest.title,
      label: slot.label,
      points: slot.points,
      endsAt: contest.endsAt.toISOString(),
    });
    if (!found) throw new HttpError(404, "not_found", "No such problem in this contest");
    if (participant) {
      // Inside a contest, "solved" means solved in this contest
      const result = await db.contestProblemResult.findUnique({
        where: { participantId_problemId: { participantId: participant.id, problemId: slot.problemId } },
        select: { solvedAt: true },
      });
      found.detail.status = result ? (result.solvedAt ? "solved" : "attempted") : null;
    }
    res.json(found.detail);
  });

  router.post("/contests/:slug/problems/:label/runs", signedIn, limits.run, async (req, res) => {
    const body = runRequestSchema.parse(req.body);
    const { problem } = await judgeableSlot(param(req.params, "slug"), param(req.params, "label"), req.user!.id);
    res.json(await runOnce(sandbox, problem, body, req.log));
  });

  router.post("/contests/:slug/problems/:label/submissions", signedIn, limits.submit, async (req, res) => {
    const body = submitRequestSchema.parse(req.body);
    const { contest, problem } = await judgeableSlot(param(req.params, "slug"), param(req.params, "label"), req.user!.id);
    res.status(201).json(await createSubmission(db, problem, req.user!.id, body, contest.id));
  });

  router.get("/contests/:slug/problems/:label/submissions", signedIn, async (req, res) => {
    const { contest, slot } = await openSlot(param(req.params, "slug"), param(req.params, "label"), req.user!.id);
    const submissions = await db.submission.findMany({
      where: { userId: req.user!.id, contestId: contest.id, problemId: slot.problemId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { ...SUBMISSION_FIELDS, problem: { select: { slug: true } } },
    });
    res.json({ submissions: submissions.map((s) => toView(s, s.problem.slug)) });
  });

  router.get("/contests/:slug/results", maybeSignedIn, async (req, res) => {
    const contest = await findContest(param(req.params, "slug"));
    if (contest.phase !== "RESULTS") throw new HttpError(409, "results_pending", "Results aren't out yet.");

    const slots = await db.contestProblem.findMany({
      where: { contestId: contest.id },
      orderBy: { label: "asc" },
      select: { problemId: true, label: true, points: true, problem: { select: { title: true } } },
    });
    const participants = await db.contestParticipant.findMany({
      where: { contestId: contest.id, rank: { not: null } },
      orderBy: [{ rank: "asc" }, { registeredAt: "asc" }],
      select: {
        userId: true,
        rank: true,
        percentile: true,
        intervalScore: true,
        latentDelta: true,
        formDelta: true,
        score: true,
        penaltyTimeMs: true,
        solvedCount: true,
        guessBest: true,
        guessWorst: true,
        user: { select: { username: true } },
        results: { select: { problemId: true, wrongAttempts: true, solvedAt: true } },
      },
    });

    const rows = participants.map((p) => {
      const results = new Map(p.results.map((r) => [r.problemId, r]));
      return {
        rank: p.rank!,
        handle: p.user.username,
        you: p.userId === req.user?.id,
        points: p.score,
        penaltyMinutes: minutes(p.penaltyTimeMs),
        cells: slots.map((slot) => {
          const r = results.get(slot.problemId);
          return {
            label: slot.label,
            solved: Boolean(r?.solvedAt),
            wrongAttempts: r?.wrongAttempts ?? 0,
            minute: r?.solvedAt ? minutes(r.solvedAt.getTime() - contest.startsAt.getTime()) : null,
          };
        }),
        guess: guessOf(p),
        finish: p.percentile!,
        latentDelta: p.latentDelta ?? 0,
        formDelta: p.formDelta ?? 0,
      };
    });

    let you: ContestResults["you"] = null;
    const me = participants.find((p) => p.userId === req.user?.id);
    if (me) {
      const events = await db.ratingEvent.findMany({ where: { userId: me.userId, contestId: contest.id } });
      const change = (kind: "LATENT" | "FORM"): RatingChange | null => {
        const event = events.find((e) => e.kind === kind);
        return event ? { before: event.before, after: event.after, delta: event.after - event.before } : null;
      };
      you = {
        rank: me.rank!,
        finish: me.percentile!,
        guess: guessOf(me),
        predictionScore: me.intervalScore,
        latent: change("LATENT"),
        form: change("FORM"),
        points: me.score,
        solved: me.solvedCount,
        penaltyMinutes: minutes(me.penaltyTimeMs),
      };
    }

    res.json({
      contest: {
        slug: contest.slug,
        title: contest.title,
        field: participants.length,
        isRated: contest.isRated,
        problems: slots.map((s) => ({ label: s.label, title: s.problem.title, points: s.points })),
      },
      you,
      rows,
    } satisfies ContestResults);
  });

  return router;
}
