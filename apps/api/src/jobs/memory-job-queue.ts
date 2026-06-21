import { randomUUID } from "node:crypto";
import type { Job, JobStatus } from "./job.js";
import type { CreateJobInput, JobRepository } from "./job.repository.js";

export type EnqueueJobInput<TPayload> = {
  type: string;
  payload: TPayload;
  maxAttempts?: number;
};

export type MemoryJobQueue = JobRepository & {
  // enqueue 是之前内存队列阶段的名字。
  //
  // 当前阶段我们推荐业务代码改用 create，
  // 但保留 enqueue 作为兼容别名，方便你对比“队列语言”和“Repository 语言”的差异。
  enqueue<TPayload>(input: EnqueueJobInput<TPayload>): Promise<Job<TPayload>>;
};

export const createMemoryJobQueue = (): MemoryJobQueue => {
  const jobs: Job<unknown>[] = [];

  const create = async <TPayload>(input: CreateJobInput<TPayload>): Promise<Job<TPayload>> => {
    const now = new Date().toISOString();

    if (input.idempotencyKey) {
      const existingJob = jobs.find((job) => job.idempotencyKey === input.idempotencyKey);

      if (existingJob) {
        return existingJob as Job<TPayload>;
      }
    }
    // create 的职责是把“用户提交的任务信息”包装成一个真正的 Job。
    //
    // input 至少有 type / payload。
    // 但进入队列后，任务还需要 id / status / createdAt / updatedAt。
    //
    // attempts 从 0 开始，表示还没有真正处理过。
    // maxAttempts 不传时默认是 3，表示最多允许失败后重试到第 3 次。
    const job: Job<TPayload> = {
      id: randomUUID(),
      type: input.type,
      payload: input.payload,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 3,
      idempotencyKey: input.idempotencyKey ?? null,
      logs: [
        {
          message: "Job created",
          createdAt: now
        }
      ]
    };

    // jobs 数组统一保存 Job<unknown>。
    //
    // 队列内部并不关心 payload 的具体类型，只负责保存任务。
    jobs.push(job);

    return job;
  };

  const replaceJob = (
    id: string,
    createNextJob: (job: Job<unknown>) => Job<unknown>
  ): Job<unknown> | null => {
    const index = jobs.findIndex((job) => job.id === id);

    if (index === -1) {
      return null;
    }

    const currentJob = jobs[index];

    if (!currentJob) {
      return null;
    }

    const nextJob = createNextJob(currentJob);
    jobs[index] = nextJob;

    return nextJob;
  };

  return {
    create,

    enqueue: create,

    async list(): Promise<Job<unknown>[]> {
      // 返回数组拷贝，避免调用方直接修改内部 jobs 数组。
      //
      // 虽然内存数组读取本身不是异步的，但这里依然返回 Promise，
      // 是为了和 PrismaJobRepository 这种数据库实现保持同一个接口形状。
      //
      // 如果直接 return jobs，外部就可以 queue.list().push(...)
      // 这样会绕过 enqueue，破坏队列自己的管理规则。
      return [...jobs];
    },

    async findById(id: string): Promise<Job<unknown> | null> {
      return jobs.find((job) => job.id === id) ?? null;
    },

    async nextPending(): Promise<Job<unknown> | null> {
      // 找到第一个还没开始处理的任务。
      //
      // find 找不到时会返回 undefined。
      // 这里统一转成 null，让调用方更明确地判断“没有任务”。
      return jobs.find((job) => job.status === "pending") ?? null;
    },

    async updateStatus(id: string, status: JobStatus): Promise<Job<unknown> | null> {
      return replaceJob(id, (job) => ({
        ...job,
        status,
        updatedAt: new Date().toISOString()
      }));
    },

    async incrementAttempts(id: string): Promise<Job<unknown> | null> {
      // 每次 processor 处理失败后，worker 会调用这里记录一次尝试。
      //
      // 这个计数后面用来判断：
      // - 还能不能继续重试
      // - 还是已经达到上限，需要最终 failed
      return replaceJob(id, (job) => ({
        ...job,
        attempts: job.attempts + 1,
        updatedAt: new Date().toISOString()
      }));
    },

    async addLog(id: string, message: string): Promise<Job<unknown> | null> {
      const now = new Date().toISOString();

      return replaceJob(id, (job) => ({
        ...job,
        logs: [
          ...job.logs,
          {
            message,
            createdAt: now
          }
        ],
        updatedAt: now
      }));
    }
  };
};
