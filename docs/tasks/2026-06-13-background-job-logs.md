# Task: 后台任务进阶：记录任务处理日志

## 背景

现在后台任务已经具备这些能力：

```text
POST /jobs 创建任务
POST /jobs/process-next 触发处理
processJobByType 按 job.type 分发处理逻辑
未知 type 会走失败重试逻辑
```

但目前有一个问题：

```text
任务处理过之后，我们只能看到 job 的最终 status。
```

真实后端系统里，后台任务通常还需要记录处理日志，例如：

```text
什么时候开始处理
什么时候处理成功
什么时候处理失败
失败原因是什么
```

这张任务先不接数据库，也不做复杂日志平台，只在内存队列里加一个简单的 `logs` 数组，让你理解“任务状态”和“任务过程记录”的区别。

---

## 任务 1：给 Job 增加日志类型

修改：

```text
apps/api/src/jobs/job.ts
```

新增类型：

```ts
export type JobLog = {
  message: string;
  createdAt: string;
};
```

然后给 `Job<TPayload>` 增加字段：

```ts
logs: JobLog[];
```

建议补中文注释：

```ts
// logs 记录任务处理过程中的关键事件。
//
// status 只表示“当前状态”，比如 completed / failed。
// logs 则记录“过程”，比如什么时候开始、什么时候成功、为什么失败。
logs: JobLog[];
```

---

## 任务 2：enqueue 时初始化 logs

修改：

```text
apps/api/src/jobs/memory-job-queue.ts
```

在创建 job 时加上：

```ts
logs: [
  {
    message: "Job created",
    createdAt: now
  }
];
```

学习点：

```text
job 创建时就写第一条日志。
这样你后面 GET /jobs 时，不只知道它现在是 pending，也知道它什么时候进入队列。
```

---

## 任务 3：给 queue 增加 addLog 方法

还是修改：

```text
apps/api/src/jobs/memory-job-queue.ts
```

在返回对象里新增方法：

```ts
addLog(id: string, message: string): Job<unknown> | null {
  const job = jobs.find((job) => job.id === id);

  if (!job) {
    return null;
  }

  const now = new Date().toISOString();

  job.logs.push({
    message,
    createdAt: now
  });
  job.updatedAt = now;

  return job;
}
```

注意：

```text
这里会修改内存里的 job。

如果未来换成数据库，这个方法就会变成 INSERT job_logs 或 UPDATE job。
学习阶段先用内存数组理解职责。
```

---

## 任务 4：worker 处理时写日志

修改：

```text
apps/api/src/jobs/job-worker.ts
```

在开始处理前写：

```ts
queue.addLog(job.id, "Job processing started");
```

processor 成功后写：

```ts
queue.addLog(job.id, "Job completed");
```

processor 失败后写：

```ts
queue.addLog(job.id, "Job processing failed");
```

建议顺序：

```ts
queue.updateStatus(job.id, "processing");
queue.addLog(job.id, "Job processing started");
```

成功时：

```ts
queue.addLog(job.id, "Job completed");
return queue.updateStatus(job.id, "completed");
```

失败时：

```ts
queue.addLog(job.id, "Job processing failed");
const attemptedJob = queue.incrementAttempts(job.id);
```

学习点：

```text
worker 最适合记录“处理过程”。

因为 route 只知道用户触发了接口；
processor 只知道业务处理；
worker 才知道这个 job 是开始、成功、失败、重试还是最终 failed。
```

---

## 任务 5：补单元测试

修改：

```text
apps/api/tests/unit/job-worker.test.ts
```

补 2 个中文测试：

```text
processor 成功时记录处理开始和完成日志
processor 失败时记录处理失败日志
```

成功测试思路：

```ts
it("processor 成功时记录处理开始和完成日志", async () => {
  const queue = createMemoryJobQueue();

  const job = queue.enqueue({
    type: "send-email",
    payload: {
      to: "user@example.com"
    }
  });

  const result = await processNextJob(queue, async () => {});

  expect(result?.id).toBe(job.id);
  expect(result?.logs).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ message: "Job created" }),
      expect.objectContaining({ message: "Job processing started" }),
      expect.objectContaining({ message: "Job completed" })
    ])
  );
});
```

失败测试思路：

```ts
it("processor 失败时记录处理失败日志", async () => {
  const queue = createMemoryJobQueue();

  const job = queue.enqueue({
    type: "send-email",
    payload: {
      to: "user@example.com"
    },
    maxAttempts: 1
  });

  const result = await processNextJob(queue, async () => {
    throw new Error("send email failed");
  });

  expect(result?.id).toBe(job.id);
  expect(result?.logs).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ message: "Job created" }),
      expect.objectContaining({ message: "Job processing started" }),
      expect.objectContaining({ message: "Job processing failed" })
    ])
  );
});
```

---

## 任务 6：确认 API 响应能看到 logs

修改：

```text
apps/api/tests/integration/jobs.test.ts
```

可以在已有这个测试里补断言：

```text
POST /jobs/process-next 可以把 pending job 处理成 completed
```

增加：

```ts
expect(response.body.data.logs).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ message: "Job created" }),
    expect.objectContaining({ message: "Job processing started" }),
    expect.objectContaining({ message: "Job completed" })
  ])
);
```

学习点：

```text
因为当前 API 直接返回 job 对象，所以 logs 字段会自然出现在响应里。

真实项目里是否把 logs 返回给前端，要看产品需求。
如果 logs 很多，通常会单独做 GET /jobs/:id/logs。
```

---

## 验证命令

```bash
npm run test -w @learn/api -- tests/unit/memory-job-queue.test.ts
npm run test -w @learn/api -- tests/unit/job-worker.test.ts
npm run test -w @learn/api -- tests/integration/jobs.test.ts
npm run typecheck -w @learn/api
npm run format:check
```

---

## 完成标准

- [x] `Job` 增加 `logs`
- [x] `enqueue` 初始化 `Job created` 日志
- [x] queue 增加 `addLog`
- [x] worker 开始处理时写 `Job processing started`
- [x] worker 成功时写 `Job completed`
- [x] worker 失败时写 `Job processing failed`
- [x] 单元测试覆盖成功日志
- [x] 单元测试覆盖失败日志
- [x] API 测试确认响应里能看到 logs
- [x] 测试描述使用中文
- [x] `npm run test -w @learn/api -- tests/unit/memory-job-queue.test.ts` 通过
- [x] `npm run test -w @learn/api -- tests/unit/job-worker.test.ts` 通过
- [x] `npm run test -w @learn/api -- tests/integration/jobs.test.ts` 通过
- [x] `npm run typecheck -w @learn/api` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
后台任务日志完成了
```
