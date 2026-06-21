# Task: MySQL 数据库队列：API 默认使用 PrismaJobRepository

## 背景

现在你已经把后台任务抽象成了 `JobRepository`：

```text
MemoryJobQueue 实现了 JobRepository
PrismaJobRepository 也实现了 JobRepository
worker 只依赖 JobRepository
jobs API 也只依赖 JobRepository
```

这说明一个关键点：

```text
API 和 worker 已经不需要知道“任务到底存在内存还是 MySQL”。
```

这张任务要做的是：

```text
让真实 API 默认使用 PrismaJobRepository。
```

但测试里依然可以传入 `createMemoryJobQueue()`。

这就是依赖注入的价值：

```text
真实运行：
  使用 MySQL repository

测试运行：
  注入内存 repository
```

---

## 任务 1：修改全局 jobQueue 实例

修改：

```text
apps/api/src/jobs/job-queue-instance.ts
```

现在它大概是：

```ts
import { createMemoryJobQueue } from "./memory-job-queue.js";

// 学习阶段先用进程内存保存任务。
//
// 注意：真实生产环境不能依赖这种内存队列。
// 因为服务重启后，内存里的 jobs 会全部丢失。
export const jobQueue = createMemoryJobQueue();
```

这次把它改成 Prisma：

```ts
import { createPrismaJobRepository } from "./job.prisma-repository.js";

// 真实 API 默认使用 MySQL 保存后台任务。
//
// 这样任务不会因为 Node 进程重启而丢失。
// worker / jobs API 依然只依赖 JobRepository，
// 所以它们不需要知道底层是不是 Prisma。
export const jobQueue = createPrismaJobRepository();
```

学习点：

```text
这不是改 worker，也不是改 route。

这是改“依赖装配位置”。
```

可以把它理解成：

```text
业务代码问：给我一个 JobRepository。
装配代码决定：这次给你 PrismaJobRepository。
```

---

## 任务 2：确认 jobs API 集成测试仍然可以用内存队列

打开：

```text
apps/api/tests/integration/jobs.test.ts
```

你应该能看到类似：

```ts
const createJobsTestApp = () => {
  return createApp({
    jobQueue: createMemoryJobQueue()
  });
};
```

这里先不要改成 Prisma。

原因是：

```text
这组测试主要测 HTTP 行为。

如果每个 API 测试都直接连 MySQL，
测试会变慢，也更容易被数据库状态影响。
```

所以这张任务里我们保留：

```text
生产默认用 Prisma
测试注入内存 repository
```

---

## 任务 3：补一个“默认装配”的测试

新增或修改：

```text
apps/api/tests/integration/jobs.test.ts
```

补一个小测试，确认 `createApp()` 不传 `jobQueue` 时也能正常创建 job。

示例：

```ts
it("createApp 默认使用 Prisma job repository 创建任务", async () => {
  // 这个测试故意不传 jobQueue。
  // 它验证的是 app 的默认依赖装配：
  // createApp() -> jobs router -> 默认 jobQueue -> PrismaJobRepository。
  const app = createApp();

  const response = await request(app)
    .post("/jobs")
    .send({
      type: "send-email",
      payload: {
        to: "user@example.com"
      }
    });

  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);
  expect(response.body.data).toMatchObject({
    type: "send-email",
    status: "pending"
  });
});
```

注意：

```text
这个测试会写 MySQL。
所以你需要在测试前清理 Job / JobLog 表。
```

可以在 `jobs.test.ts` 里引入：

```ts
import { prisma } from "../../src/db/prisma.js";
```

然后在这个测试前清理：

```ts
await prisma.jobLog.deleteMany();
await prisma.job.deleteMany();
```

为什么先删 `jobLog`？

```text
JobLog 依赖 Job。

如果先删 Job，数据库可能会因为外键关系不允许删除。
所以先删子表 JobLog，再删父表 Job。
```

---

## 任务 4：确认 API 行为没有变

这次改完后，接口行为应该保持不变：

```text
POST /jobs
  仍然返回 201

GET /jobs
  仍然返回任务列表

POST /jobs/process-next
  仍然处理一个 pending job
```

变化的是：

```text
默认数据源从内存变成 MySQL。
```

---

## 验证命令

```bash
npm run test -w @learn/api -- tests/integration/jobs.test.ts
npm run test -w @learn/api -- tests/unit/job-worker.test.ts
npm run test -w @learn/api -- tests/unit/job.prisma-repository.test.ts
npm run typecheck -w @learn/api
npm run format:check
```

---

## 完成标准

- [x] `job-queue-instance.ts` 默认导出 `createPrismaJobRepository()`
- [x] jobs API 原有内存注入测试继续通过
- [x] 补充 `createApp()` 默认使用 Prisma repository 的集成测试
- [x] 默认装配测试会清理 `JobLog` 和 `Job`
- [x] `POST /jobs` 行为保持 201
- [x] `npm run test -w @learn/api -- tests/integration/jobs.test.ts` 通过
- [x] `npm run test -w @learn/api -- tests/unit/job-worker.test.ts` 通过
- [x] `npm run test -w @learn/api -- tests/unit/job.prisma-repository.test.ts` 通过
- [x] `npm run typecheck -w @learn/api` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Jobs API 切换 PrismaRepository 完成了
```
