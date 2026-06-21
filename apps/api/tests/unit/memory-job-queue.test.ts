import { describe, expect, it } from "vitest";
import { createMemoryJobQueue } from "../../src/jobs/memory-job-queue.js";

describe("memory job queue", () => {
  it("可以把任务加入队列", async () => {
    const queue = createMemoryJobQueue();

    const job = await queue.create({
      type: "send-email",
      payload: {
        to: "user@example.com"
      }
    });

    expect(job.type).toBe("send-email");
    expect(job.payload).toEqual({
      to: "user@example.com"
    });
    expect(job.status).toBe("pending");
    expect(job.id).toEqual(expect.any(String));
    expect(job.createdAt).toEqual(expect.any(String));
    expect(job.updatedAt).toEqual(expect.any(String));
    expect(job.attempts).toBe(0);
    expect(job.maxAttempts).toBe(3);
  });

  it("相同 idempotencyKey 会返回已经加入过的任务", async () => {
    const queue = createMemoryJobQueue();

    const firstJob = await queue.create({
      type: "send-email",
      payload: {
        to: "user@example.com"
      },
      idempotencyKey: "same-memory-job-request"
    });

    const secondJob = await queue.create({
      type: "send-email",
      payload: {
        to: "another@example.com"
      },
      idempotencyKey: "same-memory-job-request"
    });

    expect(secondJob.id).toBe(firstJob.id);
    expect(secondJob.payload).toEqual({
      to: "user@example.com"
    });
    expect(secondJob.idempotencyKey).toBe("same-memory-job-request");
  });

  it("可以自定义最大尝试次数", async () => {
    const queue = createMemoryJobQueue();

    const job = await queue.create({
      type: "send-email",
      payload: {
        to: "user@example.com"
      },
      maxAttempts: 5
    });

    expect(job.maxAttempts).toBe(5);
  });

  it("list 返回队列快照而不是内部数组", async () => {
    const queue = createMemoryJobQueue();

    await queue.create({
      type: "send-email",
      payload: {
        to: "user@example.com"
      }
    });

    const snapshot = await queue.list();

    snapshot.push({
      id: "fake-job",
      type: "fake",
      payload: {},
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3,
      logs: []
    });

    expect(snapshot).toHaveLength(2);
    await expect(queue.list()).resolves.toHaveLength(1);
  });

  it("nextPending 返回第一个 pending 任务", async () => {
    const queue = createMemoryJobQueue();

    const firstJob = await queue.create({
      type: "first-job",
      payload: {
        value: 1
      }
    });

    await queue.create({
      type: "second-job",
      payload: {
        value: 2
      }
    });

    await expect(queue.nextPending()).resolves.toEqual(firstJob);
  });

  it("可以按 id 更新任务状态", async () => {
    const queue = createMemoryJobQueue();

    const job = await queue.create({
      type: "send-email",
      payload: {
        to: "user@example.com"
      }
    });

    const updatedJob = await queue.updateStatus(job.id, "processing");

    expect(updatedJob?.status).toBe("processing");
    await expect(queue.nextPending()).resolves.toBeNull();
  });

  it("可以按 id 增加尝试次数", async () => {
    const queue = createMemoryJobQueue();

    const job = await queue.create({
      type: "send-email",
      payload: {
        to: "user@example.com"
      }
    });

    const updatedJob = await queue.incrementAttempts(job.id);

    expect(updatedJob?.attempts).toBe(1);
  });
});
