import { execFileSync } from "node:child_process";

/** Brings the test database up to date before database tests run. */
export default function migrateTestDb() {
  const url = process.env["TEST_DATABASE_URL"];
  if (!url) return;
  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "ignore",
  });
}
