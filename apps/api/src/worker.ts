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
    DATABASE_URL: z.string().min(1),
    JUDGE_URL: z.url().default("http://localhost:5050"),
    JUDGE_TOKEN: z.string().optional(),
    BLOB_DIR: z.string().default(".data/blobs"),
    JUDGE_CONCURRENCY: z.coerce.number().int().positive().default(2),
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
