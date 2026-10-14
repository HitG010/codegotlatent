import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { HttpError } from "./errors.js";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

const accessClaimsSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(["USER", "ADMIN"]),
});

export interface AuthUser {
  id: string;
  role: "USER" | "ADMIN";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signAccessToken(user: AuthUser, secret: string): string {
  return jwt.sign({ role: user.role }, secret, {
    algorithm: "HS256",
    subject: user.id,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
}

function verifyAccessToken(token: string, secret: string): AuthUser {
  const claims = accessClaimsSchema.parse(jwt.verify(token, secret, { algorithms: ["HS256"] }));
  return { id: claims.sub, role: claims.role };
}

/**
 * Identity comes only from the signed token — never from a URL param or
 * request body, which is how v1 let callers act as other users.
 */
export function requireUser(secret: string): RequestHandler {
  return (req, _res, next) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
    if (!token) throw new HttpError(401, "unauthenticated", "Sign in to continue");
    try {
      req.user = verifyAccessToken(token, secret);
    } catch {
      throw new HttpError(401, "invalid_token", "Your session has expired");
    }
    next();
  };
}

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.user?.role !== "ADMIN") throw new HttpError(403, "forbidden", "Admins only");
  next();
};
