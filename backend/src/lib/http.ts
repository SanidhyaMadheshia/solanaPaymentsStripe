import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, details?: unknown) => new HttpError(400, msg, "bad_request", details);
export const notFound = (msg = "Not found") => new HttpError(404, msg, "not_found");
export const conflict = (msg: string, details?: unknown) => new HttpError(409, msg, "conflict", details);

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ message: "Route not found", code: "not_found" });
}

// Express 5 forwards rejected promises from async handlers here automatically.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Invalid request",
      code: "validation_error",
      issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, code: err.code, ...(err.details ? { details: err.details } : {}) });
  }
  // body-parser errors (malformed JSON, payload too large)
  if (typeof err === "object" && err !== null && "status" in err && "type" in err) {
    const e = err as unknown as { status: number; message: string };
    return res.status(e.status).json({ message: e.message, code: "bad_request" });
  }
  console.error("Unhandled error:", err);
  return res.status(500).json({ message: "Internal server error", code: "internal" });
}
