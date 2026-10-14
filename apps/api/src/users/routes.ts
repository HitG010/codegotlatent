import type { Difficulty, ProfileContest, RatingChange, UserProfile } from "@cgl/shared";
import { Router } from "express";
import type { Db } from "../db.js";
import { optionalUser } from "../http/auth.js";
import { HttpError } from "../http/errors.js";
import { param } from "../problems/routes.js";
import { practiceVisible } from "../problems/service.js";

export interface UserDeps {
  db: Db;
  accessTokenSecret: string;
}

/**
 * Public profiles. Everything here is already public elsewhere (results
 * boards, the problem set); nothing about a running contest is shown, so a
 * profile can't leak which problems a live round is using.
 */
export function usersRouter({ db, accessTokenSecret }: UserDeps): Router {
  const router = Router();

  router.get("/users/:handle", optionalUser(accessTokenSecret), async (req, res) => {
    const user = await db.user.findUnique({
      where: { username: param(req.params, "handle").toLowerCase() },
      select: { id: true, username: true, createdAt: true, latentRating: true, latentContests: true, formRating: true, formContests: true },
    });
    if (!user) throw new HttpError(404, "not_found", "No such player");
    const you = req.user?.id === user.id;

    // Rounds with published results that this player was ranked in
    const entries = await db.contestParticipant.findMany({
      where: { userId: user.id, rank: { not: null }, contest: { isPublic: true, publishedAt: { not: null } } },
      orderBy: { contest: { startsAt: "asc" } },
      select: {
        contestId: true,
        rank: true,
        percentile: true,
        intervalScore: true,
        guessBest: true,
        guessWorst: true,
        score: true,
        solvedCount: true,
        contest: { select: { slug: true, title: true, startsAt: true } },
      },
    });
    const contestIds = entries.map((e) => e.contestId);
    const fields = await db.contestParticipant.groupBy({
      by: ["contestId"],
      where: { contestId: { in: contestIds }, rank: { not: null } },
      _count: { _all: true },
    });
    const fieldOf = new Map(fields.map((f) => [f.contestId, f._count._all]));
    const events = await db.ratingEvent.findMany({ where: { userId: user.id, contestId: { in: contestIds } } });
    const change = (contestId: string, kind: "LATENT" | "FORM"): RatingChange | null => {
      const event = events.find((e) => e.contestId === contestId && e.kind === kind);
      return event ? { before: event.before, after: event.after, delta: event.after - event.before } : null;
    };

    const contests: ProfileContest[] = entries.map((e) => ({
      slug: e.contest.slug,
      title: e.contest.title,
      startsAt: e.contest.startsAt.toISOString(),
      field: fieldOf.get(e.contestId) ?? 0,
      rank: e.rank!,
      finish: e.percentile!,
      guess: e.guessBest !== null && e.guessWorst !== null ? { best: e.guessBest, worst: e.guessWorst } : null,
      predictionScore: e.intervalScore,
      points: e.score,
      solved: e.solvedCount,
      latent: change(e.contestId, "LATENT"),
      form: change(e.contestId, "FORM"),
    }));

    // Practice progress counts only problems that are in practice right now
    const visible = practiceVisible();
    const problems = await db.problem.findMany({ where: visible, select: { id: true, difficulty: true } });
    const solved = new Set(
      (
        await db.problemProgress.findMany({
          where: { userId: user.id, solvedAt: { not: null }, problemId: { in: problems.map((p) => p.id) } },
          select: { problemId: true },
        })
      ).map((p) => p.problemId),
    );
    const practice: UserProfile["practice"] = { EASY: { solved: 0, total: 0 }, MEDIUM: { solved: 0, total: 0 }, HARD: { solved: 0, total: 0 } };
    for (const problem of problems) {
      const bucket = practice[problem.difficulty as Difficulty];
      bucket.total++;
      if (solved.has(problem.id)) bucket.solved++;
    }

    // Submissions are private to their author, so only your own profile lists them
    const recentSubmissions = you
      ? (
          await db.submission.findMany({
            where: { userId: user.id, problem: visible },
            orderBy: { createdAt: "desc" },
            take: 8,
            select: { id: true, language: true, status: true, verdict: true, createdAt: true, problem: { select: { slug: true, title: true } } },
          })
        ).map((s) => ({
          id: s.id,
          problemSlug: s.problem.slug,
          problemTitle: s.problem.title,
          language: s.language,
          status: s.status,
          verdict: s.verdict,
          createdAt: s.createdAt.toISOString(),
        }))
      : null;

    res.json({
      handle: user.username,
      joinedAt: user.createdAt.toISOString(),
      you,
      latent: { rating: user.latentRating, contests: user.latentContests },
      form: { rating: user.formRating, contests: user.formContests },
      contests,
      practice,
      recentSubmissions,
    } satisfies UserProfile);
  });

  return router;
}
