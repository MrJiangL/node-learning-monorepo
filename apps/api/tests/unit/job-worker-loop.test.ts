import { afterEach, describe, expect, it, vi } from "vitest";
import type { JobRepository } from "../../src/jobs/job.repository.js";
import { createMemoryJobQueue } from "../../src/jobs/memory-job-queue.js";
import { startJobWorkerLoop } from "../../src/jobs/job-worker-loop.js";

describe("job worker loop", () => {
  afterEach(() => {
    // 每个测试都把 fake timers 还原掉。
    //
    // 轮询 worker 的测试很依赖定时器状态；
    // 如果不清理，后面的测试可能会被前一个测试残留的 timer 影响。
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("会按 interval 处理 pending job", async () => {
    vi.useFakeTimers();

    const queue = createMemoryJobQueue();

    const job = await queue.create({
      type: "send-email",
      payload: {
        to: "user@example.com"
      }
    });

    const loop = startJobWorkerLoop({
      repository: queue,
      processor: async () => {},
      intervalMs: 1000
    });

    try {
      await vi.advanceTimersByTimeAsync(1000);

      const updatedJob = await queue.findById(job.id);

      expect(updatedJob?.status).toBe("completed");
    } finally {
      // 即使断言失败，也尽量停止 loop。
      //
      // 这类后台循环测试最怕“测试失败后 timer 还活着”，
      // 所以用 finally 做兜底清理。
      loop.stop();
    }
  });

  it("stop 后不会继续处理新任务", async () => {
    vi.useFakeTimers();

    const queue = createMemoryJobQueue();

    const loop = startJobWorkerLoop({
      repository: queue,
      processor: async () => {},
      intervalMs: 1000
    });

    loop.stop();

    const job = await queue.create({
      type: "send-email",
      payload: {
        to: "user@example.com"
      }
    });

    await vi.advanceTimersByTimeAsync(1000);

    const updatedJob = await queue.findById(job.id);

    expect(updatedJob?.status).toBe("pending");
  });

  it("处理过程抛出未捕获错误时会记录错误并继续运行", async () => {
    vi.useFakeTimers();

    const logger = {
      error: vi.fn()
    };

    const repository: JobRepository = {
      create: vi.fn(),
      list: vi.fn(),
      findById: vi.fn(),
      addLog: vi.fn(),
      nextPending: vi
        .fn()
        .mockRejectedValueOnce(new Error("database disconnected"))
        .mockResolvedValue(null),
      updateStatus: vi.fn(),
      incrementAttempts: vi.fn()
    };

    const loop = startJobWorkerLoop({
      repository,
      processor: async () => {},
      logger,
      intervalMs: 1000
    });

    try {
      await vi.advanceTimersByTimeAsync(1000);

      expect(logger.error).toHaveBeenCalledWith(
        "Job worker loop failed to process next job",
        expect.any(Error)
      );

      await vi.advanceTimersByTimeAsync(1000);

      expect(repository.nextPending).toHaveBeenCalledTimes(2);
    } finally {
      loop.stop();
    }
  });

  it("上一轮还没结束时不会重叠处理下一轮", async () => {
    vi.useFakeTimers();

    let finishProcessing: (() => void) | undefined;

    const queue = createMemoryJobQueue();

    await queue.create({
      type: "send-email",
      payload: {
        to: "user@example.com"
      }
    });

    const processor = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishProcessing = resolve;
        })
    );

    const loop = startJobWorkerLoop({
      repository: queue,
      processor,
      intervalMs: 1000
    });

    try {
      await vi.advanceTimersByTimeAsync(1000);

      expect(processor).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1000);

      expect(processor).toHaveBeenCalledTimes(1);

      finishProcessing?.();
      await vi.runOnlyPendingTimersAsync();
    } finally {
      loop.stop();
    }
  });
});
