// Schedules a contest from a YAML spec (see contests/example.yaml).
//   pnpm --filter @cgl/api contests:create <spec.yaml>
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { createContest, type ContestSpec } from "../contests/create.js";
import { createDb } from "../db.js";

const [file] = process.argv.slice(2);
const databaseUrl = process.env["DATABASE_URL"];
if (!file || !databaseUrl) {
  console.error("usage: contests:create <spec.yaml>  (needs DATABASE_URL)");
  process.exit(1);
}

const db = createDb(databaseUrl);
let code = 0;
try {
  // pnpm runs package scripts from apps/api; resolve the path from where you typed the command
  const path = resolve(process.env["INIT_CWD"] ?? process.cwd(), file);
  const spec = parseYaml(await readFile(path, "utf8")) as ContestSpec;
  const { warnings } = await createContest(db, spec);
  for (const warning of warnings) console.warn(`warning: ${warning}`);
  const contest = await db.contest.findUniqueOrThrow({ where: { slug: spec.slug }, select: { guessOpensAt: true, startsAt: true, endsAt: true } });
  console.log(`scheduled ${spec.slug}`);
  console.log(`  guesses open  ${contest.guessOpensAt.toLocaleString()}`);
  console.log(`  starts        ${contest.startsAt.toLocaleString()}`);
  console.log(`  ends          ${contest.endsAt.toLocaleString()}`);
} catch (error) {
  code = 1;
  console.error(error instanceof z.ZodError ? z.prettifyError(error) : (error as Error).message);
} finally {
  await db.$disconnect();
}
process.exit(code);
