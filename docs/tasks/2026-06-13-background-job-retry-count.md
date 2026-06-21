# Task: 后台任务进阶：失败任务重试次数

## 背景

你已经实现了最小 worker：

```text
pending -> processing -> completed
pending -> processing -> failed
```

现在要继续补一个真实后台任务里很常见的能力：

```text
失败任务可以重试，但不能无限重试。
```

比如发邮件失败：

```text
第一次失败：可能只是网络抖动，可以重试
第二次失败：还可以再试一次
第三次失败：达到上限，标记 failed
```

这张任务先不做定时重试，只做最小模型：

```text
Job 记录 attempts 和 maxAttempts
processor 失败时 attempts + 1
没达到 maxAttempts：回到 pending，允许下次继续处理
达到 maxAttempts：标记 failed
```

---

## 任务 1：扩展 Job 类型

修改：

```text
apps/api/src/jobs/job.ts
```

给 `Job<TPayload>` 增加两个字段：

```ts
attempts: number;
maxAttempts: number;
```

请加中文注释说明：

```text
attempts 表示已经尝试处理了多少次。
maxAttempts 表示最多允许尝试多少次。
```

---

## 任务 2：扩展 enqueue input

修改：

```text
apps/api/src/jobs/memory-job-queue.ts
```

把 `EnqueueJobInput` 改成支持可选的 `maxAttempts`：

```ts
export type EnqueueJobInput<TPayload> = {
  type: string;
  payload: TPayload;
  maxAttempts?: number;
};
```

创建 job 时：

```ts
attempts: 0,
maxAttempts: input.maxAttempts ?? 3
```

学习点：

```text
不传 maxAttempts 时，默认最多尝试 3 次。
```

---

## 任务 3：新增 incrementAttempts

继续修改：

```text
apps/api/src/jobs/memory-job-queue.ts
```

新增方法：

```ts
incrementAttempts(id: string): Job<unknown> | null
```

逻辑：

```ts
const job = jobs.find((item) => item.id === id);

if (!job) {
  return null;
}

job.attempts += 1;
job.updatedAt = new Date().toISOString();

return job;
```

---

## 任务 4：修改 processNextJob 失败逻辑

修改：

```text
apps/api/src/jobs/job-worker.ts
```

现在失败时直接：

```ts
return queue.updateStatus(job.id, "failed");
```

改成：

```ts
const attemptedJob = queue.incrementAttempts(job.id);

if (!attemptedJob) {
  return null;
}

if (attemptedJob.attempts >= attemptedJob.maxAttempts) {
  return queue.updateStatus(job.id, "failed");
}

return queue.updateStatus(job.id, "pending");
```

意思是：

```text
失败一次，先 attempts + 1。
如果达到最大次数，才最终 failed。
如果没达到最大次数，回到 pending，等待下一次 worker 处理。
```

---

## 任务 5：更新测试

修改：

```text
apps/api/tests/unit/memory-job-queue.test.ts
apps/api/tests/unit/job-worker.test.ts
```

至少补这些测试：

```text
enqueue 默认 maxAttempts 是 3
可以自定义 maxAttempts
可以按 id 增加 attempts
processor 第一次失败且未达上限时把任务放回 pending
processor 失败达到最大次数时把任务标记为 failed
```

测试描述继续用中文。

---

## 任务 6：运行验证

```bash
npm run test -w @learn/api -- tests/unit/memory-job-queue.test.ts tests/unit/job-worker.test.ts
npm run typecheck -w @learn/api
npm run format:check
```

---

## 完成标准

- [x] Job 新增 `attempts`
- [x] Job 新增 `maxAttempts`
- [x] enqueue 默认 `attempts` 是 0
- [x] enqueue 默认 `maxAttempts` 是 3
- [x] enqueue 支持自定义 `maxAttempts`
- [x] queue 新增 `incrementAttempts`
- [x] processor 失败未达上限时 job 回到 `pending`
- [x] processor 失败达到上限时 job 变成 `failed`
- [x] 测试描述使用中文
- [x] `npm run test -w @learn/api -- tests/unit/memory-job-queue.test.ts tests/unit/job-worker.test.ts` 通过
- [x] `npm run typecheck -w @learn/api` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
后台任务失败重试次数完成了
```
