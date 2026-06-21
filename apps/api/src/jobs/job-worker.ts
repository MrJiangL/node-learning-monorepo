import type { Job } from "./job.js";
import type { JobRepository } from "./job.repository.js";

export type JobProcessor = (job: Job<unknown>) => Promise<void>;

export const processNextJob = async (
  queue: JobRepository,
  processor: JobProcessor
): Promise<Job<unknown> | null> => {
  const job = await queue.nextPending();

  if (!job) {
    // 没有 pending job 时，worker 没有东西可处理。
    //
    // 这里返回 null，比抛错更适合：
    // “队列暂时为空”是正常状态，不是系统异常。
    return null;
  }

  // worker 准备开始处理任务时，先把状态从 pending 改成 processing。
  //
  // 这样外部如果查看队列，就能知道这个任务已经被 worker 拿走处理了。
  await queue.updateStatus(job.id, "processing");
  await queue.addLog(job.id, "Job processing started");

  try {
    await processor(job);

    // processor 正常结束，说明这个任务处理成功。
    // 所以把状态更新成 completed。
    await queue.addLog(job.id, "Job completed");
    return await queue.updateStatus(job.id, "completed");
  } catch {
    // processor 抛错，说明这一次处理失败。
    //
    // 注意：失败一次不一定等于整个任务最终失败。
    // 如果还没达到 maxAttempts，就把它放回 pending，等待下一次 worker 再试。
    // 如果已经达到 maxAttempts，才把任务标记为 failed。
    await queue.addLog(job.id, "Job processing failed");
    const attemptedJob = await queue.incrementAttempts(job.id);

    if (!attemptedJob) {
      return null;
    }

    if (attemptedJob.attempts >= attemptedJob.maxAttempts) {
      return await queue.updateStatus(job.id, "failed");
    }

    return await queue.updateStatus(job.id, "pending");
  }
};
