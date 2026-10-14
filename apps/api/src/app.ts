import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express, type Router } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import type { Logger } from "pino";
import { errorHandler, notFound } from "./http/errors.js";

export interface AppDeps {
  clientOrigin: string;
  logger: Logger;
  /** Liveness probe for the database; resolves when it answers. */
  pingDb: () => Promise<unknown>;
  routers?: Router[];
}

export function createApp({ clientOrigin, logger, pingDb, routers = [] }: AppDeps): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(pinoHttp({ logger }));
  app.use(helmet());
  app.use(cors({ origin: clientOrigin, credentials: true }));
  // Largest legitimate body is a code submission; test data goes to object storage
  app.use(express.json({ limit: "256kb" }));
  app.use(cookieParser());

  app.get("/health", async (_req, res) => {
    const db = await pingDb().then(
      () => "up" as const,
      () => "down" as const,
    );
    res.status(db === "up" ? 200 : 503).json({ ok: db === "up", db });
  });

  for (const router of routers) app.use(router);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
