import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express, type Router } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import type { Logger } from "pino";
import { errorHandler, notFound } from "./http/errors.js";

export interface AppDeps {
  clientOrigin: string;
  /**
   * Header holding the visitor's IP, set by the proxy in front of the API
   * (cf-connecting-ip behind Cloudflare). Becomes `req.ip`. Only safe when
   * nothing can reach the API except through that proxy, which overwrites it.
   */
  clientIpHeader?: string | undefined;
  logger: Logger;
  /** Liveness probe for the database; resolves when it answers. */
  pingDb: () => Promise<unknown>;
  routers?: Router[];
}

export function createApp({ clientOrigin, clientIpHeader, logger, pingDb, routers = [] }: AppDeps): Express {
  const app = express();
  app.disable("x-powered-by");
  // One proxy hop, for X-Forwarded-Proto and, without clientIpHeader, X-Forwarded-For
  app.set("trust proxy", 1);

  if (clientIpHeader) {
    app.use((req, _res, next) => {
      const ip = req.get(clientIpHeader)?.trim();
      if (ip) Object.defineProperty(req, "ip", { value: ip, configurable: true, enumerable: true });
      next();
    });
  }
  // The socket's address is the proxy's; log the visitor's
  app.use(pinoHttp({ logger, customProps: (req) => ({ clientIp: (req as express.Request).ip }) }));
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
