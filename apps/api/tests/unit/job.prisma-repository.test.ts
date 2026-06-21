import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db/prisma.js";
import { createPrismaJobRepository } from "../../src/jobs/job.prisma-repository.js";

describe("prisma job repository", () => {
  beforeEach(async () => {
    await prisma.jobLog.deleteMany();
    await prisma.job.deleteMany();
  });

  it("可以创建 pending job 并写入 Job created 日志", async () => {
    const repository = createPrismaJobRepository();

    const job = await repository.create({
      type: "send-email",
      payload: {
        to: "user@example.com"
      },
      maxAttempts: 2
    });

    expect(job).toMatchObject({
      type: "send-email",
      payload: {
        to: "user@example.com"
      },
      status: "pending",
      attempts: 0,
      maxAttempts: 2
    });

    expect(job.logs).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: "Job created" })])
    );
  });

  it("相同 idempotencyKey 会返回已经创建过的 job", async () => {
    const repository = createPrismaJobRepository();

    const firstJob = await repository.create({
      type: "send-email",
      payload: {
        to: "user@example.com"
      },
      idempotencyKey: "same-create-job-request"
    });

    const secondJob = await repository.create({
      type: "send-email",
      payload: {
        to: "another@example.com"
      },
      idempotencyKey: "same-create-job-request"
    });

    expect(secondJob.id).toBe(firstJob.id);
    expect(secondJob.payload).toEqual({
      to: "user@example.com"
    });
    expect(secondJob.idempotencyKey).toBe("same-create-job-request");
  });

  it("findById 找不到时返回 null", async () => {
    const repository = createPrismaJobRepository();

    await expect(repository.findById("missing-job-id")).resolves.toBeNull();
  });

  it("可以返回数据库里的 job 列表", async () => {
    const repository = createPrismaJobRepository();

    const firstJob = await repository.create({
      type: "first-job",
      payload: {
        value: 1
      }
    });

    const secondJob = await repository.create({
      type: "second-job",
      payload: {
        value: 2
      }
    });

    const jobs = await repository.list();

    expect(jobs).toHaveLength(2);
    expect(jobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: firstJob.id,
          type: "first-job"
        }),
        expect.objectContaining({
          id: secondJob.id,
          type: "second-job"
        })
      ])
    );
  });

  it("addLog 可以给 job 追加日志", async () => {
    const repository = createPrismaJobRepository();

    const job = await repository.create({
      type: "generate-report",
      payload: {
        reportType: "weekly"
      }
    });

    const updatedJob = await repository.addLog(job.id, "Job processing started");

    expect(updatedJob?.logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "Job created" }),
        expect.objectContaining({ message: "Job processing started" })
      ])
    );
  });

  it("nextPending 返回最早创建的 pending job", async () => {
    const repository = createPrismaJobRepository();

    const firstJob = await repository.create({
      type: "first-job",
      payload: {}
    });

    await repository.create({
      type: "second-job",
      payload: {}
    });

    const pendingJob = await repository.nextPending();

    expect(pendingJob?.id).toBe(firstJob.id);
  });

  it("nextPending 没有 pending job 时返回 null", async () => {
    const repository = createPrismaJobRepository();

    const job = await repository.create({
      type: "send-email",
      payload: {}
    });

    await repository.updateStatus(job.id, "completed");

    await expect(repository.nextPending()).resolves.toBeNull();
  });

  it("updateStatus 可以更新任务状态", async () => {
    const repository = createPrismaJobRepository();

    const job = await repository.create({
      type: "send-email",
      payload: {}
    });

    const updatedJob = await repository.updateStatus(job.id, "processing");

    expect(updatedJob?.status).toBe("processing");
  });

  it("incrementAttempts 可以增加尝试次数", async () => {
    const repository = createPrismaJobRepository();

    const job = await repository.create({
      type: "send-email",
      payload: {}
    });

    const updatedJob = await repository.incrementAttempts(job.id);

    expect(updatedJob?.attempts).toBe(1);
  });
});
