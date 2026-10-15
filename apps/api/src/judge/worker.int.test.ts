import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPackage } from "@cgl/problem-package";
import { pino } from "pino";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "../db.js";
import { publishProblem } from "../problems/publish.js";
import { FsBlobStore } from "../storage/blob-store.js";
import { type Sandbox, type SandboxResult, SandboxUnavailable } from "./gojudge.js";
import { claimNext, judgeSubmission, LostClaim, MAX_ATTEMPTS, requeueStale, startWorker, type WorkerDeps } from "./worker.js";

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];
const FIXTURE = join(import.meta.dirname, "../../../../packages/problem-package/fixtures/self-aware");

// Every program "crashes", which is enough to finish judging without a real sandbox
const CRASHED: SandboxResult = { status: "Signalled", exitStatus: 11, timeMs: 1, memoryKb: 1, stdout: "", stderr: "", fileIds: {} };

function fakeSandbox(run: () => Promise<SandboxResult>, ping: () => boolean = () => true): Sandbox {
  return { run, release: async () => undefined, ping: async () => ping() };
}

describe.skipIf(!TEST_DATABASE_URL)("judging worker (database)", () => {
  let db: Db;
  let scratch: string;
  let deps: Omit<WorkerDeps, "sandbox">;
  let submit: (language?: "cpp" | "python") => Promise<string>;

  beforeAll(async () => {
    db = createDb(TEST_DATABASE_URL!);
    await db.$executeRawUnsafe('TRUNCATE "User", "Problem", "Blob", "Tag" CASCADE');
    scratch = await mkdtemp(join(tmpdir(), "cgl-worker-"));
    const blobs = new FsBlobStore(join(scratch, "blobs"));
    deps = { db, blobs, logger: pino({ level: "silent" }) };

    const { problemId } = await publishProblem(db, blobs, await loadPackage(FIXTURE), { listInPractice: true });
    const problem = await db.problem.findUniqueOrThrow({ where: { id: problemId }, select: { currentVersionId: true } });
    const user = await db.user.create({ data: { email: "riya@example.com", username: "riya" } });
    submit = async (language = "python") =>
      (
        await db.submission.create({
          data: { userId: user.id, problemId, problemVersionId: problem.currentVersionId!, language, code: "print(1)", testsTotal: 5 },
        })
      ).id;
  });

  beforeEach(async () => {
    await db.submission.deleteMany();
    await db.problemProgress.deleteMany();
  });

  afterAll(async () => {
    await db?.$disconnect();
    await rm(scratch, { recursive: true, force: true });
  });

  const read = (id: string) => db.submission.findUniqueOrThrow({ where: { id }, select: { status: true, verdict: true, attempts: true } });
  async function waitFor(id: string, done: (s: Awaited<ReturnType<typeof read>>) => boolean) {
    for (const deadline = Date.now() + 5_000; Date.now() < deadline; await new Promise((r) => setTimeout(r, 20))) {
      const submission = await read(id);
      if (done(submission)) return submission;
    }
    throw new Error(`submission ${id} never got there: ${JSON.stringify(await read(id))}`);
  }
  const fast = { concurrency: 1, idleMs: 10, maintainEveryMs: 50, maxBackoffMs: 20 };

  it("keeps submissions queued while the sandbox is down, then judges them", async () => {
    let up = false;
    const sandbox = fakeSandbox(
      async () => {
        if (!up) throw new SandboxUnavailable("connection refused");
        return CRASHED;
      },
      () => up,
    );
    const id = await submit();
    const worker = startWorker({ ...deps, sandbox }, fast);
    try {
      // Requeued after the first try, and not claimed again while the sandbox stays down
      await waitFor(id, (s) => s.status === "QUEUED" && s.attempts === 1);
      await new Promise((r) => setTimeout(r, 200));
      expect(await read(id)).toEqual({ status: "QUEUED", verdict: null, attempts: 1 });

      up = true;
      expect(await waitFor(id, (s) => s.status === "FINISHED")).toEqual({ status: "FINISHED", verdict: "RUNTIME_ERROR", attempts: 2 });
    } finally {
      await worker.stop();
    }
  });

  it("gives up with INTERNAL_ERROR once a submission has used every attempt", async () => {
    const sandbox = fakeSandbox(async () => {
      throw new Error("a bug in judging");
    });
    const id = await submit();
    await db.submission.update({ where: { id }, data: { attempts: MAX_ATTEMPTS - 2 } });
    const worker = startWorker({ ...deps, sandbox }, fast);
    try {
      // One more requeue, then the last attempt fails for good
      expect(await waitFor(id, (s) => s.status === "FINISHED")).toEqual({ status: "FINISHED", verdict: "INTERNAL_ERROR", attempts: MAX_ATTEMPTS });
    } finally {
      await worker.stop();
    }
  });

  it("recovers a dead worker's claim, and the old claim can't record anything", async () => {
    const sandbox = fakeSandbox(async () => CRASHED);
    const id = await submit();
    const old = (await claimNext(db))!;

    // Alive and recent: left alone
    expect(await requeueStale(db, 60_000)).toEqual({ requeued: 0, failed: 0 });
    await db.submission.update({ where: { id }, data: { heartbeatAt: new Date(Date.now() - 10 * 60_000) } });
    expect(await requeueStale(db, 60_000)).toEqual({ requeued: 1, failed: 0 });

    const current = (await claimNext(db))!;
    expect(current).toEqual({ id, attempt: 2 });
    // Fenced at the first test's progress write, and at the final write for a compile error
    await expect(judgeSubmission({ ...deps, sandbox }, old)).rejects.toBeInstanceOf(LostClaim);
    await db.submission.update({ where: { id }, data: { language: "cpp" } });
    await expect(judgeSubmission({ ...deps, sandbox }, old)).rejects.toBeInstanceOf(LostClaim);
    expect(await read(id)).toEqual({ status: "RUNNING", verdict: null, attempts: 2 });
    expect(await db.problemProgress.count()).toBe(0);

    // The current claim still works
    expect(await judgeSubmission({ ...deps, sandbox }, current)).toBe("COMPILATION_ERROR");
  });

  it("gives up on a stale claim that has used every attempt", async () => {
    const id = await submit();
    await db.submission.update({
      where: { id },
      data: { status: "RUNNING", attempts: MAX_ATTEMPTS, heartbeatAt: new Date(Date.now() - 10 * 60_000) },
    });
    expect(await requeueStale(db, 60_000)).toEqual({ requeued: 0, failed: 1 });
    expect(await read(id)).toMatchObject({ status: "FINISHED", verdict: "INTERNAL_ERROR" });
  });
});
