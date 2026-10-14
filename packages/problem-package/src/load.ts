import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, relative, sep } from "node:path";
import type { Checker } from "@cgl/shared";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import {
  cglYamlSchema,
  parseValidatorArgs,
  problemYamlSchema,
  testGroupYamlSchema,
} from "./manifest.js";

export const MAX_TEST_FILE_BYTES = 64 * 1024 * 1024;
// Samples are shown on the problem page and copied into the editor
export const MAX_SAMPLE_FILE_BYTES = 16 * 1024;

export interface PackageTest {
  /** Path under data/ without extension, e.g. "secret/03". */
  name: string;
  isSample: boolean;
  input: Buffer;
  answer: Buffer;
  /** SHA-256 hex digests, the files' names in the blob store. */
  inputHash: string;
  answerHash: string;
}

export interface ProblemPackage {
  uuid: string;
  slug: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  tags: string[];
  timeLimitMs: number;
  memoryLimitMb: number;
  checker: Checker;
  statementMarkdown: string;
  editorialMarkdown: string | null;
  /** Samples first, then secret tests, each group in path order. */
  tests: PackageTest[];
  /** Digest of everything that affects judging or display; equal hash, same problem. */
  hash: string;
}

/** Every problem found in a package, reported together. */
export class PackageError extends Error {
  readonly issues: string[];

  constructor(dir: string, issues: string[]) {
    super(`${dir}:\n${issues.map((issue) => `  - ${issue}`).join("\n")}`);
    this.issues = issues;
  }
}

const sha256 = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");

async function exists(path: string) {
  return stat(path).then(
    () => true,
    () => false,
  );
}

/** Files under dir, as paths relative to dir with forward slashes, sorted. */
async function listFiles(dir: string): Promise<string[]> {
  if (!(await exists(dir))) return [];
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join("/"))
    .sort();
}

/** Reads and validates a problem package directory. Throws PackageError listing every issue. */
export async function loadPackage(dir: string): Promise<ProblemPackage> {
  const issues: string[] = [];
  // Every file that affects judging or display, by path → SHA-256
  const digests = new Map<string, string>();

  async function readTracked(path: string): Promise<Buffer> {
    const data = await readFile(join(dir, path));
    digests.set(path, sha256(data));
    return data;
  }

  async function readYaml<T>(path: string, schema: z.ZodType<T>): Promise<T | undefined> {
    if (!(await exists(join(dir, path)))) {
      issues.push(`${path} is missing`);
      return undefined;
    }
    let raw: unknown;
    try {
      raw = parseYaml((await readTracked(path)).toString("utf8"));
    } catch (err) {
      issues.push(`${path} is not valid YAML: ${(err as Error).message}`);
      return undefined;
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        issues.push(`${path}: ${issue.path.join(".") || "(root)"} — ${issue.message}`);
      }
      return undefined;
    }
    return parsed.data;
  }

  /** Reads the one Markdown file in a statement/ or solution/ directory. */
  async function readMarkdown(folder: string, stem: string, required: boolean) {
    const files = await listFiles(join(dir, folder));
    const accepted = [`${stem}.en.md`, `${stem}.md`];
    for (const file of files.filter((f) => !accepted.includes(f))) {
      issues.push(`${folder}/${file}: only ${stem}.en.md is supported (no images, LaTeX or PDF yet)`);
    }
    const found = accepted.find((name) => files.includes(name));
    if (!found) {
      if (required) issues.push(`${folder}/${stem}.en.md is missing`);
      return null;
    }
    return (await readTracked(`${folder}/${found}`)).toString("utf8");
  }

  const problemYaml = await readYaml("problem.yaml", problemYamlSchema);
  const cglYaml = await readYaml("cgl.yaml", cglYamlSchema);
  const statementMarkdown = await readMarkdown("statement", "problem", true);
  const editorialMarkdown = await readMarkdown("solution", "solution", false);

  if (await exists(join(dir, "output_validator"))) {
    issues.push("output_validator/: custom output validators aren't supported yet");
  }

  // Test data: data/sample and data/secret, .in/.ans pairs, plus test_group.yaml
  const tests: PackageTest[] = [];
  // Groups without a test_group.yaml use the default comparison
  const checkers = { sample: parseValidatorArgs([]), secret: parseValidatorArgs([]) };
  for (const group of ["sample", "secret"] as const) {
    const groupDir = `data/${group}`;
    const files = await listFiles(join(dir, groupDir));
    const stems = new Set<string>();

    for (const file of files) {
      if (file === "test_group.yaml") {
        const config = await readYaml(`${groupDir}/${file}`, testGroupYamlSchema);
        try {
          checkers[group] = parseValidatorArgs(config?.output_validator_args ?? []);
        } catch (err) {
          issues.push(`${groupDir}/${file}: ${(err as Error).message}`);
        }
      } else if (file.endsWith(".in") || file.endsWith(".ans")) {
        stems.add(file.replace(/\.(in|ans)$/, ""));
      } else {
        issues.push(`${groupDir}/${file}: unsupported test file (only .in, .ans and test_group.yaml)`);
      }
    }

    for (const stem of [...stems].sort()) {
      const inPath = `${groupDir}/${stem}.in`;
      const ansPath = `${groupDir}/${stem}.ans`;
      if (!files.includes(`${stem}.in`) || !files.includes(`${stem}.ans`)) {
        issues.push(`${groupDir}/${stem}: needs both a .in and a .ans file`);
        continue;
      }
      const limit = group === "sample" ? MAX_SAMPLE_FILE_BYTES : MAX_TEST_FILE_BYTES;
      const [input, answer] = [await readTracked(inPath), await readTracked(ansPath)];
      for (const [path, data] of [[inPath, input], [ansPath, answer]] as const) {
        if (data.length > limit) issues.push(`${path} is over the ${limit / 1024} KiB limit`);
      }
      tests.push({
        name: `${group}/${stem}`,
        isSample: group === "sample",
        input,
        answer,
        inputHash: digests.get(inPath)!,
        answerHash: digests.get(ansPath)!,
      });
    }
    if (stems.size === 0) issues.push(`${groupDir} has no tests`);
  }

  // One checker per problem: sample and secret must agree
  const checker = checkers.secret;
  if (JSON.stringify(checkers.sample) !== JSON.stringify(checkers.secret)) {
    issues.push("data/sample and data/secret must use the same output_validator_args");
  }

  if (issues.length > 0 || !problemYaml || !cglYaml || statementMarkdown === null) {
    throw new PackageError(dir, issues);
  }

  const name = problemYaml.name;
  return {
    uuid: problemYaml.uuid,
    slug: cglYaml.slug ?? basename(dir),
    title: typeof name === "string" ? name : name.en,
    difficulty: cglYaml.difficulty.toUpperCase() as ProblemPackage["difficulty"],
    tags: problemYaml.keywords ?? [],
    timeLimitMs: Math.round(problemYaml.limits.time_limit * 1000),
    memoryLimitMb: problemYaml.limits.memory,
    checker,
    statementMarkdown,
    editorialMarkdown,
    tests,
    hash: sha256(
      [...digests]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([path, digest]) => `${path}\0${digest}\n`)
        .join(""),
    ),
  };
}
