import { type ContestEntry, rateContest } from "@cgl/rating";
import type { Db } from "../db.js";

/** Contests that have ended, aren't published, and have no submission still being judged. */
export async function findFinalizable(db: Db, now: Date = new Date()): Promise<string[]> {
  const contests = await db.contest.findMany({
    where: { endsAt: { lte: now }, publishedAt: null, submissions: { none: { status: { not: "FINISHED" } } } },
    select: { id: true },
    orderBy: { endsAt: "asc" },
  });
  return contests.map((c) => c.id);
}

/**
 * Turns a finished contest into results: standings, Latent and Form changes
 * from @cgl/rating, rating history, and releases its problems to practice.
 * One transaction; RatingEvent's unique key means a second run can't apply
 * ratings twice. Returns false if the contest was already published.
 */
export async function finalizeContest(db: Db, contestId: string, now: Date = new Date()): Promise<boolean> {
  return db.$transaction(
    async (tx) => {
      // Lock the contest so two workers can't finalize it at the same time
      const [locked] = await tx.$queryRaw<Array<{ publishedAt: Date | null }>>`
        SELECT "publishedAt" FROM "Contest" WHERE "id" = ${contestId} FOR UPDATE`;
      if (!locked || locked.publishedAt) return false;

      const contest = await tx.contest.findUniqueOrThrow({
        where: { id: contestId },
        select: {
          isRated: true,
          problems: { select: { problemId: true } },
          participants: {
            select: {
              id: true,
              userId: true,
              score: true,
              penaltyTimeMs: true,
              solvedCount: true,
              submissionCount: true,
              guessBest: true,
              guessWorst: true,
              user: { select: { latentRating: true, latentContests: true, formRating: true, formContests: true } },
            },
          },
        },
      });

      const entries: ContestEntry[] = contest.participants.map((p) => ({
        userId: p.userId,
        score: p.score,
        penaltyTimeMs: p.penaltyTimeMs,
        solvedCount: p.solvedCount,
        submissionCount: p.submissionCount,
        guess: p.guessBest !== null && p.guessWorst !== null ? { best: p.guessBest, worst: p.guessWorst } : null,
        latent: { rating: p.user.latentRating, ratedContests: p.user.latentContests },
        form: { rating: p.user.formRating, ratedContests: p.user.formContests },
      }));
      const results = rateContest(entries);

      for (const [i, result] of results.entries()) {
        const participant = contest.participants[i]!;
        if (result.status === "no-show") continue;

        const latentDelta = contest.isRated ? result.latentDelta : 0;
        const formDelta = contest.isRated ? result.formDelta : 0;
        await tx.contestParticipant.update({
          where: { id: participant.id },
          data: { rank: result.rank, percentile: result.percentile, intervalScore: result.intervalScore, latentDelta, formDelta },
        });
        if (!contest.isRated) continue;

        const user = participant.user;
        await tx.ratingEvent.createMany({
          data: [
            { userId: participant.userId, contestId, kind: "LATENT", before: user.latentRating, after: user.latentRating + latentDelta },
            { userId: participant.userId, contestId, kind: "FORM", before: user.formRating, after: user.formRating + formDelta },
          ],
        });
        await tx.user.update({
          where: { id: participant.userId },
          data: {
            latentRating: { increment: latentDelta },
            formRating: { increment: formDelta },
            latentContests: { increment: 1 },
            formContests: { increment: 1 },
          },
        });
      }

      await tx.contest.update({ where: { id: contestId }, data: { publishedAt: now, phase: "RESULTS" } });
      // Contest problems join the practice set; already-public ones keep their date
      await tx.problem.updateMany({
        where: { id: { in: contest.problems.map((p) => p.problemId) }, publishedAt: null },
        data: { publishedAt: now },
      });
      return true;
    },
    { timeout: 30_000 },
  );
}
