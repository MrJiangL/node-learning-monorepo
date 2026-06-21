import { describe, expect, it } from "vitest";
import { processNextJob } from "../../src/jobs/job-worker.js";
import { createMemoryJobQueue } from "../../src/jobs/memory-job-queue.js";

describe("job worker", () => {
  it("没有 pending job 时返回 null", async () => {
    const queue = createMemoryJobQueue();

    const result = await processNextJob(queue, async () => {
      throw new Error("processor should not be called");
    });

    expect(result).toBeNull();
  });

  it("processor 成功时把任务标记为 completed", async () => {
    const queue = createMemoryJobQueue();

    const job = await queue.create({
      type: "send-email",
      payload: {
        to: "user@example.com"
      }
    });

    const result = await processNextJob(queue, async (pendingJob) => {
      expect(pendingJob.id).toBe(job.id);
    });

    expect(result?.id).toBe(job.id);
    expect(result?.status).toBe("completed");
    await expect(queue.nextPending()).resolves.toBeNull();
  });

  it("processor 第一次失败且未达上限时把任务放回 pending", async () => {
    const queue = createMemoryJobQueue();

    const job = await queue.create({
      type: "send-email",
      payload: {
        to: "user@example.com"
      }
    });

    const result = await processNextJob(queue, async () => {
      throw new Error("send email failed");
    });

    expect(result?.id).toBe(job.id);
    expect(result?.status).toBe("pending");
    expect(result?.attempts).toBe(1);
    await expect(queue.nextPending()).resolves.toEqual(result);
  });

  it("processor 失败达到最大次数时把任务标记为 failed", async () => {
    const queue = createMemoryJobQueue();

    const job = await queue.create({
      type: "send-email",
      payload: {
        to: "user@example.com"
      },
      maxAttempts: 1
    });

    const result = await processNextJob(queue, async () => {
      throw new Error("send email failed");
    });

    expect(result?.id).toBe(job.id);
    expect(result?.status).toBe("failed");
    expect(result?.attempts).toBe(1);
    await expect(queue.nextPending()).resolves.toBeNull();
  });

  it("processor 成功时记录处理开始和完成日志", async () => {
    const queue = createMemoryJobQueue();

    const job = await queue.create({
      type: "send-email",
      payload: {
        to: "user@example.com"
      }
    });

    const result = await processNextJob(queue, async () => {});

    expect(result?.id).toBe(job.id);
    expect(result?.logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "Job created" }),
        expect.objectContaining({ message: "Job processing started" }),
        expect.objectContaining({ message: "Job completed" })
      ])
    );
  });

  it("processor 失败时记录处理失败日志", async () => {
    const queue = createMemoryJobQueue();

    const job = await queue.create({
      type: "send-email",
      payload: {
        to: "user@example.com"
      },
      maxAttempts: 1
    });

    const result = await processNextJob(queue, async () => {
      throw new Error("send email failed");
    });

    expect(result?.id).toBe(job.id);
    expect(result?.logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "Job created" }),
        expect.objectContaining({ message: "Job processing started" }),
        expect.objectContaining({ message: "Job processing failed" })
      ])
    );
  });
});
