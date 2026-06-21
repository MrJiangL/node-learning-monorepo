# Task: MySQL 数据库队列：实现 PrismaJobRepository 入门

## 背景

你已经有了数据库表：

```text
Job
JobLog
```

现在先不要把 API 和 worker 全部切到数据库。

这张任务只做 repository 入门：

```text
create
findById
addLog
```

也就是先证明：

```text
代码可以用 Prisma 创建 Job
可以把 Prisma 查询结果映射成当前 domain Job 类型
可以给 Job 追加 JobLog
```

---

## 任务 1：创建 Prisma Job mapper

新建：

```text
apps/api/src/jobs/job.mapper.ts
```

参考：

```ts
import type { Job as PrismaJobModel, JobLog as PrismaJobLogModel } from "@prisma/client";
import type { Job, JobLog, JobStatus } from "./job.js";

type PrismaJobWithLogs = PrismaJobModel & {
  logs: PrismaJobLogModel[];
};

const mapPrismaJobLogToJobLog = (log: PrismaJobLogModel): JobLog => ({
  message: log.message,
  createdAt: log.createdAt.toISOString()
});

export const mapPrismaJobToJob = (job: PrismaJobWithLogs): Job<unknown> => ({
  id: job.id,
  type: job.type,
  payload: job.payload,
  status: job.status as JobStatus,
  createdAt: job.createdAt.toISOString(),
  updatedAt: job.updatedAt.toISOString(),
  attempts: job.attempts,
  maxAttempts: job.maxAttempts,
  logs: job.logs.map(mapPrismaJobLogToJobLog)
});
```

学习点：

```text
Prisma 的 DateTime 查询出来是 Date。
我们当前 domain Job 里 createdAt / updatedAt 是 string。

所以 mapper 负责把 Date 转成 ISO string。
```

---

## 任务 2：创建 repository interface

新建：

```text
apps/api/src/jobs/job.repository.ts
```

内容：

```ts
import type { Job } from "./job.js";

export type CreateJobInput<TPayload> = {
  type: string;
  payload: TPayload;
  maxAttempts?: number;
};

export type JobRepository = {
  create<TPayload>(input: CreateJobInput<TPayload>): Promise<Job<TPayload>>;
  findById(id: string): Promise<Job<unknown> | null>;
  addLog(id: string, message: string): Promise<Job<unknown> | null>;
};
```

学习点：

```text
interface 先写清楚“外部需要什么能力”。

后面内存队列和 Prisma repository 都可以朝这个接口靠拢。
```

---

## 任务 3：实现 Prisma repository

新建：

```text
apps/api/src/jobs/job.prisma-repository.ts
```

参考：

```ts
import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { mapPrismaJobToJob } from "./job.mapper.js";
import type { CreateJobInput, JobRepository } from "./job.repository.js";

export const createPrismaJobRepository = (): JobRepository => {
  return {
    async create<TPayload>(input: CreateJobInput<TPayload>) {
      const job = await prisma.job.create({
        data: {
          id: crypto.randomUUID(),
          type: input.type,
          payload: input.payload as Prisma.InputJsonValue,
          status: "pending",
          maxAttempts: input.maxAttempts ?? 3,
          logs: {
            create: {
              id: crypto.randomUUID(),
              message: "Job created"
            }
          }
        },
        include: {
          logs: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      return mapPrismaJobToJob(job);
    },

    async findById(id: string) {
      const job = await prisma.job.findUnique({
        where: { id },
        include: {
          logs: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      if (!job) {
        return null;
      }

      return mapPrismaJobToJob(job);
    },

    async addLog(id: string, message: string) {
      const job = await prisma.job.findUnique({
        where: { id }
      });

      if (!job) {
        return null;
      }

      await prisma.jobLog.create({
        data: {
          id: crypto.randomUUID(),
          message,
          jobId: id
        }
      });

      return this.findById(id);
    }
  };
};
```

学习点：

```text
Prisma relation create 可以在创建 Job 的同时创建第一条 JobLog。

logs: { create: ... }
```

注意：

```text
payload 这里用了类型断言 Prisma.InputJsonValue。

原因是 domain 层用 unknown 表示“任意 payload”，
但 Prisma 写入 JSON 时需要确认它是可序列化的 JSON 值。

后面如果要更严谨，可以在 Zod schema 层限制 payload。
```

---

## 任务 4：补 repository 测试

新建：

```text
apps/api/tests/unit/job.prisma-repository.test.ts
```

至少写 3 个中文测试：

```text
可以创建 pending job 并写入 Job created 日志
findById 找不到时返回 null
addLog 可以给 job 追加日志
```

测试清理：

```ts
beforeEach(async () => {
  await prisma.jobLog.deleteMany();
  await prisma.job.deleteMany();
});
```

测试 1 思路：

```ts
it("可以创建 pending job 并写入 Job created 日志", async () => {
  const repository = createPrismaJobRepository();

  const job = await repository.create({
    type: "send-email",
    payload: {
      to: "user@example.com"
    },
    maxAttempts: 2
  });

  expect(job).toMatchObject({
    type: "send-email",
    status: "pending",
    attempts: 0,
    maxAttempts: 2
  });
  expect(job.logs).toEqual(
    expect.arrayContaining([expect.objectContaining({ message: "Job created" })])
  );
});
```

测试 2 思路：

```ts
it("findById 找不到时返回 null", async () => {
  const repository = createPrismaJobRepository();

  await expect(repository.findById("missing-job-id")).resolves.toBeNull();
});
```

测试 3 思路：

```ts
it("addLog 可以给 job 追加日志", async () => {
  const repository = createPrismaJobRepository();

  const job = await repository.create({
    type: "generate-report",
    payload: {
      reportType: "weekly"
    }
  });

  const updatedJob = await repository.addLog(job.id, "Job processing started");

  expect(updatedJob?.logs).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ message: "Job created" }),
      expect.objectContaining({ message: "Job processing started" })
    ])
  );
});
```

---

## 验证命令

```bash
npm run test -w @learn/api -- tests/unit/job.prisma-repository.test.ts
npm run typecheck -w @learn/api
npm run format:check
```

---

## 完成标准

- [x] 新增 `job.mapper.ts`
- [x] 新增 `job.repository.ts`
- [x] 新增 `job.prisma-repository.ts`
- [x] Prisma repository 可以创建 pending job
- [x] 创建 job 时写入 `Job created` 日志
- [x] `findById` 找不到时返回 `null`
- [x] `addLog` 可以追加日志
- [x] 测试描述使用中文
- [x] `npm run test -w @learn/api -- tests/unit/job.prisma-repository.test.ts` 通过
- [x] `npm run typecheck -w @learn/api` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Prisma Job repository 完成了
```
