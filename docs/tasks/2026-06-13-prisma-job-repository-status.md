# Task: MySQL 数据库队列：Repository 支持状态更新和失败重试

## 背景

上一张任务里，`PrismaJobRepository` 已经支持：

```text
create
findById
addLog
```

但如果未来要让 worker 使用数据库队列，还需要这些能力：

```text
nextPending
updateStatus
incrementAttempts
```

这三个方法对应内存队列里的能力：

```text
queue.nextPending()
queue.updateStatus()
queue.incrementAttempts()
```

这张任务只扩展 repository，不接 API，不改 worker。

---

## 任务 1：扩展 JobRepository interface

修改：

```text
apps/api/src/jobs/job.repository.ts
```

把 `JobRepository` 增加 3 个方法：

```ts
import type { Job, JobStatus } from "./job.js";

export type JobRepository = {
  create<TPayload>(input: CreateJobInput<TPayload>): Promise<Job<TPayload>>;
  findById(id: string): Promise<Job<unknown> | null>;
  addLog(id: string, message: string): Promise<Job<unknown> | null>;
  nextPending(): Promise<Job<unknown> | null>;
  updateStatus(id: string, status: JobStatus): Promise<Job<unknown> | null>;
  incrementAttempts(id: string): Promise<Job<unknown> | null>;
};
```

学习点：

```text
Repository interface 是“外部能用什么能力”的契约。

worker 未来如果要从内存队列切到数据库队列，
它需要的就是这些队列能力。
```

---

## 任务 2：实现 nextPending

修改：

```text
apps/api/src/jobs/job.prisma-repository.ts
```

新增：

```ts
async nextPending() {
  const job = await prisma.job.findFirst({
    where: {
      status: "pending"
    },
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

  if (!job) {
    return null;
  }

  return mapPrismaJobToJob(job);
}
```

学习点：

```text
这里的查询刚好会用到前面设计的索引：

@@index([status, createdAt])

因为 worker 通常要找：
status = pending
createdAt 最早的任务
```

---

## 任务 3：实现 updateStatus

新增：

```ts
async updateStatus(id: string, status: JobStatus) {
  const job = await prisma.job.findUnique({
    where: { id }
  });

  if (!job) {
    return null;
  }

  const updatedJob = await prisma.job.update({
    where: { id },
    data: { status },
    include: {
      logs: {
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  return mapPrismaJobToJob(updatedJob);
}
```

学习点：

```text
Prisma update 找不到记录时会抛错。

当前 repository 的约定是：
找不到返回 null。

所以这里先 findUnique，再 update。
```

---

## 任务 4：实现 incrementAttempts

新增：

```ts
async incrementAttempts(id: string) {
  const job = await prisma.job.findUnique({
    where: { id }
  });

  if (!job) {
    return null;
  }

  const updatedJob = await prisma.job.update({
    where: { id },
    data: {
      attempts: {
        increment: 1
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

  return mapPrismaJobToJob(updatedJob);
}
```

学习点：

```text
Prisma 的 increment 是原子更新语义。

比先读 attempts，再 attempts + 1，再写回数据库更安全。
```

---

## 任务 5：补 repository 测试

修改：

```text
apps/api/tests/unit/job.prisma-repository.test.ts
```

新增 4 个中文测试：

```text
nextPending 返回最早创建的 pending job
nextPending 没有 pending job 时返回 null
updateStatus 可以更新任务状态
incrementAttempts 可以增加尝试次数
```

测试提示：

```ts
it("nextPending 返回最早创建的 pending job", async () => {
  const repository = createPrismaJobRepository();

  const firstJob = await repository.create({
    type: "first-job",
    payload: {}
  });

  await repository.create({
    type: "second-job",
    payload: {}
  });

  const pendingJob = await repository.nextPending();

  expect(pendingJob?.id).toBe(firstJob.id);
});
```

```ts
it("nextPending 没有 pending job 时返回 null", async () => {
  const repository = createPrismaJobRepository();

  const job = await repository.create({
    type: "send-email",
    payload: {}
  });

  await repository.updateStatus(job.id, "completed");

  await expect(repository.nextPending()).resolves.toBeNull();
});
```

```ts
it("updateStatus 可以更新任务状态", async () => {
  const repository = createPrismaJobRepository();

  const job = await repository.create({
    type: "send-email",
    payload: {}
  });

  const updatedJob = await repository.updateStatus(job.id, "processing");

  expect(updatedJob?.status).toBe("processing");
});
```

```ts
it("incrementAttempts 可以增加尝试次数", async () => {
  const repository = createPrismaJobRepository();

  const job = await repository.create({
    type: "send-email",
    payload: {}
  });

  const updatedJob = await repository.incrementAttempts(job.id);

  expect(updatedJob?.attempts).toBe(1);
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

- [x] `JobRepository` 增加 `nextPending`
- [x] `JobRepository` 增加 `updateStatus`
- [x] `JobRepository` 增加 `incrementAttempts`
- [x] Prisma repository 实现 `nextPending`
- [x] Prisma repository 实现 `updateStatus`
- [x] Prisma repository 实现 `incrementAttempts`
- [x] 测试覆盖 `nextPending` 返回最早 pending job
- [x] 测试覆盖没有 pending job 时返回 null
- [x] 测试覆盖 `updateStatus`
- [x] 测试覆盖 `incrementAttempts`
- [x] 测试描述使用中文
- [x] `npm run test -w @learn/api -- tests/unit/job.prisma-repository.test.ts` 通过
- [x] `npm run typecheck -w @learn/api` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Prisma Job repository 状态更新完成了
```
