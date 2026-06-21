# Task: MySQL 数据库队列：让 worker 依赖 JobRepository 接口

## 背景

现在你已经有两套能力：

```text
内存队列：createMemoryJobQueue()
数据库队列：createPrismaJobRepository()
```

但当前 worker 还直接依赖内存队列类型：

```ts
export type MemoryJobQueue = ReturnType<typeof createMemoryJobQueue>;

export const processNextJob = async (queue: MemoryJobQueue, processor: JobProcessor) => {
  // ...
};
```

这会导致一个问题：

```text
worker 只能处理内存队列，不能直接处理 PrismaJobRepository。
```

这张任务要做的是：

```text
让 worker 依赖 JobRepository 接口，而不是依赖 MemoryJobQueue。
```

这样以后 worker 就能处理：

```text
内存实现
MySQL 实现
未来的 BullMQ 实现
```

---

## 任务 1：修改 job-worker 的依赖类型

修改：

```text
apps/api/src/jobs/job-worker.ts
```

删除：

```ts
import type { createMemoryJobQueue } from "./memory-job-queue.js";

export type MemoryJobQueue = ReturnType<typeof createMemoryJobQueue>;
```

改成：

```ts
import type { JobRepository } from "./job.repository.js";
```

然后把：

```ts
queue: MemoryJobQueue;
```

改成：

```ts
queue: JobRepository;
```

学习点：

```text
worker 不应该关心任务存在哪里。

任务可以存在：
- 内存
- MySQL
- Redis
- BullMQ

worker 只需要关心：
- 怎么取下一个 pending job
- 怎么改状态
- 怎么记录日志
- 怎么增加 attempts
```

---

## 任务 2：让内存队列满足 JobRepository

修改：

```text
apps/api/src/jobs/memory-job-queue.ts
```

当前内存队列的方法是同步的：

```ts
nextPending(): Job<unknown> | null
updateStatus(...): Job<unknown> | null
```

但 `JobRepository` 是异步接口：

```ts
nextPending(): Promise<Job<unknown> | null>
updateStatus(...): Promise<Job<unknown> | null>
```

所以你需要把内存队列这些方法改成 `async`：

```ts
async nextPending(): Promise<Job<unknown> | null> {
  return jobs.find((job) => job.status === "pending") ?? null;
}
```

同理修改：

```text
create -> async create
findById -> 如果没有就先不用加
addLog -> async addLog
updateStatus -> async updateStatus
incrementAttempts -> async incrementAttempts
```

注意：

```text
内存队列当前没有 findById。
为了满足 JobRepository，你需要补一个 findById(id)。
```

可以这样写：

```ts
async findById(id: string): Promise<Job<unknown> | null> {
  return jobs.find((job) => job.id === id) ?? null;
}
```

---

## 任务 3：同步修改内存队列测试

修改：

```text
apps/api/tests/unit/memory-job-queue.test.ts
```

因为内存队列方法变成 async 了，测试也要改成 await：

```ts
const job = await queue.create(...)
```

或者如果你保留 `enqueue` 名字，就要决定：

```text
是继续叫 enqueue
还是为了接口统一改成 create
```

我的建议：

```text
为了和 JobRepository 对齐，把 enqueue 改成 create。
```

但这会影响已有测试和 jobs API。你可以按任务慢慢改，不要一次改乱。

---

## 任务 4：修改 worker 单元测试

修改：

```text
apps/api/tests/unit/job-worker.test.ts
```

因为 worker 现在调用的是异步 repository 方法，测试里这些地方也要 await：

```ts
const job = await queue.create(...)
const result = await processNextJob(queue, async () => {})
await expect(queue.nextPending()).resolves.toBeNull()
```

---

## 任务 5：保持 Prisma repository 测试通过

`PrismaJobRepository` 已经是异步接口，理论上不用大改。

但你要确认：

```bash
npm run test -w @learn/api -- tests/unit/job.prisma-repository.test.ts
```

仍然通过。

---

## 验证命令

```bash
npm run test -w @learn/api -- tests/unit/memory-job-queue.test.ts
npm run test -w @learn/api -- tests/unit/job-worker.test.ts
npm run test -w @learn/api -- tests/unit/job.prisma-repository.test.ts
npm run test -w @learn/api -- tests/integration/jobs.test.ts
npm run typecheck -w @learn/api
npm run format:check
```

---

## 完成标准

- [x] `processNextJob` 依赖 `JobRepository`
- [x] worker 不再 import `createMemoryJobQueue`
- [x] 内存队列补齐 `findById`
- [x] 内存队列方法改成 async 以满足 repository 接口
- [x] worker 单元测试通过
- [x] memory queue 单元测试通过
- [x] Prisma job repository 测试通过
- [x] jobs API 集成测试通过
- [x] `npm run typecheck -w @learn/api` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
worker 依赖 JobRepository 完成了
```
