import { pino } from "pino";
import { createApp } from "./app.js";
import { createDb } from "./db.js";
import { loadEnv } from "./env.js";

const env = loadEnv();
const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  // Request logs must never carry credentials
  redact: ["req.headers.authorization", "req.headers.cookie", 'res.headers["set-cookie"]'],
});
const db = createDb(env.DATABASE_URL);

const app = createApp({
  clientOrigin: env.CLIENT_ORIGIN,
  logger,
  pingDb: () => db.$queryRaw`SELECT 1`,
});

const server = app.listen(env.PORT, () => {
  logger.info(`API listening on :${env.PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close(() => {
      void db.$disconnect().finally(() => process.exit(0));
    });
  });
}
