import type { Verdict } from "@cgl/shared";
import type { Prisma } from "../generated/prisma/client.js";

// Errors that aren't the contestant's wrong answer don't cost penalty time
const NOT_COUNTED: ReadonlySet<Verdict> = new Set(["COMPILATION_ERROR", "INTERNAL_ERROR"]);

/**
 * Applies a judged contest submission to the contestant's standing, inside
 * the worker's transaction. Scoring is ICPC-style: points for each solved
 * problem; penalty is the time to each solve plus `penaltyMinutes` for every
 * wrong attempt before it. Attempts after a solve change nothing.
 */
export async function recordContestSubmission(
  tx: Prisma.TransactionClient,
  submission: { userId: string; problemId: string; contestId: string; createdAt: Date },
  verdict: Verdict,
): Promise<void> {
  const participant = await tx.contestParticipant.findUnique({
    where: { contestId_userId: { contestId: submission.contestId, userId: submission.userId } },
    select: { id: true },
  });
  if (!participant) return; // the API only accepts submissions from registered contestants

  // Serialise updates per contestant: two workers may finish their submissions at once
  await tx.$queryRaw`SELECT "id" FROM "ContestParticipant" WHERE "id" = ${participant.id} FOR UPDATE`;

  const counts = !NOT_COUNTED.has(verdict);
  const key = { participantId_problemId: { participantId: participant.id, problemId: submission.problemId } };
  const current = await tx.contestProblemResult.findUnique({ where: key, select: { solvedAt: true } });
  if (!current?.solvedAt && counts) {
    const accepted = verdict === "ACCEPTED";
    await tx.contestProblemResult.upsert({
      where: key,
      create: {
        participantId: participant.id,
        problemId: submission.problemId,
        wrongAttempts: accepted ? 0 : 1,
        solvedAt: accepted ? submission.createdAt : null,
      },
      update: accepted ? { solvedAt: submission.createdAt } : { wrongAttempts: { increment: 1 } },
    });
  }

  // Recompute the totals from the per-problem results, so they can never drift
  const contest = await tx.contest.findUniqueOrThrow({
    where: { id: submission.contestId },
    select: { startsAt: true, penaltyMinutes: true, problems: { select: { problemId: true, points: true } } },
  });
  const points = new Map(contest.problems.map((p) => [p.problemId, p.points]));
  const results = await tx.contestProblemResult.findMany({ where: { participantId: participant.id } });
  let score = 0;
  let penaltyTimeMs = 0;
  let solvedCount = 0;
  for (const result of results) {
    if (!result.solvedAt) continue;
    solvedCount++;
    score += points.get(result.problemId) ?? 0;
    penaltyTimeMs += result.solvedAt.getTime() - contest.startsAt.getTime() + result.wrongAttempts * contest.penaltyMinutes * 60_000;
  }
  await tx.contestParticipant.update({
    where: { id: participant.id },
    data: { score, penaltyTimeMs, solvedCount, ...(counts ? { submissionCount: { increment: 1 } } : {}) },
  });
}
