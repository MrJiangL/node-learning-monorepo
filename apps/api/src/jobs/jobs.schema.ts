import { z } from "zod";

export const createJobSchema = z.object({
  type: z.string().trim().min(1, "Job type is required").max(100),
  payload: z.record(z.string(), z.unknown()).default({}),
  maxAttempts: z.number().int().min(1).max(10).optional(),
  idempotencyKey: z.string().trim().min(1).max(200).optional()
});
