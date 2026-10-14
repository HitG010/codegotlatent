// Publishes problem packages to the database and blob store.
//   pnpm --filter @cgl/api problems:import [--practice] <package-dir>...
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { loadPackage, PackageError } from "@cgl/problem-package";
import { createDb } from "../db.js";
import { publishProblem } from "../problems/publish.js";
import { FsBlobStore } from "../storage/blob-store.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { practice: { type: "boolean", default: false } },
});

const databaseUrl = process.env["DATABASE_URL"];
if (positionals.length === 0 || !databaseUrl) {
  console.error("usage: problems:import [--practice] <package-dir>...  (needs DATABASE_URL)");
  process.exit(1);
}

const db = createDb(databaseUrl);
const blobs = new FsBlobStore(process.env["BLOB_DIR"] ?? ".data/blobs");
let failures = 0;

// pnpm runs package scripts from apps/api; resolve paths from where you typed the command
const invokedFrom = process.env["INIT_CWD"] ?? process.cwd();

for (const dir of positionals) {
  try {
    const pkg = await loadPackage(resolve(invokedFrom, dir));
    const result = await publishProblem(db, blobs, pkg, { listInPractice: values.practice });
    console.log(`${result.status.padEnd(9)} ${result.slug} (v${result.version})`);
  } catch (err) {
    failures++;
    console.error(err instanceof PackageError ? err.message : `${dir}: ${(err as Error).message}`);
  }
}

await db.$disconnect();
process.exit(failures > 0 ? 1 : 0);
