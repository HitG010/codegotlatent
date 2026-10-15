import type { RequestHandler } from "express";
import { HttpError } from "./errors.js";

/**
 * A limit over a sliding window, per signed-in user or else per IP, kept in
 * this process's memory. Enough for one API instance; moves to Redis when
 * there's more than one.
 */
export function perUserLimit({ max, windowMs, message }: { max: number; windowMs: number; message: string }): RequestHandler {
  const hits = new Map<string, number[]>();
  let nextSweep = Date.now() + windowMs;
  return (req, res, next) => {
    const key = req.user?.id ?? req.ip ?? "anonymous";
    const now = Date.now();
    // Forget keys whose window has passed, so one-off visitors don't pile up
    if (now >= nextSweep) {
      for (const [k, times] of hits) if (now - times[times.length - 1]! >= windowMs) hits.delete(k);
      nextSweep = now + windowMs;
    }
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
