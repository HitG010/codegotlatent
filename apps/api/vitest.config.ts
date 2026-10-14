import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  test: {
    globalSetup: ["./src/test/migrate-test-db.ts"],
    // Database test files share one database and wipe tables with TRUNCATE ... CASCADE;
    // run in parallel, their cascades can deadlock each other
    fileParallelism: false,
  },
});
