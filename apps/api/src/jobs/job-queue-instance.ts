import { createPrismaJobRepository } from "./job.prisma-repository.js";

// 真实 API 默认使用 MySQL 保存后台任务。
//
// 这里是“依赖装配”的位置：
// - jobs.routes.ts 只知道自己需要 JobRepository
// - job-worker.ts 也只知道自己需要 JobRepository
// - 至于真实运行时用 Prisma 还是内存，由这里统一决定
//
// 这样后面如果要换成 BullMQ / Redis 队列，也可以优先改装配层，
// 尽量少影响业务路由和 worker 逻辑。
export const jobQueue = createPrismaJobRepository();
