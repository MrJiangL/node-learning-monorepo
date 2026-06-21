# Task: 后端工程化：后台任务 / 队列入门

## 背景

到目前为止，你写的大部分后端逻辑都是“请求进来，马上处理，马上返回”。

比如：

```text
POST /projects
-> 校验 body
-> 写 MySQL
-> 返回 201
```

但真实后端里有些事情不适合放在请求里同步完成：

```text
发邮件
生成报表
批量导入
图片处理
调用慢的第三方接口
重试失败任务
```

这些事情通常会放到后台任务里做。

这张任务先不接 Redis queue，也不引入 BullMQ。我们先用最小代码理解“为什么需要 job queue”。

---

## 你会练到什么

- 什么是同步请求，什么是后台任务
- 为什么慢任务不应该阻塞 HTTP 响应
- 一个 job 至少需要哪些字段
- queue / worker / processor 的基本分工
- 用内存实现一个学习版 job queue

---

## 任务 1：新建 Job 类型

新建：

```text
apps/api/src/jobs/job.ts
```

写入：

```ts
export type JobStatus = "pending" | "processing" | "completed" | "failed";

export type Job<TPayload> = {
  id: string;
  type: string;
  payload: TPayload;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
};
```

请加中文注释解释：

```text
payload 是任务真正要处理的数据。
status 表示任务当前处于哪个阶段。
```

---

## 任务 2：实现内存队列

新建：

```text
apps/api/src/jobs/memory-job-queue.ts
```

实现一个简单的 queue：

```ts
import type { Job } from "./job.js";

export type EnqueueJobInput<TPayload> = {
  type: string;
  payload: TPayload;
};

export const createMemoryJobQueue = () => {
  const jobs: Job<unknown>[] = [];

  return {
    enqueue<TPayload>(input: EnqueueJobInput<TPayload>): Job<TPayload> {
      // TODO: 生成一个 Job，status 初始值是 pending，然后放入 jobs。
    },

    list(): Job<unknown>[] {
      // TODO: 返回 jobs 的拷贝，避免外部直接修改内部数组。
    },

    nextPending(): Job<unknown> | null {
      // TODO: 找到第一个 pending job，没有就返回 null。
    }
  };
};
```

注意：

```text
list 不要直接 return jobs。
```

因为直接返回内部数组，外部代码就能绕过 queue 的方法修改它。

---

## 任务 3：补单元测试

新建：

```text
apps/api/tests/unit/memory-job-queue.test.ts
```

至少写 3 个测试，测试描述用中文：

```text
可以把任务加入队列
list 返回队列快照而不是内部数组
nextPending 返回第一个 pending 任务
```

测试命令：

```bash
npm run test -w @learn/api -- tests/unit/memory-job-queue.test.ts
```

---

## 完成标准

- [x] 新增 `apps/api/src/jobs/job.ts`
- [x] 新增 `apps/api/src/jobs/memory-job-queue.ts`
- [x] Job 类型包含 `id / type / payload / status / createdAt / updatedAt`
- [x] `enqueue` 可以创建 pending job
- [x] `list` 返回数组拷贝
- [x] `nextPending` 返回第一个 pending job
- [x] 测试描述使用中文
- [x] `npm run test -w @learn/api -- tests/unit/memory-job-queue.test.ts` 通过
- [x] `npm run typecheck -w @learn/api` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
后台任务内存队列完成了
```
