# Task: Job API 接入 idempotencyKey

## 背景

上一张任务已经把 repository 层准备好了：

```text
CreateJobInput 支持 idempotencyKey。
PrismaJobRepository.create 重复 key 会返回已有 Job。
MemoryJobQueue.create 重复 key 也会返回已有 Job。
```

现在要把这个能力接到 HTTP API：

```text
POST /jobs 请求体可以传 idempotencyKey。
同一个 idempotencyKey 重复 POST 时，返回同一条 Job。
```

---

## 这张任务只练什么

只练 API 层接入：

```text
1. Zod schema 接收 idempotencyKey。
2. jobs router 继续把 parse 后的 input 传给 queue.create。
3. 集成测试验证重复请求返回同一个 job id。
```

---

## 学习目标

完成后你应该能说清楚：

```text
1. 为什么 API schema 要显式允许 idempotencyKey。
2. 为什么路由层不需要自己查重，而是交给 repository。
3. 为什么集成测试要从 HTTP 入口验证重复 POST。
```

---

## 任务 1：更新 jobs schema

修改：

```text
apps/api/src/jobs/jobs.schema.ts
```

给 `createJobSchema` 添加：

```ts
idempotencyKey: z.string().trim().min(1).max(200).optional();
```

完整结构类似：

```ts
export const createJobSchema = z.object({
  type: z.string().trim().min(1, "Job type is required").max(100),
  payload: z.record(z.string(), z.unknown()).default({}),
  maxAttempts: z.number().int().min(1).max(10).optional(),
  idempotencyKey: z.string().trim().min(1).max(200).optional()
});
```

路由里这行不用改：

```ts
const job = await queue.create(input);
```

因为 `input` 已经会包含 `idempotencyKey`。

---

## 任务 2：补 jobs API 集成测试

修改：

```text
apps/api/tests/integration/jobs.test.ts
```

在 `describe("jobs router", ...)` 里添加测试：

```ts
it("POST /jobs 使用相同 idempotencyKey 会返回同一个 job", async () => {
  const app = createJobsTestApp();

  const firstResponse = await request(app)
    .post("/jobs")
    .send({
      type: "send-email",
      payload: {
        to: "user@example.com"
      },
      idempotencyKey: "same-job-api-request"
    });

  const secondResponse = await request(app)
    .post("/jobs")
    .send({
      type: "send-email",
      payload: {
        to: "another@example.com"
      },
      idempotencyKey: "same-job-api-request"
    });

  expect(firstResponse.status).toBe(201);
  expect(secondResponse.status).toBe(201);
  expect(secondResponse.body.data.id).toBe(firstResponse.body.data.id);
  expect(secondResponse.body.data.payload).toEqual({
    to: "user@example.com"
  });
  expect(secondResponse.body.data.idempotencyKey).toBe("same-job-api-request");
});
```

注意：这里第二次请求 payload 改成了 `another@example.com`，是故意的。

如果返回的 payload 仍然是第一次的 `user@example.com`，说明后端没有创建新 Job，而是返回了第一次创建的 Job。

---

## 任务 3：运行测试

运行：

```bash
npm test -w @learn/api -- tests/integration/jobs.test.ts tests/unit/job.prisma-repository.test.ts tests/unit/memory-job-queue.test.ts
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] `createJobSchema` 支持 `idempotencyKey`
- [x] `POST /jobs` 重复 idempotencyKey 返回同一个 job id
- [x] 集成测试使用中文 `it(...)` 描述
- [x] `jobs.test.ts` 通过
- [x] repository / memory queue 相关测试通过
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Job API idempotencyKey 完成了
```
