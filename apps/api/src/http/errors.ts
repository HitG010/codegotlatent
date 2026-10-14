import type { ErrorRequestHandler, RequestHandler } from "express";
import { z } from "zod";

/** Throw from any handler; Express 5 forwards rejected promises here too. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const notFound: RequestHandler = () => {
  throw new HttpError(404, "not_found", "No such endpoint");
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof z.ZodError) {
    res.status(400).json({
      error: { code: "invalid_request", message: z.prettifyError(err), issues: err.issues },
    });
    return;
  }
  // body-parser marks malformed JSON and oversized bodies with a client status
  if (typeof err?.status === "number" && err.status >= 400 && err.status < 500) {
    res.status(err.status).json({ error: { code: "bad_request", message: err.message } });
    return;
  }
  req.log.error({ err }, "unhandled error");
  res.status(500).json({ error: { code: "internal", message: "Something went wrong" } });
};
