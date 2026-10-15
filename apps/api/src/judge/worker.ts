import { setTimeout as sleep } from "node:timers/promises";
import { checkerSchema, type TestResult, type Verdict } from "@cgl/shared";
import type { Logger } from "pino";
import { finalizeContest, findFinalizable } from "../contests/finalize.js";
import { recordContestSubmission } from "../contests/scoring.js";
import type { Db } from "../db.js";
import type { BlobStore } from "../storage/blob-store.js";
import { execute } from "./execute.js";
import { type Sandbox, SandboxUnavailable } from "./gojudge.js";

export interface WorkerDeps {
  db: Db;
  sandbox: Sandbox;
  blobs: BlobStore;
  logger: Logger;
}

/** A worker's hold on one submission. `attempt` fences its writes. */
export interface Claim {
  id: string;
  attempt: number;
}

/** A submission that fails to judge this many times gets INTERNAL_ERROR. */
export const MAX_ATTEMPTS = 5;

/** Another worker took the submission over, so this one must not record anything. */
export class LostClaim extends Error {
  override name = "LostClaim";
}

const MAX_COMPILE_OUTPUT = 8 * 1024;

/** Writes made while judging only land if the claim is still ours. */
const held = (claim: Claim) => ({ id: claim.id, status: "RUNNING" as const, attempts: claim.attempt });

/**
 * Takes the oldest queued submission. The submissions table is the queue:
 * SKIP LOCKED lets any number of workers claim jobs without stepping on each other.
 */
export async function claimNext(db: Db): Promise<Claim | null> {
  const rows = await db.$queryRaw<Array<{ id: string; attempts: number }>>`
    UPDATE "Submission" SET "status" = 'RUNNING', "attempts" = "attempts" + 1, "heartbeatAt" = now()
    WHERE "id" = (
      SELECT "id" FROM "Submission" WHERE "status" = 'QUEUED'
      ORDER BY "createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "attempts"`;
  const row = rows[0];
  return row ? { id: row.id, attempt: row.attempts } : null;
}

/**
 * Puts a submission back in the queue after a failed attempt, or gives up on
 * it with INTERNAL_ERROR once it has used up its attempts. Does nothing if
 * the claim has already been taken over.
 */
export async function releaseClaim(db: Db, claim: Claim): Promise<"requeued" | "failed" | "lost"> {
  const exhausted = claim.attempt >= MAX_ATTEMPTS;
  const { count } = await db.submission.updateMany({
    where: held(claim),
    // The sandbox or storage failed, not the user's code: say so instead of blaming them
    data: exhausted
      ? { status: "FINISHED", verdict: "INTERNAL_ERROR", finishedAt: new Date() }
      : { status: "QUEUED", testsPassed: 0, results: [], heartbeatAt: null },
  });
  return count === 0 ? "lost" : exhausted ? "failed" : "requeued";
}

/**
 * Recovers submissions whose worker went quiet (crashed, or killed mid-judging):
 * back in the queue, or INTERNAL_ERROR if they've used up their attempts.
 * If that worker is in fact alive, its claim no longer matches and its writes are dropped.
 */
export async function requeueStale(db: Db, staleAfterMs: number): Promise<{ requeued: number; failed: number }> {
  const stale = {
    status: "RUNNING" as const,
    OR: [{ heartbeatAt: null }, { heartbeatAt: { lt: new Date(Date.now() - staleAfterMs) } }],
  };
  const failed = await db.submission.updateMany({
    where: { ...stale, attempts: { gte: MAX_ATTEMPTS } },
    data: { status: "FINISHED", verdict: "INTERNAL_ERROR", finishedAt: new Date() },
  });
  const requeued = await db.submission.updateMany({
    where: stale,
    data: { status: "QUEUED", testsPassed: 0, results: [], heartbeatAt: null },
  });
  return { requeued: requeued.count, failed: failed.count };
}

/**
 * Judges one claimed submission and records the result, the user's progress,
 * the problem's counters and, for a contest submission, the standings.
 * Throws LostClaim, having recorded nothing, if another worker took it over.
 */
