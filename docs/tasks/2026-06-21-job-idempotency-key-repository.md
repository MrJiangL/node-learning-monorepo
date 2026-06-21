# Task: Job repository 接入 idempotencyKey

## 背景

你已经理解了 idempotency key 的目标：

```text
同一个业务请求重复提交时，不应该创建两条 Job。
```

这一张任务先不改 API 路由，只把底层能力准备好：

```text
Job 模型保存 idempotencyKey。
Repository 创建 Job 时，如果 key 已存在，就返回已有 Job。
```

下一张任务再把它接到 `POST /jobs`。

---

## 这张任务只练什么

只练 repository 层幂等：

```text
1. Prisma schema 增加 Job.idempotencyKey。
2. CreateJobInput 支持 idempotencyKey。
3. PrismaJobRepository.create 支持重复 key 返回已有 Job。
4. MemoryJobQueue.create 也保持同样行为。
```

---

## 学习目标

完成后你应该能说清楚：

```text
1. 为什么 idempotencyKey 要有唯一约束。
2. 为什么 repository 层要先查已有 Job。
3. 为什么 memory fake 也要同步行为。
4. 为什么这一张先不急着改 API。
```

---

## 任务 1：修改 Prisma schema

修改：

```text
prisma/schema.prisma
```

在 `model Job` 里添加：

```prisma
  idempotencyKey String? @unique
```

建议放在 `type` 后面：

```prisma
model Job {
  id             String   @id
  type           String
  idempotencyKey String?  @unique
  payload        Json
  status         String
  attempts       Int      @default(0)
  maxAttempts    Int      @default(3)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  logs JobLog[]

  @@index([status, createdAt])
  @@index([type])
}
```

---

## 任务 2：创建 migration

运行：

```bash
npm run prisma:migrate -w @learn/api -- --name add_job_idempotency_key
```

成功后看一下 migration SQL，应该类似：

```sql
ALTER TABLE `Job` ADD COLUMN `idempotencyKey` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `Job_idempotencyKey_key` ON `Job`(`idempotencyKey`);
```

---

## 任务 3：更新 Job 类型

修改：

```text
apps/api/src/jobs/job.ts
```

在 `Job<TPayload>` 里添加：

```ts
  // idempotencyKey 用来识别“同一次业务请求”。
  //
  // 同一个 key 重复提交时，后端应该返回同一条 Job，
  // 而不是创建多条重复任务。
  idempotencyKey?: string | null;
```

---

## 任务 4：更新 mapper

修改：

```text
apps/api/src/jobs/job.mapper.ts
```

在 `mapPrismaJobToJob` 返回值里添加：

```ts
  idempotencyKey: job.idempotencyKey,
```

---

## 任务 5：更新 repository input

修改：

```text
apps/api/src/jobs/job.repository.ts
```

在 `CreateJobInput<TPayload>` 里添加：

```ts
  idempotencyKey?: string;
```

---

## 任务 6：更新 PrismaJobRepository.create

修改：

```text
apps/api/src/jobs/job.prisma-repository.ts
```

在 `create` 方法开头加入：

```ts
if (input.idempotencyKey) {
  const existingJob = await prisma.job.findUnique({
    where: {
      idempotencyKey: input.idempotencyKey
    },
    include: {
      logs: {
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  if (existingJob) {
    return mapPrismaJobToJob<TPayload>(existingJob);
  }
}
```

然后在 `prisma.job.create({ data: ... })` 里添加：

```ts
          idempotencyKey: input.idempotencyKey ?? null,
```

也就是：

```ts
        data: {
          id: crypto.randomUUID(),
          type: input.type,
          idempotencyKey: input.idempotencyKey ?? null,
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
```

---

## 任务 7：更新 MemoryJobQueue.create

修改：

```text
apps/api/src/jobs/memory-job-queue.ts
```

在创建新 Job 前加入：

```ts
if (input.idempotencyKey) {
  const existingJob = jobs.find((job) => job.idempotencyKey === input.idempotencyKey);

  if (existingJob) {
    return existingJob as Job<TPayload>;
  }
}
```

在 `job` 对象里添加：

```ts
      idempotencyKey: input.idempotencyKey ?? null,
```

---

## 验证命令

按顺序运行：

```bash
npm run prisma:migrate -w @learn/api -- --name add_job_idempotency_key
npm run prisma:generate -w @learn/api
npm run typecheck
npm run format:check
```

如果 migration 已经跑过，不要重复创建同名 migration。可以只运行后面三个命令。

---

## 完成标准

- [x] `Job` model 增加 `idempotencyKey String? @unique`
- [x] 生成 `add_job_idempotency_key` migration
- [x] `Job<TPayload>` 类型包含 `idempotencyKey`
- [x] `CreateJobInput<TPayload>` 支持 `idempotencyKey`
- [x] `PrismaJobRepository.create` 重复 key 返回已有 Job
- [x] `MemoryJobQueue.create` 重复 key 返回已有 Job
- [x] `npm run prisma:generate -w @learn/api` 通过
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Job repository idempotencyKey 完成了
```
