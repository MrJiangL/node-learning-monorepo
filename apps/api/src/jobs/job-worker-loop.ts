import type { JobRepository } from "./job.repository.js";
import { processNextJob, type JobProcessor } from "./job-worker.js";

export type JobWorkerLoopLogger = {
  error(message: string, error: unknown): void;
};

export type StartJobWorkerLoopOptions = {
  repository: JobRepository;
  processor: JobProcessor;
  intervalMs?: number;
  logger?: JobWorkerLoopLogger;
};

export type JobWorkerLoopHandle = {
  stop(): void;
};

export const startJobWorkerLoop = (options: StartJobWorkerLoopOptions): JobWorkerLoopHandle => {
  // intervalMs 是轮询间隔。
  //
  // 不传时默认 1000ms，也就是每 1 秒检查一次 pending job。
  // 这里先保留简单默认值，后面接入 server.ts 时再考虑是否放进 env 配置。
  const intervalMs = options.intervalMs ?? 1000;

  const logger = options.logger ?? console;

  let isProcessing = false;

  const processSafely = async () => {
    if (isProcessing) {
      // 如果上一轮还没处理完，这一轮直接跳过。
      //
      // 这是同一个 Node 进程内的防重入保护：
      // 它能避免 setInterval 在慢任务场景下并发触发多次 processNextJob。
      return;
    }

    isProcessing = true;

    try {
      await processNextJob(options.repository, options.processor);
    } catch (error) {
      // processNextJob 内部已经会处理“单个 job 的业务失败”。
      //
      // 这里 catch 的是 worker loop 自己的运行异常，
      // 例如 repository 查询数据库时连接失败。
      // 记录错误后不 rethrow，下一轮 interval 仍然可以继续尝试处理任务。
      logger.error("Job worker loop failed to process next job", error);
    } finally {
      // 无论成功还是失败，都要释放运行中标记。
      //
      // 如果这里漏掉 finally，某次异常后 isProcessing 可能一直是 true，
      // worker loop 就会永久跳过后续轮询。
      isProcessing = false;
    }
  };

  const timer = setInterval(() => {
    // setInterval 不会等待 async 函数执行完。
    //
    // processNextJob 返回 Promise。
    // 这里用 void 明确表达：这个 loop 只负责定时触发，
    // 暂时不等待每次处理结果，也不把结果返回给调用方。
    void processSafely();
  }, intervalMs);

  return {
    stop() {
      // stop 是后台 loop 的清理入口。
      //
      // 测试里要调用它，未来服务关闭时也会调用它，
      // 否则定时器会一直留在 Node 进程里。
      clearInterval(timer);
    }
  };
};