export async function judgeSubmission({ db, sandbox, blobs }: WorkerDeps, claim: Claim): Promise<Verdict> {
  const { id } = claim;
  const lost = () => new LostClaim(`Submission ${id} was taken over by another worker`);
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
    // Record each test as it finishes, so the editor can show progress; this is also the heartbeat
    onOutcome: async (outcome) => {
      results.push({ verdict: outcome.verdict, timeMs: outcome.timeMs, memoryKb: outcome.memoryKb });
      const { count } = await db.submission.updateMany({
        where: held(claim),
        data: { results: [...results], testsPassed: passed(), heartbeatAt: new Date() },
      });
      if (count === 0) throw lost();
    },
  });

  const verdict: Verdict =
    execution.compileError !== null ? "COMPILATION_ERROR" : (results.find((r) => r.verdict !== "ACCEPTED")?.verdict ?? "ACCEPTED");
  const accepted = verdict === "ACCEPTED";
  const now = new Date();

  await db.$transaction(async (tx) => {
    const { count } = await tx.submission.updateMany({
      where: held(claim),
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
    if (count === 0) throw lost();
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

export interface WorkerOptions {
  concurrency?: number;
  /** Pause between polls of an empty queue. */
  idleMs?: number;
  /** How often to recover stale claims and publish finished contests. */
  maintainEveryMs?: number;
  /**
   * A RUNNING submission without a heartbeat for this long belongs to a dead
   * worker. Must be longer than the slowest compile or single test (about a minute).
   */
  staleAfterMs?: number;
  /** Longest wait between checks on a sandbox that is down. */
  maxBackoffMs?: number;
}

/**
 * Runs `concurrency` judging loops, and a maintenance loop that recovers
 * stale claims and publishes finished contests, until stopped.
 *
 * If the sandbox goes down, submissions wait in the queue rather than failing:
 * the loops stop claiming until it answers again. Each outage costs a
 * submission caught mid-judging one of its MAX_ATTEMPTS.
 */
export function startWorker(
  deps: WorkerDeps,
  { concurrency = 2, idleMs = 250, maintainEveryMs = 5_000, staleAfterMs = 3 * 60_000, maxBackoffMs = 30_000 }: WorkerOptions = {},
) {
  const { db, sandbox, logger } = deps;
  const stopping = new AbortController();
  const pause = (ms: number) => sleep(ms, undefined, { signal: stopping.signal }).catch(() => undefined);

  // Set while the sandbox is down; loops wait on it instead of claiming work they can't judge
  let outage: Promise<void> | null = null;
  const waitForSandbox = async () => {
    const since = Date.now();
    logger.warn("sandbox unavailable; submissions will wait in the queue");
    for (let delay = Math.min(1_000, maxBackoffMs); !stopping.signal.aborted; delay = Math.min(delay * 2, maxBackoffMs)) {
      await pause(delay);
      if (await sandbox.ping()) {
        logger.info({ downForMs: Date.now() - since }, "sandbox is back");
        return;
      }
    }
  };

  const fail = async (claim: Claim, error: unknown) => {
    const log = { err: error, submission: claim.id, attempt: claim.attempt };
    if (error instanceof LostClaim) return logger.warn(log, "claim taken over by another worker");
    const outcome = await releaseClaim(db, claim).catch((err: unknown) => {
      logger.error({ err, submission: claim.id }, "couldn't release a claim; it will be recovered once stale");
      return null;
    });
    if (outcome === "failed") logger.error(log, "judging failed on every attempt; gave up");
    else logger.warn(log, "judging failed; back in the queue");

    if (error instanceof SandboxUnavailable) {
      outage ??= waitForSandbox().finally(() => {
        outage = null;
      });
    } else {
      await pause(1_000);
    }
  };

  const loop = async () => {
    while (!stopping.signal.aborted) {
      if (outage) {
        await outage;
        continue;
      }
      let claim: Claim | null = null;
      try {
        claim = await claimNext(db);
      } catch (error) {
        logger.error({ err: error }, "claiming a submission failed");
        await pause(1_000);
        continue;
      }
      if (!claim) {
        await pause(idleMs);
        continue;
      }
      try {
        const verdict = await judgeSubmission(deps, claim);
        logger.info({ submission: claim.id, verdict }, "judged");
      } catch (error) {
        await fail(claim, error);
      }
    }
  };

  const maintain = async () => {
    while (!stopping.signal.aborted) {
      try {
        const { requeued, failed } = await requeueStale(db, staleAfterMs);
        if (requeued || failed) logger.warn({ requeued, failed }, "recovered submissions from a stalled worker");
      } catch (error) {
        logger.error({ err: error }, "recovering stale submissions failed");
      }
      try {
        await finalizeDue(deps);
      } catch (error) {
        logger.error({ err: error }, "publishing contest results failed");
      }
      await pause(maintainEveryMs);
    }
  };

  const loops = [...Array.from({ length: concurrency }, loop), maintain()];
  return {
    /** Finishes the submissions being judged, then resolves. */
    stop: async () => {
      stopping.abort();
      await Promise.all(loops);
    },
  };
}
