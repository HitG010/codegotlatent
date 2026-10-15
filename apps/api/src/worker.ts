// The judging worker: takes queued submissions from Postgres and runs them in the sandbox.
//   pnpm --filter @cgl/api worker
import { pino } from "pino";
import { z } from "zod";
import { createDb } from "./db.js";
import { GoJudge } from "./judge/gojudge.js";
import { startWorker } from "./judge/worker.js";
import { FsBlobStore } from "./storage/blob-store.js";

const env = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1),
    JUDGE_URL: z.url().default("http://localhost:5050"),
    JUDGE_TOKEN: z.string().optional(),
    BLOB_DIR: z.string().default(".data/blobs"),
    JUDGE_CONCURRENCY: z.coerce.number().int().positive().default(2),
  })
  .refine((env) => env.NODE_ENV !== "production" || (env.JUDGE_TOKEN?.length ?? 0) >= 32, {
    path: ["JUDGE_TOKEN"],
    message: "required in production: at least 32 random characters, matching the judge server",
  })
  .parse(process.env);

const logger = pino({ level: "info" });
const db = createDb(env.DATABASE_URL);

const worker = startWorker(
  { db, sandbox: new GoJudge(env.JUDGE_URL, { token: env.JUDGE_TOKEN }), blobs: new FsBlobStore(env.BLOB_DIR), logger },
  { concurrency: env.JUDGE_CONCURRENCY },
);
logger.info(`judge worker running (${env.JUDGE_CONCURRENCY} at a time)`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void worker
      .stop()
      .then(() => db.$disconnect())
      .finally(() => process.exit(0));
  });
}
