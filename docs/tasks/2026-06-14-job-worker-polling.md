# Task: MySQL 数据库队列：worker 轮询处理数据库任务

## 背景

现在你的 Jobs API 已经默认使用 MySQL：

```text
POST /jobs
  创建任务到 MySQL

GET /jobs
  从 MySQL 读取任务

POST /jobs/process-next
  手动触发 worker 处理一个 pending job
```

但真实后台任务通常不会靠你手动发 HTTP 请求触发：

```text
真实项目更常见：
  worker 每隔一段时间自动检查有没有 pending job
  有就取一个出来处理
  没有就等下一轮
```

这张任务先做一个学习版轮询 worker：

```text
startJobWorkerLoop()
```

它的职责是：

```text
每隔 intervalMs 调用一次 processNextJob(repository, processor)
```

---

## 任务 1：新增 worker loop 文件

新增：

```text
apps/api/src/jobs/job-worker-loop.ts
```

你可以先写成这样：

```ts
import type { JobRepository } from "./job.repository.js";
import { processNextJob, type JobProcessor } from "./job-worker.js";

export type StartJobWorkerLoopOptions = {
  repository: JobRepository;
  processor: JobProcessor;
  intervalMs?: number;
};

export type JobWorkerLoopHandle = {
  stop(): void;
};

export const startJobWorkerLoop = (options: StartJobWorkerLoopOptions): JobWorkerLoopHandle => {
  const intervalMs = options.intervalMs ?? 1000;

  const timer = setInterval(() => {
    void processNextJob(options.repository, options.processor);
  }, intervalMs);

  return {
    stop() {
      clearInterval(timer);
    }
  };
};
```

这段代码先不用追求完美。

学习点：

```text
setInterval 会定时执行函数。

stop() 里 clearInterval(timer)，表示停止这个定时任务。
```

为什么这里写 `void processNextJob(...)`？

```text
setInterval 不会 await async 函数。

processNextJob 返回 Promise。
如果直接调用但不处理，TypeScript / lint 语义上会比较含糊。

void 的意思是：
  我知道这里返回的是 Promise，
  但这个轮询器暂时不等待它的结果。
```

---

## 任务 2：给 loop 补一个最小测试

新增：

```text
apps/api/tests/unit/job-worker-loop.test.ts
```

测试目标：

```text
启动 loop 后，时间推进到 intervalMs，会处理 pending job。
```

可以用 Vitest 的 fake timers：

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryJobQueue } from "../../src/jobs/memory-job-queue.js";
import { startJobWorkerLoop } from "../../src/jobs/job-worker-loop.js";

describe("job worker loop", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("会按 interval 处理 pending job", async () => {
    vi.useFakeTimers();

    const queue = createMemoryJobQueue();

    const job = await queue.create({
      type: "send-email",
      payload: {
        to: "user@example.com"
      }
    });

    const loop = startJobWorkerLoop({
      repository: queue,
      processor: async () => {},
      intervalMs: 1000
    });

    await vi.advanceTimersByTimeAsync(1000);

    const updatedJob = await queue.findById(job.id);

    expect(updatedJob?.status).toBe("completed");

    loop.stop();
  });
});
```

注意：

```text
测试里一定要调用 loop.stop()。

否则定时器会一直存在，测试可能结束不了，或者影响后面的测试。
```

---

## 任务 3：补一个 stop 测试

继续修改：

```text
apps/api/tests/unit/job-worker-loop.test.ts
```

再补一个测试：

```ts
it("stop 后不会继续处理新任务", async () => {
  vi.useFakeTimers();

  const queue = createMemoryJobQueue();

  const loop = startJobWorkerLoop({
    repository: queue,
    processor: async () => {},
    intervalMs: 1000
  });

  loop.stop();

  const job = await queue.create({
    type: "send-email",
    payload: {
      to: "user@example.com"
    }
  });

  await vi.advanceTimersByTimeAsync(1000);

  const updatedJob = await queue.findById(job.id);

  expect(updatedJob?.status).toBe("pending");
});
```

学习点：

```text
一个后台 loop 必须能停。

原因包括：
- 测试要能清理
- 服务关闭时要优雅退出
- 未来部署时要处理 SIGTERM
```

---

## 任务 4：先不要接入 server.ts

这张任务先不要改：

```text
apps/api/src/server.ts
```

原因是：

```text
一旦 server.ts 自动启动 loop，
本地开发时 API 一启动就会处理数据库 pending job。

这是可以做的，但我们先把 loop 本身测试清楚。
下一张任务再接入 server.ts。
```

---

## 验证命令

```bash
npm run test -w @learn/api -- tests/unit/job-worker-loop.test.ts
npm run test -w @learn/api -- tests/unit/job-worker.test.ts
npm run typecheck -w @learn/api
npm run format:check
```

---

## 完成标准

- [x] 新增 `apps/api/src/jobs/job-worker-loop.ts`
- [x] `startJobWorkerLoop()` 会按 interval 调用 `processNextJob`
- [x] `startJobWorkerLoop()` 返回 `stop()`
- [x] loop 测试使用中文 `it(...)` 描述
- [x] 测试覆盖 interval 处理 pending job
- [x] 测试覆盖 stop 后不继续处理新任务
- [x] 这张任务不改 `server.ts`
- [x] `npm run test -w @learn/api -- tests/unit/job-worker-loop.test.ts` 通过
- [x] `npm run test -w @learn/api -- tests/unit/job-worker.test.ts` 通过
- [x] `npm run typecheck -w @learn/api` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
worker 轮询完成了
```
