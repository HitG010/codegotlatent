import { createHash, randomBytes } from "node:crypto";
import type { Response } from "express";
import type { Db } from "../db.js";

export const SESSION_COOKIE = "cgl_session";
// Sliding: every refresh pushes expiry out again, so active users stay signed in
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const SESSION_USER = { id: true, username: true, name: true, role: true, handleConfirmedAt: true } as const;

/** Starts a session for one device. The raw token goes to the browser; only its hash is stored. */
export async function openSession(db: Db, userId: string, userAgent: string | null) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({ data: { userId, tokenHash: hashToken(token), userAgent, expiresAt } });
  return { token, expiresAt };
}

/** Returns the session's user and its new expiry, or null if the token is unknown, revoked or expired. */
export async function resumeSession(db: Db, token: string) {
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, revokedAt: true, expiresAt: true, user: { select: SESSION_USER } },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;

  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date(), expiresAt } });
  return { user: session.user, expiresAt };
}

export async function closeSession(db: Db, token: string): Promise<void> {
  await db.session.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// Scoped to /auth so the token only travels to the endpoints that use it
const cookieOptions = (secure: boolean) => ({ httpOnly: true, secure, sameSite: "lax" as const, path: "/auth" });

export function setSessionCookie(res: Response, token: string, expiresAt: Date, secure: boolean): void {
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(secure), expires: expiresAt });
}

export function clearSessionCookie(res: Response, secure: boolean): void {
  res.clearCookie(SESSION_COOKIE, cookieOptions(secure));
}

export { SESSION_USER };
