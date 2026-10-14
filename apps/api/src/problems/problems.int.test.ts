import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPackage } from "@cgl/problem-package";
import type { ProblemDetail, ProblemListResponse, RunResponse, SubmissionView } from "@cgl/shared";
import { pino } from "pino";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { createDb, type Db } from "../db.js";
import { signAccessToken } from "../http/auth.js";
import { GoJudge } from "../judge/gojudge.js";
import { claimNext, judgeSubmission } from "../judge/worker.js";
import { FsBlobStore } from "../storage/blob-store.js";
import { publishProblem } from "./publish.js";
import { problemsRouter } from "./routes.js";

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];
// Set in apps/api/.env when the sandbox is running locally; CI has none, so those tests skip
const TEST_JUDGE_URL = process.env["TEST_JUDGE_URL"];
const SECRET = "test-secret-that-is-at-least-32-chars!";
const FIXTURE = join(import.meta.dirname, "../../../../packages/problem-package/fixtures/self-aware");

describe.skipIf(!TEST_DATABASE_URL)("problems and judging (database)", () => {
  let db: Db;
  let server: Server;
  let base: string;
  let scratch: string;
  let blobs: FsBlobStore;
  let sandbox: GoJudge;
  let riya: string;
  let arjun: string;

  beforeAll(async () => {
    db = createDb(TEST_DATABASE_URL!);
    await db.$executeRawUnsafe('TRUNCATE "User", "Problem", "Blob", "Tag" CASCADE');
    scratch = await mkdtemp(join(tmpdir(), "cgl-problems-"));
    blobs = new FsBlobStore(join(scratch, "blobs"));
    sandbox = new GoJudge(TEST_JUDGE_URL ?? "http://127.0.0.1:9");

    await publishProblem(db, blobs, await loadPackage(FIXTURE), { listInPractice: true });
    // A second problem that hasn't been released yet
    const hidden = join(scratch, "packages", "hidden-one");
    await cp(FIXTURE, hidden, { recursive: true });
    await writeFile(join(hidden, "problem.yaml"), 'problem_format_version: "2025-09"\nname: Hidden\nuuid: hidden-uuid\nlimits: {time_limit: 1, memory: 256}\n');
    await publishProblem(db, blobs, await loadPackage(hidden));

    const users = await Promise.all(
      ["riya", "arjun"].map((name) => db.user.create({ data: { email: `${name}@example.com`, username: name } })),
    );
    riya = signAccessToken({ id: users[0]!.id, role: "USER" }, SECRET);
    arjun = signAccessToken({ id: users[1]!.id, role: "USER" }, SECRET);

    const app = createApp({
      clientOrigin: "http://localhost:5173",
      logger: pino({ level: "silent" }),
      pingDb: async () => undefined,
      routers: [problemsRouter({ db, sandbox, accessTokenSecret: SECRET })],
    });
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server?.close();
    await db?.$disconnect();
    await rm(scratch, { recursive: true, force: true });
  });

  const get = async <T,>(path: string, token?: string) => {
    const res = await fetch(`${base}${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
    return { status: res.status, body: (await res.json()) as T };
  };
  const post = async <T,>(path: string, body: unknown, token?: string) => {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json()) as T };
  };

  it("lists only released problems", async () => {
    const { status, body } = await get<ProblemListResponse>("/problems");
    expect(status).toBe(200);
    expect(body.problems.map((p) => p.slug)).toEqual(["self-aware"]);
    expect(body.problems[0]).toMatchObject({ title: "Self-Aware", difficulty: "EASY", tags: ["implementation"], acceptance: null, solvers: 0, status: null });
    expect(body.totals.EASY).toEqual({ total: 1, solved: 0 });
  });

  it("serves a problem page, and 404s unreleased problems", async () => {
    const { status, body } = await get<ProblemDetail>("/problems/self-aware");
    expect(status).toBe(200);
    expect(body).toMatchObject({ timeLimitMs: 1000, memoryLimitMb: 256, testCount: 5, status: null });
    expect(body.samples).toHaveLength(2);
    expect(body.statementHtml).toContain('class="katex"');
    expect((await get("/problems/hidden-one")).status).toBe(404);
  });

  it("needs sign-in to run or submit", async () => {
    expect((await post("/problems/self-aware/runs", { language: "cpp", code: "x" })).status).toBe(401);
    expect((await post("/problems/self-aware/submissions", { language: "cpp", code: "x" })).status).toBe(401);
  });

  describe.skipIf(!TEST_JUDGE_URL)("with the sandbox", () => {
    let correctCpp: string;
    let correctPython: string;
    const printsZero = "#include <cstdio>\nint main() { std::printf(\"0\\n\"); }\n";

    beforeAll(async () => {
      correctCpp = await readFile(join(FIXTURE, "submissions/accepted/main.cpp"), "utf8");
      correctPython = await readFile(join(FIXTURE, "submissions/accepted/main.py"), "utf8");
    });

    it("runs the samples and checks them", async () => {
      const ok = await post<RunResponse>("/problems/self-aware/runs", { language: "cpp", code: correctCpp }, riya);
      expect(ok.status).toBe(200);
      expect(ok.body.cases.map((c) => [c.verdict, c.output])).toEqual([
        ["ACCEPTED", "2\n"],
        ["ACCEPTED", "1\n"],
      ]);

      const wrong = await post<RunResponse>("/problems/self-aware/runs", { language: "cpp", code: printsZero }, riya);
      expect(wrong.body.cases[0]).toMatchObject({ verdict: "WRONG_ANSWER", reason: 'Token 1: expected "2", got "0"', expected: "2\n" });
    });

    it("reports compile errors and runs custom input without judging it", async () => {
      const broken = await post<RunResponse>("/problems/self-aware/runs", { language: "cpp", code: "int main( {" }, riya);
      expect(broken.body.compileError).toMatch(/error/);

      const custom = await post<RunResponse>("/problems/self-aware/runs", { language: "python", code: correctPython, input: "1 0\n1 1\n" }, riya);
      expect(custom.body.cases).toEqual([expect.objectContaining({ verdict: null, expected: null, output: "1\n" })]);
    });

    it("judges a submission through the worker and records progress", async () => {
      const deps = { db, sandbox, blobs, logger: pino({ level: "silent" }) };
      const created = await post<SubmissionView>("/problems/self-aware/submissions", { language: "cpp", code: correctCpp }, riya);
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({ status: "QUEUED", testsTotal: 5, verdict: null });

      const claimed = await claimNext(db);
      expect(claimed).toBe(created.body.id);
      expect(await judgeSubmission(deps, claimed!)).toBe("ACCEPTED");

      const done = await get<SubmissionView>(`/submissions/${created.body.id}`, riya);
      expect(done.body).toMatchObject({ status: "FINISHED", verdict: "ACCEPTED", testsPassed: 5 });
      expect(done.body.results).toHaveLength(5);

      // A wrong submission stops at the first failing test and doesn't undo the solve
      const wrong = await post<SubmissionView>("/problems/self-aware/submissions", { language: "cpp", code: printsZero }, riya);
      expect(await judgeSubmission(deps, (await claimNext(db))!)).toBe("WRONG_ANSWER");
      const failed = await get<SubmissionView>(`/submissions/${wrong.body.id}`, riya);
      expect(failed.body.results.map((r) => r.verdict)).toEqual(["WRONG_ANSWER"]);

      const list = await get<ProblemListResponse>("/problems", riya);
      expect(list.body.problems[0]).toMatchObject({ status: "solved", acceptance: 50, solvers: 1 });
      expect(list.body.totals.EASY.solved).toBe(1);
      expect((await get<ProblemListResponse>("/problems", arjun)).body.problems[0]!.status).toBeNull();

      // Submissions are private to their author
      expect((await get(`/submissions/${created.body.id}`, arjun)).status).toBe(404);
    });

    it("stops a program that runs past the time limit", async () => {
      const looping = await post<SubmissionView>("/problems/self-aware/submissions", { language: "python", code: "while True:\n    pass\n" }, arjun);
      const deps = { db, sandbox, blobs, logger: pino({ level: "silent" }) };
      expect(await judgeSubmission(deps, (await claimNext(db))!)).toBe("TIME_LIMIT_EXCEEDED");
      const progress = await get<ProblemDetail>("/problems/self-aware", arjun);
      expect(progress.body.status).toBe("attempted");
      expect(looping.status).toBe(201);
    });
  });
});
