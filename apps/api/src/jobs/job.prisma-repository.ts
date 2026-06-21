import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { mapPrismaJobToJob } from "./job.mapper.js";
import type { CreateJobInput, JobRepository } from "./job.repository.js";
import { JobStatus } from "./job.js";

export const createPrismaJobRepository = (): JobRepository => {
  const findById = async (id: string) => {
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!job) {
      return null;
    }

    return mapPrismaJobToJob(job);
  };

  return {
    async create<TPayload>(input: CreateJobInput<TPayload>) {
      if (input.idempotencyKey) {
        const existingJob = await prisma.job.findUnique({
          where: {
            idempotencyKey: input.idempotencyKey
          },
          include: {
            logs: {
              orderBy: {
                createdAt: "asc"
              }
            }
          }
        });

        if (existingJob) {
          return mapPrismaJobToJob<TPayload>(existingJob);
        }
      }
      const job = await prisma.job.create({
        data: {
          id: crypto.randomUUID(),
          type: input.type,
          payload: input.payload as Prisma.InputJsonValue,
          status: "pending",
          maxAttempts: input.maxAttempts ?? 3,
          idempotencyKey: input.idempotencyKey ?? null,
          logs: {
            create: {
              id: crypto.randomUUID(),
              message: "Job created"
            }
          }
        },
        include: {
          logs: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      return mapPrismaJobToJob<TPayload>(job);
    },

    findById,

    async addLog(id: string, message: string) {
      const job = await prisma.job.findUnique({
        where: { id }
      });

      if (!job) {
        return null;
      }

      await prisma.jobLog.create({
        data: {
          id: crypto.randomUUID(),
          message,
          jobId: id
        }
      });

      return findById(id);
    },

    async nextPending() {
      const job = await prisma.job.findFirst({
        where: {
          status: "pending"
        },
        orderBy: {
          createdAt: "asc"
        },
        include: {
          logs: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      if (!job) {
        return null;
      }

      return mapPrismaJobToJob(job);
    },

    async updateStatus(id: string, status: JobStatus) {
      const job = await prisma.job.findUnique({ where: { id } });

      if (!job) {
        return null;
      }

      const updatedJob = await prisma.job.update({
        where: { id },
        data: { status },
        include: {
          logs: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      return mapPrismaJobToJob(updatedJob);
    },

    async incrementAttempts(id: string) {
      const job = await prisma.job.findUnique({
        where: { id }
      });

      if (!job) {
        return null;
      }

      const updatedJob = await prisma.job.update({
        where: { id },
        data: {
          attempts: {
            increment: 1
          }
        },
        include: {
          logs: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      return mapPrismaJobToJob(updatedJob);
    },

    async list() {
      const jobs = await prisma.job.findMany({
        // list 和 nextPending 都使用创建时间升序。
        //
        // 这样 GET /jobs 看到的顺序，和 worker 优先处理旧任务的规则是一致的。
        orderBy: {
          createdAt: "asc"
        },
        include: {
          logs: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      return jobs.map((job) => mapPrismaJobToJob(job));
    }
  };
};
