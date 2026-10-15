import { type RequestHandler, Router } from "express";
import { z } from "zod";
import type { Db } from "../db.js";
import { ACCESS_TOKEN_TTL_SECONDS, signAccessToken } from "../http/auth.js";
import { HttpError } from "../http/errors.js";
import { perUserLimit } from "../http/rate-limit.js";
import type { VerifyGoogleToken } from "./google.js";
import { clearSessionCookie, closeSession, openSession, resumeSession, SESSION_COOKIE, setSessionCookie } from "./sessions.js";
import { findOrCreateGoogleUser, type SessionUserRow, toSessionUser } from "./users.js";

export interface AuthDeps {
  db: Db;
  verifyGoogle: VerifyGoogleToken;
  accessTokenSecret: string;
  clientOrigin: string;
  secureCookies: boolean;
}

/**
 * These endpoints act on the session cookie, so they only accept requests
 * from our own web app. Browsers always send Origin on cross-origin POSTs.
 */
function requireOrigin(clientOrigin: string): RequestHandler {
  return (req, _res, next) => {
    if (req.get("origin") !== clientOrigin) throw new HttpError(403, "bad_origin", "Request blocked");
    next();
  };
}

export function authRouter({ db, verifyGoogle, accessTokenSecret, clientOrigin, secureCookies }: AuthDeps): Router {
  const router = Router();
  const sameOrigin = requireOrigin(clientOrigin);
  // Per IP: generous, since a whole campus can share one address at the start of a round
  const signInLimit = perUserLimit({ max: 30, windowMs: 10 * 60_000, message: "Too many sign-ins from your network. Try again in a few minutes." });

  const signedIn = (user: SessionUserRow) => ({
    accessToken: signAccessToken({ id: user.id, role: user.role }, accessTokenSecret),
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user: toSessionUser(user),
  });

  router.post("/auth/google", sameOrigin, signInLimit, async (req, res) => {
    const { credential } = z.object({ credential: z.string().min(1) }).parse(req.body);
    let identity;
    try {
      identity = await verifyGoogle(credential);
    } catch {
      throw new HttpError(401, "google_rejected", "Google sign-in didn't go through. Try again.");
    }
    const user = await findOrCreateGoogleUser(db, identity);
    const session = await openSession(db, user.id, req.get("user-agent") ?? null);
    setSessionCookie(res, session.token, session.expiresAt, secureCookies);
    res.json(signedIn(user));
  });

  router.post("/auth/refresh", sameOrigin, async (req, res) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    const resumed = typeof token === "string" ? await resumeSession(db, token) : null;
    if (!resumed) {
      clearSessionCookie(res, secureCookies);
      throw new HttpError(401, "signed_out", "You're signed out");
    }
    setSessionCookie(res, token as string, resumed.expiresAt, secureCookies);
    res.json(signedIn(resumed.user));
  });

  router.post("/auth/logout", sameOrigin, async (req, res) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token === "string") await closeSession(db, token);
    clearSessionCookie(res, secureCookies);
    res.status(204).end();
  });

  return router;
}
