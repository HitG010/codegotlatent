import { randomInt } from "node:crypto";
import type { SessionUser } from "@cgl/shared";
import type { Db } from "../db.js";
import type { GoogleIdentity } from "./google.js";
import { SESSION_USER } from "./sessions.js";

export interface SessionUserRow {
  id: string;
  username: string;
  name: string | null;
  role: "USER" | "ADMIN";
  handleConfirmedAt: Date | null;
}

export function toSessionUser(user: SessionUserRow): SessionUser {
  return {
    id: user.id,
    handle: user.username,
    name: user.name,
    role: user.role,
    handleConfirmed: user.handleConfirmedAt !== null,
  };
}

/** A placeholder handle from the email, e.g. "riya.m@…" → "riya_m_4821". Replaced when the user picks one. */
export function provisionalHandle(email: string): string {
  const base = email
    .split("@")[0]!
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 14);
  return `${base.length >= 2 ? base : "player"}_${randomInt(1000, 10000)}`;
}

export const isUniqueViolation = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";

/** Finds the user for a Google account, linking by email if needed, or creates one. */
export async function findOrCreateGoogleUser(db: Db, identity: GoogleIdentity): Promise<SessionUserRow> {
  const byGoogle = await db.user.findUnique({ where: { googleId: identity.googleId }, select: SESSION_USER });
  if (byGoogle) return byGoogle;

  const byEmail = await db.user.findUnique({ where: { email: identity.email }, select: { id: true } });
  if (byEmail) {
    return db.user.update({ where: { id: byEmail.id }, data: { googleId: identity.googleId }, select: SESSION_USER });
  }

  // A generated handle can collide; a fresh suffix almost always clears it
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.user.create({
        data: {
          email: identity.email,
          googleId: identity.googleId,
          name: identity.name,
          username: provisionalHandle(identity.email),
        },
        select: SESSION_USER,
      });
    } catch (error) {
      if (!isUniqueViolation(error) || attempt >= 4) throw error;
    }
  }
}
