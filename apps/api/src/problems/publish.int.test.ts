import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPackage } from "@cgl/problem-package";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "../db.js";
import { FsBlobStore } from "../storage/blob-store.js";
import { publishProblem, PublishError } from "./publish.js";

const FIXTURE = join(import.meta.dirname, "../../../../packages/problem-package/fixtures/self-aware");
const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];

describe.skipIf(!TEST_DATABASE_URL)("publishProblem (database)", () => {
  let db: Db;
  let scratch: string;
  let blobs: FsBlobStore;

  async function copyFixture(name = "self-aware"): Promise<string> {
    const dir = join(scratch, "packages", name);
    await cp(FIXTURE, dir, { recursive: true });
    return dir;
  }

  beforeAll(() => {
    db = createDb(TEST_DATABASE_URL!);
  });
  afterAll(async () => {
    await db.$disconnect();
  });
  beforeEach(async () => {
    await db.$executeRawUnsafe('TRUNCATE "Problem", "Blob", "Tag" CASCADE');
    scratch = await mkdtemp(join(tmpdir(), "cgl-publish-"));
    blobs = new FsBlobStore(join(scratch, "blobs"));
    return () => rm(scratch, { recursive: true, force: true });
  });

  it("creates the problem with a first version, tests, tags and blobs", async () => {
    const result = await publishProblem(db, blobs, await loadPackage(FIXTURE));
    expect(result).toMatchObject({ slug: "self-aware", version: 1, status: "created" });

    const problem = await db.problem.findUniqueOrThrow({
      where: { id: result.problemId },
      include: {
        tags: true,
        currentVersion: { include: { tests: { orderBy: { ordinal: "asc" } } } },
      },
    });
    expect(problem).toMatchObject({ title: "Self-Aware", difficulty: "EASY", publishedAt: null });
    expect(problem.tags.map((t) => t.slug)).toEqual(["implementation"]);

    const version = problem.currentVersion!;
    expect(version).toMatchObject({ number: 1, timeLimitMs: 1000, memoryLimitMb: 256 });
    expect(version.statementHtml).toContain('class="katex"');
    expect(version.editorialHtml).toContain("katex");
    expect(version.samples).toEqual([
      { input: "4 1\n1 1\n3 1\n2 4\n4 4\n", output: "2\n" },
      { input: "3 0\n2 2\n1 3\n3 1\n", output: "1\n" },
    ]);
    expect(version.checker).toEqual({ kind: "default", caseSensitive: false, spaceSensitive: false });
    expect(version.tests.map((t) => [t.name, t.isSample])).toEqual([
      ["sample/1", true],
      ["sample/2", true],
      ["secret/01", false],
      ["secret/02", false],
      ["secret/03", false],
    ]);

    const first = version.tests[0]!;
    expect((await blobs.get(first.inputHash)).toString()).toBe("4 1\n1 1\n3 1\n2 4\n4 4\n");
  });

  it("does nothing when the package hasn't changed", async () => {
    const pkg = await loadPackage(FIXTURE);
    await publishProblem(db, blobs, pkg);
    const again = await publishProblem(db, blobs, pkg);
    expect(again).toMatchObject({ version: 1, status: "unchanged" });
    expect(await db.problemVersion.count()).toBe(1);
  });

  it("adds a version on change, keeps the old one, and stores shared files once", async () => {
    const dir = await copyFixture();
    const v1 = await publishProblem(db, blobs, await loadPackage(dir));
    const blobsBefore = await db.blob.count();

    await writeFile(join(dir, "data/secret/03.ans"), "7\n");
    const v2 = await publishProblem(db, blobs, await loadPackage(dir));

    expect(v2).toMatchObject({ problemId: v1.problemId, version: 2, status: "updated" });
    expect(await db.blob.count()).toBe(blobsBefore + 1);
    const versions = await db.problemVersion.findMany({
      where: { problemId: v1.problemId },
      include: { _count: { select: { tests: true } } },
      orderBy: { number: "asc" },
    });
    expect(versions.map((v) => [v.number, v._count.tests])).toEqual([
      [1, 5],
      [2, 5],
    ]);
    const problem = await db.problem.findUniqueOrThrow({ where: { id: v1.problemId } });
    expect(problem.currentVersionId).toBe(versions[1]!.id);
  });

  it("follows the package uuid through a slug change", async () => {
    const dir = await copyFixture();
    const before = await publishProblem(db, blobs, await loadPackage(dir));
    await writeFile(join(dir, "cgl.yaml"), "difficulty: easy\nslug: know-thyself\n");
    const after = await publishProblem(db, blobs, await loadPackage(dir));
    expect(after).toMatchObject({ problemId: before.problemId, slug: "know-thyself", version: 2 });
  });

  it("won't take another problem's slug", async () => {
    await publishProblem(db, blobs, await loadPackage(FIXTURE));
    const impostor = await copyFixture();
    await writeFile(
      join(impostor, "problem.yaml"),
      'problem_format_version: "2025-09"\nname: Impostor\nuuid: another-uuid\nlimits: {time_limit: 1, memory: 256}\n',
    );
    await expect(publishProblem(db, blobs, await loadPackage(impostor))).rejects.toThrow(PublishError);
  });

  it("lists a problem in practice once, and later publishes don't move the date", async () => {
    const dir = await copyFixture();
    const { problemId } = await publishProblem(db, blobs, await loadPackage(dir), { listInPractice: true });
    const listedAt = (await db.problem.findUniqueOrThrow({ where: { id: problemId } })).publishedAt;
    expect(listedAt).toBeInstanceOf(Date);

    await writeFile(join(dir, "data/secret/01.ans"), "1 \n");
    await publishProblem(db, blobs, await loadPackage(dir), { listInPractice: true });
    const later = (await db.problem.findUniqueOrThrow({ where: { id: problemId } })).publishedAt;
    expect(later).toEqual(listedAt);
  });
});
