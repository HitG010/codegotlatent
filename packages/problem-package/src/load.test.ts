import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadPackage, PackageError } from "./load.js";

const FIXTURE = join(import.meta.dirname, "../fixtures/self-aware");
const scratch: string[] = [];

/** A writable copy of the fixture, under a folder named like the problem. */
async function copyFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "cgl-package-"));
  scratch.push(root);
  const dir = join(root, "self-aware");
  await cp(FIXTURE, dir, { recursive: true });
  return dir;
}

async function issuesFor(dir: string): Promise<string[]> {
  const error = await loadPackage(dir).catch((err: unknown) => err);
  expect(error).toBeInstanceOf(PackageError);
  return (error as PackageError).issues;
}

afterEach(async () => {
  await Promise.all(scratch.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("loadPackage", () => {
  it("reads a valid package", async () => {
    const pkg = await loadPackage(FIXTURE);
    expect(pkg).toMatchObject({
      uuid: "6f1d2c4e-8a3b-4f0e-9c1a-2b7d5e3f9a10",
      slug: "self-aware",
      title: "Self-Aware",
      difficulty: "EASY",
      tags: ["implementation"],
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      checker: { kind: "default", caseSensitive: false, spaceSensitive: false },
    });
    expect(pkg.statementMarkdown).toContain("self-aware");
    expect(pkg.editorialMarkdown).toContain("O(N)");
    expect(pkg.tests.map((t) => [t.name, t.isSample])).toEqual([
      ["sample/1", true],
      ["sample/2", true],
      ["secret/01", false],
      ["secret/02", false],
      ["secret/03", false],
    ]);
    expect(pkg.tests[0]!.answer.toString()).toBe("2\n");
    // sha256 of "2\n"
    expect(pkg.tests[0]!.answerHash).toBe(
      "53c234e5e8472b6ac51c1ae1cab3fe06fad053beb8ebfd8977b010655bfdd3c3",
    );
  });

  it("hashes content: same files, same hash; any test change, new hash", async () => {
    const dir = await copyFixture();
    const before = (await loadPackage(dir)).hash;
    expect((await loadPackage(FIXTURE)).hash).toBe(before);

    await writeFile(join(dir, "data/secret/03.ans"), "5\n");
    expect((await loadPackage(dir)).hash).not.toBe(before);
  });

  it("ignores reference solutions when hashing", async () => {
    const dir = await copyFixture();
    const before = (await loadPackage(dir)).hash;
    await writeFile(join(dir, "submissions/accepted/main.py"), "print(0)\n");
    expect((await loadPackage(dir)).hash).toBe(before);
  });

  it("takes an explicit slug and validator args", async () => {
    const dir = await copyFixture();
    await writeFile(join(dir, "cgl.yaml"), "difficulty: hard\nslug: aware\n");
    for (const group of ["sample", "secret"]) {
      await writeFile(
        join(dir, `data/${group}/test_group.yaml`),
        "output_validator_args: [case_sensitive]\n",
      );
    }
    const pkg = await loadPackage(dir);
    expect(pkg.slug).toBe("aware");
    expect(pkg.difficulty).toBe("HARD");
    expect(pkg.checker.caseSensitive).toBe(true);
  });

  it("reports every problem at once", async () => {
    const dir = await copyFixture();
    await rm(join(dir, "data/secret/02.ans"));
    await rm(join(dir, "solution/solution.en.md"));
    await writeFile(join(dir, "statement/diagram.png"), "");
    await writeFile(join(dir, "data/sample/test_group.yaml"), "output_validator_args: [case_sensitive]\n");
    await writeFile(join(dir, "cgl.yaml"), "difficulty: brutal\n");

    const issues = await issuesFor(dir);
    expect(issues).toHaveLength(4);
    expect(issues.join("\n")).toMatch(/secret\/02: needs both/);
    expect(issues.join("\n")).toMatch(/statement\/diagram\.png/);
    expect(issues.join("\n")).toMatch(/must use the same output_validator_args/);
    expect(issues.join("\n")).toMatch(/cgl\.yaml: difficulty/);
  });

  it("refuses formats it can't judge yet", async () => {
    const dir = await copyFixture();
    await cp(join(dir, "submissions"), join(dir, "output_validator"), { recursive: true });
    await writeFile(
      join(dir, "problem.yaml"),
      'problem_format_version: "2025-09"\nname: X\nuuid: u\ntype: scoring\nlimits: {time_limit: 1, memory: 256}\n',
    );
    const issues = (await issuesFor(dir)).join("\n");
    expect(issues).toMatch(/custom output validators/);
    expect(issues).toMatch(/only pass-fail/);
  });

  it("requires samples, and keeps them small enough to show", async () => {
    const dir = await copyFixture();
    await writeFile(join(dir, "data/sample/1.in"), "x".repeat(17 * 1024));
    await rm(join(dir, "data/sample/2.in"));
    await rm(join(dir, "data/sample/2.ans"));
    expect((await issuesFor(dir)).join("\n")).toMatch(/sample\/1\.in is over the 16 KiB limit/);

    await rm(join(dir, "data/sample/1.in"));
    await rm(join(dir, "data/sample/1.ans"));
    expect(await issuesFor(dir)).toContain("data/sample has no tests");
  });
});
