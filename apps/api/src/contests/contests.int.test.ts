import { mkdtemp, readFile, rm } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPackage } from "@cgl/problem-package";
import type {
  ContestDetail,
  ContestResults,
  ContestSummary,
  ProblemDetail,
  ProblemListResponse,
  SubmissionView,
  UserProfile,
  Verdict,
} from "@cgl/shared";
import { pino } from "pino";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { createDb, type Db } from "../db.js";
import { signAccessToken } from "../http/auth.js";
import { GoJudge } from "../judge/gojudge.js";
import { claimNext, judgeSubmission } from "../judge/worker.js";
import { publishProblem } from "../problems/publish.js";
import { judgeLimits, problemsRouter } from "../problems/routes.js";
import { FsBlobStore } from "../storage/blob-store.js";
import { usersRouter } from "../users/routes.js";
import { createContest, parseDuration } from "./create.js";
import { finalizeContest, findFinalizable } from "./finalize.js";
import { contestsRouter } from "./routes.js";
import { recordContestSubmission } from "./scoring.js";

const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];
const TEST_JUDGE_URL = process.env["TEST_JUDGE_URL"];
const SECRET = "test-secret-that-is-at-least-32-chars!";
const FIXTURES = join(import.meta.dirname, "../../../../packages/problem-package/fixtures");
const HOUR = 3_600_000;
const MINUTE = 60_000;

describe("parseDuration", () => {
  it("reads compact durations", () => {
    expect(parseDuration("90m")).toBe(90 * MINUTE);
    expect(parseDuration("1h30m")).toBe(90 * MINUTE);
    expect(parseDuration("2h")).toBe(2 * HOUR);
    expect(() => parseDuration("90")).toThrow(/duration/);
    expect(() => parseDuration("1h banana")).toThrow(/duration/);
  });
});

