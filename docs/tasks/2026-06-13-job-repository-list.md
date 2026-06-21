# Task: MySQL 数据库队列：给 JobRepository 补 list 能力

## 背景

上一张任务里，你已经把 worker 从“依赖内存队列”改成了“依赖 JobRepository 接口”。

现在还有一个小问题：

```text
POST /jobs/process-next 可以用 JobRepository 处理任务。
但 GET /jobs 现在还依赖内存队列自己的 list()。
```

也就是说，现在的结构大概是：

```text
worker:
  只需要 JobRepository

jobs API:
  create / process-next 接近 Repository 风格
  list 还依赖内存队列额外能力
```

所以这张任务先不急着把 API 直接切到 Prisma。

这张任务只做一件事：

```text
把 list() 也变成 JobRepository 的正式能力。
```

这样下一张任务再切换到 PrismaJobRepository 时，API 就不会因为 `GET /jobs` 缺能力而卡住。

---

## 任务 1：给 JobRepository 增加 list()

修改：

```text
apps/api/src/jobs/job.repository.ts
```

在 `JobRepository` 里增加：

```ts
list(): Promise<Job<unknown>[]>;
```

完整结构大概变成：

```ts
export type JobRepository = {
  create<TPayload>(input: CreateJobInput<TPayload>): Promise<Job<TPayload>>;
  list(): Promise<Job<unknown>[]>;
  findById(id: string): Promise<Job<unknown> | null>;
  addLog(id: string, message: string): Promise<Job<unknown> | null>;
  nextPending(): Promise<Job<unknown> | null>;
  updateStatus(id: string, status: JobStatus): Promise<Job<unknown> | null>;
  incrementAttempts(id: string): Promise<Job<unknown> | null>;
};
```

学习点：

```text
接口不是越大越好。

但如果 API 和 worker 都需要某个能力，
而且内存实现和数据库实现都能合理提供这个能力，
那它就适合进入 Repository 接口。
```

---

## 任务 2：让内存队列的 list 变成 async

修改：

```text
apps/api/src/jobs/memory-job-queue.ts
```

把：

```ts
list(): Job<unknown>[] {
  return [...jobs];
}
```

改成：

```ts
async list(): Promise<Job<unknown>[]> {
  // 返回数组拷贝，避免调用方直接修改内部 jobs 数组。
  //
  // 即使现在是内存数组，也保持 async，
  // 是为了和 PrismaJobRepository 的数据库查询接口保持一致。
  return [...jobs];
}
```

注意：

```text
改成 async 后，所有调用 queue.list() 的地方都要 await。
```

---

## 任务 3：让 PrismaJobRepository 实现 list()

修改：

```text
apps/api/src/jobs/job.prisma-repository.ts
```

在 return 对象里增加：

```ts
async list() {
  const jobs = await prisma.job.findMany({
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
```

为什么这里用 `createdAt: "asc"`？

```text
后台任务通常按创建时间排队。

asc 表示旧任务在前，新任务在后。
这和 nextPending() 取最早 pending job 的规则保持一致。
```

---

## 任务 4：修改 jobs API 的 list 调用

修改：

```text
apps/api/src/jobs/jobs.routes.ts
```

现在 `queue.list()` 变成异步了，所以这里要改成：

```ts
response.json({
  success: true,
  data: await queue.list()
});
```

同时可以把 `MemoryJobQueue` 类型逐步收窄。

如果 `JobRepository` 已经包含 `list()`，那么 `CreateJobsRouterOptions` 可以直接依赖：

```ts
import type { JobRepository } from "./job.repository.js";

export type CreateJobsRouterOptions = {
  queue?: JobRepository;
};
```

学习点：

```text
API 层不应该知道“这个队列是内存队列”。

它只需要知道：
- 可以 create job
- 可以 list jobs
- 可以 process-next
```

---

## 任务 5：同步修改测试

修改：

```text
apps/api/tests/unit/memory-job-queue.test.ts
apps/api/tests/unit/job.prisma-repository.test.ts
apps/api/tests/integration/jobs.test.ts
```

你至少要做：

```text
1. memory queue 测试里的 queue.list() 改成 await queue.list()
2. Prisma repository 测试补一个 list 用例
3. jobs API 集成测试继续通过
```

Prisma repository 的 list 测试可以这样写：

```ts
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
```

这里不用太纠结排序断言。

因为这个测试的重点是：

```text
PrismaJobRepository 确实提供了 list() 能力。
```

排序规则可以交给 `nextPending()` 的测试继续覆盖。

---

## 验证命令

```bash
npm run test -w @learn/api -- tests/unit/memory-job-queue.test.ts
npm run test -w @learn/api -- tests/unit/job.prisma-repository.test.ts
npm run test -w @learn/api -- tests/integration/jobs.test.ts
npm run typecheck -w @learn/api
npm run format:check
```

---

## 完成标准

- [x] `JobRepository` 增加 `list(): Promise<Job<unknown>[]>`
- [x] `MemoryJobQueue.list()` 改成 async
- [x] `PrismaJobRepository` 实现 `list()`
- [x] jobs API 的 `GET /jobs` 使用 `await queue.list()`
- [x] memory queue 测试通过
- [x] Prisma job repository 测试通过，并覆盖 list
- [x] jobs API 集成测试通过
- [x] `npm run typecheck -w @learn/api` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
JobRepository list 完成了
```
