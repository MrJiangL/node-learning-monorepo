import type { Job as PrismaJobModel, JobLog as PrismaJobLogModel } from "@prisma/client";
import type { Job, JobLog, JobStatus } from "./job.js";

type PrismaJobWithLogs = PrismaJobModel & {
  logs: PrismaJobLogModel[];
};

const mapPrismaJobLogToJobLog = (log: PrismaJobLogModel): JobLog => ({
  message: log.message,
  createdAt: log.createdAt.toISOString()
});

export const mapPrismaJobToJob = <TPayload = unknown>(job: PrismaJobWithLogs): Job<TPayload> => ({
  id: job.id,
  type: job.type,
  payload: job.payload as TPayload,
  status: job.status as JobStatus,
  createdAt: job.createdAt.toISOString(),
  updatedAt: job.updatedAt.toISOString(),
  attempts: job.attempts,
  maxAttempts: job.maxAttempts,
  logs: job.logs.map(mapPrismaJobLogToJobLog),
  idempotencyKey: job.idempotencyKey
});
