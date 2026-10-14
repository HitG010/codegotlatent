import type { RequestHandler } from "express";
import { HttpError } from "./errors.js";

/**
 * A per-user limit over a sliding window, kept in this process's memory.
 * Enough for one API instance; moves to Redis when there's more than one.
 */
export function perUserLimit({ max, windowMs, message }: { max: number; windowMs: number; message: string }): RequestHandler {
  const hits = new Map<string, number[]>();
  return (req, res, next) => {
    const key = req.user?.id ?? req.ip ?? "anonymous";
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      res.setHeader("retry-after", String(Math.ceil((windowMs - (now - recent[0]!)) / 1000)));
      throw new HttpError(429, "rate_limited", message);
    }
    recent.push(now);
    hits.set(key, recent);
    next();
  };
}