describe.skipIf(!TEST_DATABASE_URL)("contests (database)", () => {
  let db: Db;
  let server: Server;
  let base: string;
  let scratch: string;
  let blobs: FsBlobStore;
  let sandbox: GoJudge;
  const ids: Record<string, string> = {};
  const tokens: Record<string, string> = {};

  beforeAll(async () => {
    db = createDb(TEST_DATABASE_URL!);
    await db.$executeRawUnsafe('TRUNCATE "User", "Problem", "Blob", "Tag", "Contest" CASCADE');
    scratch = await mkdtemp(join(tmpdir(), "cgl-contests-"));
    blobs = new FsBlobStore(join(scratch, "blobs"));
    sandbox = new GoJudge(TEST_JUDGE_URL ?? "http://127.0.0.1:9");

    // One problem that's already public, one that's never been seen
    await publishProblem(db, blobs, await loadPackage(join(FIXTURES, "self-aware")), { listInPractice: true });
    await publishProblem(db, blobs, await loadPackage(join(FIXTURES, "applause-meter")));

    for (const name of ["riya", "arjun", "meera", "kabir"]) {
      const user = await db.user.create({ data: { email: `${name}@example.com`, username: name } });
      ids[name] = user.id;
      tokens[name] = signAccessToken({ id: user.id, role: "USER" }, SECRET);
    }

    const limits = judgeLimits();
    const app = createApp({
      clientOrigin: "http://localhost:5173",
      logger: pino({ level: "silent" }),
      pingDb: async () => undefined,
      routers: [
        problemsRouter({ db, sandbox, accessTokenSecret: SECRET }, limits),
        contestsRouter({ db, sandbox, accessTokenSecret: SECRET }, limits),
        usersRouter({ db, accessTokenSecret: SECRET }),
      ],
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

  const send = async <T,>(method: string, path: string, who?: string, body?: unknown) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { ...(body !== undefined ? { "content-type": "application/json" } : {}), ...(who ? { authorization: `Bearer ${tokens[who]}` } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    return { status: res.status, body: (text ? JSON.parse(text) : null) as T & { error?: { code: string; message: string } } };
  };
  const get = <T,>(path: string, who?: string) => send<T>("GET", path, who);
  const code = { language: "python", code: "print(0)\n" };

  /** Moves a contest's clock: phases follow from its times. Ending it keeps the start where it was. */
  async function moveTo(slug: string, phase: "SCHEDULED" | "GUESS_WINDOW" | "LIVE" | "ENDED") {
    const now = Date.now();
    if (phase === "ENDED") {
      await db.contest.update({ where: { slug }, data: { endsAt: new Date(now - 1000) } });
      return;
    }
    const [opens, starts, ends] = { SCHEDULED: [1, 2, 3], GUESS_WINDOW: [-1, 1, 2], LIVE: [-2, -1, 1] }[phase];
    await db.contest.update({
      where: { slug },
      data: { guessOpensAt: new Date(now + opens! * HOUR), startsAt: new Date(now + starts! * HOUR), endsAt: new Date(now + ends! * HOUR) },
    });
  }

  /** Feeds a judged submission straight to the scorer, `minute` minutes into the contest. */
  async function judged(slug: string, who: string, problemSlug: string, minute: number, verdict: Verdict) {
    const contest = await db.contest.findUniqueOrThrow({ where: { slug }, select: { id: true, startsAt: true } });
    const problem = await db.problem.findUniqueOrThrow({ where: { slug: problemSlug }, select: { id: true } });
    const submission = { userId: ids[who]!, problemId: problem.id, contestId: contest.id, createdAt: new Date(contest.startsAt.getTime() + minute * MINUTE) };
    await db.$transaction((tx) => recordContestSubmission(tx, submission, verdict));
  }

  it("schedules a contest from a spec", async () => {
    const spec = {
      slug: "round-1",
      title: "Round 1",
      description: "Guess your rank, then **prove it**.",
      starts: "in 2h",
      duration: "90m",
      problems: [
        { slug: "self-aware", label: "A", points: 500 },
        { slug: "applause-meter", label: "B", points: 1000 },
      ],
    };
    await expect(createContest(db, { ...spec, slug: "nope", problems: [{ slug: "missing", label: "A", points: 1 }] })).rejects.toThrow(/No imported problem/);
    await expect(createContest(db, { ...spec, slug: "nope", starts: "2020-01-01T00:00:00Z" })).rejects.toThrow(/future/);

    const { warnings } = await createContest(db, spec);
    expect(warnings).toEqual([expect.stringContaining("self-aware is already in practice")]);
    const contest = await db.contest.findUniqueOrThrow({ where: { slug: "round-1" } });
    expect(contest.endsAt.getTime() - contest.startsAt.getTime()).toBe(90 * MINUTE);
    expect(contest.startsAt.getTime() - contest.guessOpensAt.getTime()).toBe(30 * MINUTE);
  });

  it("lists contests and shows the lobby without problems", async () => {
    const anon = await get<{ contests: ContestSummary[] }>("/contests");
    expect(anon.body.contests).toEqual([expect.objectContaining({ slug: "round-1", phase: "SCHEDULED", registered: 0, you: null })]);
    const mine = await get<{ contests: ContestSummary[] }>("/contests", "riya");
    expect(mine.body.contests[0]!.you).toEqual({ registered: false, guess: null });

    const lobby = await get<ContestDetail>("/contests/round-1");
    expect(lobby.body).toMatchObject({ phase: "SCHEDULED", problems: null, problemCount: 2, standing: null, penaltyMinutes: 5 });
    expect(lobby.body.descriptionHtml).toContain("<strong>prove it</strong>");
    expect((await get("/contests/nope")).status).toBe(404);
  });

  it("takes registrations only while the contest is scheduled", async () => {
    expect((await send("POST", "/contests/round-1/registration")).status).toBe(401);
    for (const who of ["riya", "arjun", "meera"]) expect((await send("POST", "/contests/round-1/registration", who)).status).toBe(204);
    // Registering twice is harmless, and you can withdraw and come back
    expect((await send("POST", "/contests/round-1/registration", "riya")).status).toBe(204);
    expect((await send("DELETE", "/contests/round-1/registration", "riya")).status).toBe(204);
    expect((await send("POST", "/contests/round-1/registration", "riya")).status).toBe(204);

    await db.contest.update({ where: { slug: "round-1" }, data: { maxParticipants: 3 } });
    const full = await send("POST", "/contests/round-1/registration", "kabir");
    expect([full.status, full.body.error?.code]).toEqual([409, "contest_full"]);
    await db.contest.update({ where: { slug: "round-1" }, data: { maxParticipants: null } });

    const lobby = await get<ContestDetail>("/contests/round-1", "riya");
    expect(lobby.body).toMatchObject({ registered: 3, you: { registered: true, guess: null } });

    // No guessing before the window opens
    const early = await send("PUT", "/contests/round-1/guess", "riya", { best: 0, worst: 40 });
    expect([early.status, early.body.error?.code]).toEqual([409, "guess_window_closed"]);

    await moveTo("round-1", "GUESS_WINDOW");
    const late = await send("POST", "/contests/round-1/registration", "kabir");
    expect([late.status, late.body.error?.code]).toEqual([409, "registration_closed"]);
    expect((await send("DELETE", "/contests/round-1/registration", "arjun")).status).toBe(409);
  });

  it("takes guesses in the guess window, from registered contestants only", async () => {
    expect((await send("PUT", "/contests/round-1/guess", "riya", { best: 0, worst: 40 })).status).toBe(200);
    expect((await send("PUT", "/contests/round-1/guess", "arjun", { best: 30, worst: 70 })).status).toBe(200);
    expect((await send("PUT", "/contests/round-1/guess", "riya", { best: 50, worst: 40 })).status).toBe(400);
    const outsider = await send("PUT", "/contests/round-1/guess", "kabir", { best: 0, worst: 10 });
    expect([outsider.status, outsider.body.error?.code]).toEqual([403, "not_registered"]);
    expect((await get<ContestDetail>("/contests/round-1", "riya")).body.you).toEqual({ registered: true, guess: { best: 0, worst: 40 } });
  });

  it("keeps a contest's problems out of practice from the guess window on", async () => {
    expect((await get("/problems/self-aware")).status).toBe(404);
    expect((await get<ProblemListResponse>("/problems")).body.problems).toEqual([]);
    // Nor can contestants peek before the start
    expect((await get("/contests/round-1/problems/A", "riya")).status).toBe(404);
  });

  it("lets only registered contestants open, run or submit while the contest is live", async () => {
    await moveTo("round-1", "LIVE");

    for (const who of ["kabir", undefined]) {
      const view = await get("/contests/round-1/problems/A", who);
      expect(view.status).toBe(403);
      expect(view.body.error).toEqual({
        code: "not_registered",
        message: "Only registered contestants can open this problem while the contest is live.",
      });
      expect((await get<ContestDetail>("/contests/round-1", who)).body.problems).toBeNull();
    }
    expect((await send("POST", "/contests/round-1/problems/A/runs", "kabir", code)).status).toBe(403);
    expect((await send("POST", "/contests/round-1/problems/A/submissions", "kabir", code)).status).toBe(403);
    expect((await get("/contests/round-1/problems/A/submissions", "kabir")).status).toBe(403);
    // The practice route is closed too, so there's no side door
    expect((await send("POST", "/problems/self-aware/submissions", "kabir", code)).status).toBe(404);

    const lobby = await get<ContestDetail>("/contests/round-1", "riya");
    expect(lobby.body.problems?.map((p) => [p.label, p.title, p.points])).toEqual([
      ["A", "Self-Aware", 500],
      ["B", "Applause Meter", 1000],
    ]);
    const problem = await get<ProblemDetail>("/contests/round-1/problems/A", "riya");
    expect(problem.status).toBe(200);
    expect(problem.body).toMatchObject({ slug: "self-aware", editorialHtml: null, from: "Round 1 · A", contest: { slug: "round-1", label: "A", points: 500 } });

    const submitted = await send<SubmissionView>("POST", "/contests/round-1/problems/A/submissions", "riya", code);
    expect(submitted.status).toBe(201);
    const mine = await get<{ submissions: SubmissionView[] }>("/contests/round-1/problems/A/submissions", "riya");
    expect(mine.body.submissions.map((s) => s.id)).toEqual([submitted.body.id]);
    expect(await db.submission.count({ where: { contest: { slug: "round-1" } } })).toBe(1);
  });

  it("scores ICPC-style: points per solve, time plus a penalty per wrong attempt", async () => {
    await judged("round-1", "riya", "self-aware", 5, "WRONG_ANSWER");
    await judged("round-1", "riya", "self-aware", 6, "COMPILATION_ERROR"); // free
    await judged("round-1", "riya", "self-aware", 10, "ACCEPTED");
    await judged("round-1", "riya", "self-aware", 12, "WRONG_ANSWER"); // after the solve: free
    await judged("round-1", "riya", "applause-meter", 30, "ACCEPTED");
    await judged("round-1", "arjun", "applause-meter", 20, "TIME_LIMIT_EXCEEDED");
    await judged("round-1", "arjun", "applause-meter", 40, "ACCEPTED");

    const riya = await get<ContestDetail>("/contests/round-1", "riya");
    // 10 + 5 (one wrong attempt on A) + 30
    expect(riya.body.standing).toEqual({ points: 1500, penaltyMinutes: 45, solved: 2 });
    expect(riya.body.problems?.map((p) => [p.label, p.solvedBy, p.you])).toEqual([
      ["A", 1, "solved"],
      ["B", 2, "solved"],
    ]);
    expect((await get<ContestDetail>("/contests/round-1", "arjun")).body.standing).toEqual({ points: 1000, penaltyMinutes: 45, solved: 1 });
    expect((await get<ContestDetail>("/contests/round-1", "meera")).body.standing).toEqual({ points: 0, penaltyMinutes: 0, solved: 0 });
  });

  it("opens problems to everyone once it ends, but takes no more submissions", async () => {
    await moveTo("round-1", "ENDED");
    expect((await get<ContestDetail>("/contests/round-1")).body.phase).toBe("JUDGING");
    expect((await get("/contests/round-1/problems/A", "kabir")).status).toBe(200);
    const late = await send("POST", "/contests/round-1/problems/A/submissions", "riya", code);
    expect([late.status, late.body.error?.code]).toEqual([403, "contest_over"]);
    // Still out of practice until results are out
    expect((await get("/problems/self-aware")).status).toBe(404);
    expect((await get("/contests/round-1/results")).status).toBe(409);
  });

  it("publishes results and ratings once every submission is judged, exactly once", async () => {
    const contest = await db.contest.findUniqueOrThrow({ where: { slug: "round-1" }, select: { id: true } });
    // Riya's real submission is still queued
    expect(await findFinalizable(db)).toEqual([]);
    await db.submission.updateMany({ where: { contestId: contest.id }, data: { status: "FINISHED", verdict: "INTERNAL_ERROR" } });
    expect(await findFinalizable(db)).toEqual([contest.id]);

    expect(await finalizeContest(db, contest.id)).toBe(true);
    expect(await finalizeContest(db, contest.id)).toBe(false);
    expect(await findFinalizable(db)).toEqual([]);

    const participants = await db.contestParticipant.findMany({ where: { contestId: contest.id }, include: { user: true } });
    const by = (name: string) => participants.find((p) => p.user.username === name)!;
    expect([by("riya").rank, by("arjun").rank, by("meera").rank]).toEqual([1, 2, null]);
    // Meera never showed up: no rating change at all
    expect(by("meera").user).toMatchObject({ latentRating: 1500, formRating: 1500, latentContests: 0 });
    expect(by("riya").user.formRating).toBeGreaterThan(1500);
    expect(by("arjun").user.formRating).toBeLessThan(1500);
    expect(by("riya").user.latentContests).toBe(1);
    expect(await db.ratingEvent.count({ where: { contestId: contest.id } })).toBe(4);

    // Both problems are in practice now; the one that was already public keeps its date
    const list = await get<ProblemListResponse>("/problems");
    expect(list.body.problems.map((p) => p.slug).sort()).toEqual(["applause-meter", "self-aware"]);
    expect(list.body.problems.find((p) => p.slug === "applause-meter")!.from).toBe("Round 1 · B");
  });

  it("serves the results board", async () => {
    const { status, body } = await get<ContestResults>("/contests/round-1/results", "riya");
    expect(status).toBe(200);
    expect(body.contest).toMatchObject({ slug: "round-1", field: 2, isRated: true });
    expect(body.rows.map((r) => [r.rank, r.handle, r.points, r.penaltyMinutes, r.you])).toEqual([
      [1, "riya", 1500, 45, true],
      [2, "arjun", 1000, 45, false],
    ]);
    expect(body.rows[0]!.cells).toEqual([
      { label: "A", solved: true, wrongAttempts: 1, minute: 10 },
      { label: "B", solved: true, wrongAttempts: 0, minute: 30 },
    ]);
    expect(body.rows[1]!.cells[1]).toEqual({ label: "B", solved: true, wrongAttempts: 1, minute: 40 });
    expect(body.you).toMatchObject({ rank: 1, points: 1500, solved: 2, guess: { best: 0, worst: 40 } });
    expect(body.you!.latent!.delta).toBe(body.you!.latent!.after - body.you!.latent!.before);
    expect(body.you!.form!.delta).toBe(body.rows[0]!.formDelta);

    expect((await get<ContestResults>("/contests/round-1/results")).body.you).toBeNull();
    expect((await get<ContestDetail>("/contests/round-1")).body.phase).toBe("RESULTS");
  });

  it("ranks an unrated contest without moving anyone's rating", async () => {
    await createContest(db, { slug: "warmup", title: "Warm-up", starts: "in 2h", duration: "1h", rated: false, problems: [{ slug: "applause-meter", label: "A", points: 100 }] });
    for (const who of ["riya", "arjun"]) await send("POST", "/contests/warmup/registration", who);
    await moveTo("warmup", "LIVE");
    await judged("warmup", "arjun", "applause-meter", 3, "ACCEPTED");
    await judged("warmup", "riya", "applause-meter", 4, "WRONG_ANSWER");
    await moveTo("warmup", "ENDED");

    const before = await db.user.findMany({ orderBy: { username: "asc" }, select: { latentRating: true, formRating: true } });
    const contest = await db.contest.findUniqueOrThrow({ where: { slug: "warmup" }, select: { id: true } });
    expect(await finalizeContest(db, contest.id)).toBe(true);
    expect(await db.user.findMany({ orderBy: { username: "asc" }, select: { latentRating: true, formRating: true } })).toEqual(before);
    expect(await db.ratingEvent.count({ where: { contestId: contest.id } })).toBe(0);

    const results = await get<ContestResults>("/contests/warmup/results");
    expect(results.body.rows.map((r) => [r.handle, r.rank, r.latentDelta, r.formDelta])).toEqual([
      ["arjun", 1, 0, 0],
      ["riya", 2, 0, 0],
    ]);
  });

  it("shows each player's finished rounds on their profile", async () => {
    const riya = await get<UserProfile>("/users/Riya", "riya");
    expect(riya.status).toBe(200);
    expect(riya.body).toMatchObject({ handle: "riya", you: true, latent: { contests: 1 }, form: { contests: 1 } });
    expect(riya.body.contests.map((c) => [c.slug, c.rank, c.field, c.points, c.solved])).toEqual([
      ["round-1", 1, 2, 1500, 2],
      ["warmup", 2, 2, 0, 0],
    ]);
    const [round1, warmup] = riya.body.contests;
    expect(round1!.guess).toEqual({ best: 0, worst: 40 });
    expect(round1!.latent!.after).toBe(riya.body.latent.rating);
    expect(warmup).toMatchObject({ guess: null, latent: null, form: null }); // unrated
    expect(riya.body.practice.EASY.total + riya.body.practice.MEDIUM.total).toBe(2);
    // Her own submissions show on her own profile only
    expect(riya.body.recentSubmissions?.map((s) => s.problemSlug)).toEqual(["self-aware"]);
    expect((await get<UserProfile>("/users/riya", "arjun")).body).toMatchObject({ you: false, recentSubmissions: null });
    expect((await get<UserProfile>("/users/riya")).body.recentSubmissions).toBeNull();

    // A no-show has no rounds, and unknown handles 404
    expect((await get<UserProfile>("/users/meera")).body.contests).toEqual([]);
    expect((await get("/users/nobody")).status).toBe(404);
  });

  it("keeps a running round off profiles", async () => {
    await createContest(db, { slug: "round-3", title: "Round 3", starts: "in 2h", duration: "1h", problems: [{ slug: "self-aware", label: "A", points: 100 }] });
    await send("POST", "/contests/round-3/registration", "riya");
    await moveTo("round-3", "LIVE");
    await send("POST", "/contests/round-3/problems/A/submissions", "riya", code);

    const riya = await get<UserProfile>("/users/riya", "riya");
    expect(riya.body.contests.map((c) => c.slug)).not.toContain("round-3");
    // Its problem is out of practice, so it drops out of the counts and the submissions list
    expect(riya.body.practice.EASY.total).toBe(0);
    expect(riya.body.recentSubmissions).toEqual([]);

    await moveTo("round-3", "ENDED");
    const contest = await db.contest.findUniqueOrThrow({ where: { slug: "round-3" }, select: { id: true } });
    await db.submission.updateMany({ where: { contestId: contest.id }, data: { status: "FINISHED", verdict: "WRONG_ANSWER" } });
    await finalizeContest(db, contest.id);
  });

  describe.skipIf(!TEST_JUDGE_URL)("with the sandbox", () => {
    it("judges a contest submission into the standings", async () => {
      await createContest(db, { slug: "round-2", title: "Round 2", starts: "in 2h", duration: "1h", problems: [{ slug: "self-aware", label: "A", points: 300 }] });
      await send("POST", "/contests/round-2/registration", "kabir");
      await moveTo("round-2", "LIVE");

      const correct = await readFile(join(FIXTURES, "self-aware/submissions/accepted/main.cpp"), "utf8");
      const run = await send<{ cases: Array<{ verdict: Verdict }> }>("POST", "/contests/round-2/problems/A/runs", "kabir", { language: "cpp", code: correct });
      expect(run.body.cases.map((c) => c.verdict)).toEqual(["ACCEPTED", "ACCEPTED"]);

      const created = await send<SubmissionView>("POST", "/contests/round-2/problems/A/submissions", "kabir", { language: "cpp", code: correct });
      expect(created.status).toBe(201);
      const deps = { db, sandbox, blobs, logger: pino({ level: "silent" }) };
      expect(await judgeSubmission(deps, (await claimNext(db))!)).toBe("ACCEPTED");

      const lobby = await get<ContestDetail>("/contests/round-2", "kabir");
      expect(lobby.body.standing).toMatchObject({ points: 300, solved: 1 });
      expect(lobby.body.problems?.[0]?.you).toBe("solved");
    });
  });
});
