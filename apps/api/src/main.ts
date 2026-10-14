import { pino } from "pino";
import { createApp } from "./app.js";
import { createGoogleVerifier } from "./auth/google.js";
import { GoJudge } from "./judge/gojudge.js";
import { judgeLimits, problemsRouter } from "./problems/routes.js";
import { contestsRouter } from "./contests/routes.js";
import { authRouter } from "./auth/routes.js";
import { createDb } from "./db.js";
import { loadEnv } from "./env.js";
import { meRouter } from "./me/routes.js";
import { usersRouter } from "./users/routes.js";

const env = loadEnv();
const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  // Request logs must never carry credentials
  redact: ["req.headers.authorization", "req.headers.cookie", 'res.headers["set-cookie"]'],
});
const db = createDb(env.DATABASE_URL);
const sandbox = new GoJudge(env.JUDGE_URL);
// Practice and contest judging share one budget per user
const limits = judgeLimits();

const app = createApp({
  clientOrigin: env.CLIENT_ORIGIN,
  logger,
  pingDb: () => db.$queryRaw`SELECT 1`,
  routers: [
    authRouter({
      db,
      verifyGoogle: createGoogleVerifier(env.GOOGLE_CLIENT_ID),
      accessTokenSecret: env.ACCESS_TOKEN_SECRET,
      clientOrigin: env.CLIENT_ORIGIN,
      secureCookies: env.NODE_ENV === "production",
    }),
    meRouter({ db, accessTokenSecret: env.ACCESS_TOKEN_SECRET }),
    problemsRouter({ db, sandbox, accessTokenSecret: env.ACCESS_TOKEN_SECRET }, limits),
    contestsRouter({ db, sandbox, accessTokenSecret: env.ACCESS_TOKEN_SECRET }, limits),
    usersRouter({ db, accessTokenSecret: env.ACCESS_TOKEN_SECRET }),
  ],
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
