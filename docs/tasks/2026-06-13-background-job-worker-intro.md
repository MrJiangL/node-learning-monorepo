# Task: 后台任务入门：处理一个 pending job

## 背景

你已经实现了一个学习版内存队列：

```text
enqueue      把任务放进队列
list         查看队列快照
nextPending  找到第一个等待处理的任务
```

现在还缺一个核心角色：

```text
worker
```

worker 可以理解成“干活的人”：

```text
queue 负责存任务
worker 负责取任务并执行任务
processor 负责具体怎么处理某一种任务
```

这张任务先实现最小版本：

```text
从 queue 里拿一个 pending job
-> 标记为 processing
-> 调用 processor
-> 成功就标记 completed
-> 失败就标记 failed
```

---

## 你会练到什么

- queue / worker / processor 的分工
- 为什么 job 需要状态流转
- 为什么异步任务处理要捕获 processor 错误
- 如何测试 success path 和 failed path
- 为什么 worker 不能直接假装所有任务都成功

---

## 任务 1：给内存队列增加状态更新方法

修改：

```text
apps/api/src/jobs/memory-job-queue.ts
```

现在 queue 只有：

```ts
enqueue;
list;
nextPending;
```

你需要新增一个方法：

```ts
updateStatus(id: string, status: JobStatus): Job<unknown> | null
```

所以文件顶部需要把 `JobStatus` 也 import 进来：

```ts
import type { Job, JobStatus } from "./job.js";
```

实现思路：

```ts
updateStatus(id: string, status: JobStatus): Job<unknown> | null {
  const job = jobs.find((item) => item.id === id);

  if (!job) {
    return null;
  }

  job.status = status;
  job.updatedAt = new Date().toISOString();

  return job;
}
```

学习点：

```text
这里为了学习简单，允许直接修改内存里的 job 对象。
```

后面如果我们要更严格地练不可变更新，可以再把它改成“创建新对象替换旧对象”。

---

## 任务 2：实现 processNextJob

新建：

```text
apps/api/src/jobs/job-worker.ts
```

写入类型：

```ts
import type { Job } from "./job.js";
import type { createMemoryJobQueue } from "./memory-job-queue.js";

export type MemoryJobQueue = ReturnType<typeof createMemoryJobQueue>;

export type JobProcessor = (job: Job<unknown>) => Promise<void>;
```

然后实现：

```ts
export const processNextJob = async (
  queue: MemoryJobQueue,
  processor: JobProcessor
): Promise<Job<unknown> | null> => {
  const job = queue.nextPending();

  if (!job) {
    return null;
  }

  queue.updateStatus(job.id, "processing");

  try {
    await processor(job);
    return queue.updateStatus(job.id, "completed");
  } catch {
    return queue.updateStatus(job.id, "failed");
  }
};
```

请加中文注释解释：

```text
为什么没有 pending job 时返回 null。
为什么 processor 成功后标记 completed。
为什么 processor 抛错后标记 failed。
```

---

## 任务 3：补 queue 状态更新测试

修改：

```text
apps/api/tests/unit/memory-job-queue.test.ts
```

新增测试：

```text
可以按 id 更新任务状态
```

测试重点：

```ts
const job = queue.enqueue(...);
const updatedJob = queue.updateStatus(job.id, "processing");

expect(updatedJob?.status).toBe("processing");
expect(queue.nextPending()).toBeNull();
```

---

## 任务 4：补 worker 单元测试

新建：

```text
apps/api/tests/unit/job-worker.test.ts
```

至少写 3 个测试，描述用中文：

```text
没有 pending job 时返回 null
processor 成功时把任务标记为 completed
processor 失败时把任务标记为 failed
```

测试命令：

```bash
npm run test -w @learn/api -- tests/unit/memory-job-queue.test.ts tests/unit/job-worker.test.ts
```

---

## 完成标准

- [x] `memory-job-queue.ts` 新增 `updateStatus`
- [x] `updateStatus` 找不到 job 时返回 `null`
- [x] `updateStatus` 会更新 `status`
- [x] `updateStatus` 会更新 `updatedAt`
- [x] 新增 `apps/api/src/jobs/job-worker.ts`
- [x] `processNextJob` 没有 pending job 时返回 `null`
- [x] processor 成功时 job 变成 `completed`
- [x] processor 失败时 job 变成 `failed`
- [x] 测试描述使用中文
- [x] `npm run test -w @learn/api -- tests/unit/memory-job-queue.test.ts tests/unit/job-worker.test.ts` 通过
- [x] `npm run typecheck -w @learn/api` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
后台任务 worker 完成了
```
