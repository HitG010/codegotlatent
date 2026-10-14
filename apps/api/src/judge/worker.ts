import { checkerSchema, type TestResult, type Verdict } from "@cgl/shared";
import type { Logger } from "pino";
import { finalizeContest, findFinalizable } from "../contests/finalize.js";
import { recordContestSubmission } from "../contests/scoring.js";
import type { Db } from "../db.js";
import type { BlobStore } from "../storage/blob-store.js";
import { execute } from "./execute.js";
import type { GoJudge } from "./gojudge.js";

export interface WorkerDeps {
  db: Db;
  sandbox: GoJudge;
  blobs: BlobStore;
  logger: Logger;
}

const MAX_COMPILE_OUTPUT = 8 * 1024;

/**
 * Takes the oldest queued submission. The submissions table is the queue:
 * SKIP LOCKED lets any number of workers claim jobs without stepping on each other.
 */
export async function claimNext(db: Db): Promise<string | null> {
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    UPDATE "Submission" SET "status" = 'RUNNING'
    WHERE "id" = (
      SELECT "id" FROM "Submission" WHERE "status" = 'QUEUED'
      ORDER BY "createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED
    )
    RETURNING "id"`;
  return rows[0]?.id ?? null;
}

/** Puts submissions a crashed worker left half-judged back in the queue. */
export async function requeueStale(db: Db, olderThanMs: number): Promise<number> {
  const { count } = await db.submission.updateMany({
    where: { status: "RUNNING", createdAt: { lt: new Date(Date.now() - olderThanMs) } },
    data: { status: "QUEUED", testsPassed: 0, results: [] },
  });
  return count;
}

/**
 * Judges one claimed submission and records the result, the user's progress,
 * the problem's counters and, for a contest submission, the standings.
 */
export async function judgeSubmission({ db, sandbox, blobs }: WorkerDeps, id: string): Promise<Verdict> {
  const submission = await db.submission.findUniqueOrThrow({
    where: { id },
    select: {
      userId: true,
      problemId: true,
      contestId: true,
      createdAt: true,
      language: true,
      code: true,
      problemVersion: {
        select: {
          timeLimitMs: true,
          memoryLimitMb: true,
          checker: true,
          tests: { orderBy: { ordinal: "asc" }, select: { inputHash: true, answerHash: true } },
        },
      },
    },
  });
  const version = submission.problemVersion;
  const tests = await Promise.all(
    version.tests.map(async (test) => ({
      input: (await blobs.get(test.inputHash)).toString("utf8"),
      answer: (await blobs.get(test.answerHash)).toString("utf8"),
    })),
  );

  const results: TestResult[] = [];
  const passed = () => results.filter((r) => r.verdict === "ACCEPTED").length;
  const execution = await execute(sandbox, {
    language: submission.language,
    code: submission.code,
    tests,
    limits: { timeLimitMs: version.timeLimitMs, memoryLimitMb: version.memoryLimitMb },
    checker: checkerSchema.parse(version.checker),
    stopOnFailure: true,
    // Record each test as it finishes, so the editor can show progress
    onOutcome: async (outcome) => {
      results.push({ verdict: outcome.verdict, timeMs: outcome.timeMs, memoryKb: outcome.memoryKb });
      await db.submission.update({ where: { id }, data: { results: [...results], testsPassed: passed() } });
    },
  });

  const verdict: Verdict =
    execution.compileError !== null ? "COMPILATION_ERROR" : (results.find((r) => r.verdict !== "ACCEPTED")?.verdict ?? "ACCEPTED");
  const accepted = verdict === "ACCEPTED";
  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.submission.update({
      where: { id },
      data: {
        status: "FINISHED",
        verdict,
        finishedAt: now,
        results: [...results],
        testsPassed: passed(),
        compileOutput: execution.compileError?.slice(0, MAX_COMPILE_OUTPUT) ?? null,
        timeMs: results.length ? Math.max(...results.map((r) => r.timeMs ?? 0)) : null,
        memoryKb: results.length ? Math.max(...results.map((r) => r.memoryKb ?? 0)) : null,
      },
    });
    const key = { userId: submission.userId, problemId: submission.problemId };
    const progress = await tx.problemProgress.findUnique({ where: { userId_problemId: key }, select: { solvedAt: true } });
    const firstSolve = accepted && !progress?.solvedAt;
    await tx.problemProgress.upsert({
      where: { userId_problemId: key },
      create: { ...key, attempts: 1, solvedAt: accepted ? now : null },
      update: { attempts: { increment: 1 }, ...(firstSolve ? { solvedAt: now } : {}) },
    });
    await tx.problem.update({
      where: { id: submission.problemId },
      data: {
        submissionCount: { increment: 1 },
        ...(accepted ? { acceptedCount: { increment: 1 } } : {}),
        ...(firstSolve ? { solverCount: { increment: 1 } } : {}),
      },
    });
    if (submission.contestId) {
      await recordContestSubmission(tx, { ...submission, contestId: submission.contestId }, verdict);
    }
  });
  return verdict;
}

/** Publishes results for every contest that has ended and been fully judged. */
export async function finalizeDue(deps: WorkerDeps): Promise<void> {
  for (const contestId of await findFinalizable(deps.db)) {
    if (await finalizeContest(deps.db, contestId)) deps.logger.info({ contest: contestId }, "results published");
  }
}

/** Runs `concurrency` judging loops, and a loop that publishes finished contests, until stopped. */
export function startWorker(deps: WorkerDeps, { concurrency = 2, idleMs = 250, finalizeEveryMs = 5_000 } = {}) {
  let stopped = false;
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const loop = async () => {
    while (!stopped) {
      let id: string | null = null;
      try {
        id = await claimNext(deps.db);
      } catch (error) {
        deps.logger.error({ err: error }, "claiming a submission failed");
      }
      if (!id) {
        await sleep(idleMs);
        continue;
      }
      try {
        const verdict = await judgeSubmission(deps, id);
        deps.logger.info({ submission: id, verdict }, "judged");
      } catch (error) {
        // The sandbox or storage failed, not the user's code: say so instead of blaming them
        deps.logger.error({ err: error, submission: id }, "judging failed");
        await deps.db.submission
          .update({ where: { id }, data: { status: "FINISHED", verdict: "INTERNAL_ERROR", finishedAt: new Date() } })
          .catch(() => undefined);
      }
    }
  };

  const publisher = async () => {
    while (!stopped) {
      try {
        await finalizeDue(deps);
      } catch (error) {
        deps.logger.error({ err: error }, "publishing contest results failed");
      }
      await sleep(finalizeEveryMs);
    }
  };

  const loops = [...Array.from({ length: concurrency }, loop), publisher()];
  return {
    stop: async () => {
      stopped = true;
      await Promise.all(loops);
    },
  };
}
