import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

export function requestId(req: Request, res: Response, next: NextFunction) {
  const existingRequestId = req.header("x-request-id");
  const id = existingRequestId?.trim() || randomUUID();

  req.requestId = id;
  res.setHeader("X-Request-Id", id);

  next();
}
