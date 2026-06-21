# Task: MySQL 数据库队列：worker 错误处理和运行保护

## 背景

现在你的 worker loop 已经能定时处理任务：

```text
setInterval -> processNextJob()
```

但这里有一个真实后端里很重要的问题：

```ts
void processNextJob(options.repository, options.processor);
```

`void` 只是表示“我知道这里返回 Promise，但我不等待它”。

它没有解决这个问题：

```text
如果 processNextJob 本身抛出未捕获错误怎么办？
```

注意：

```text
processor 处理单个 job 失败，已经会被 processNextJob catch，并把 job 标记为 pending / failed。

但如果 repository 本身出错，比如数据库连接失败，
processNextJob 可能会在 nextPending / updateStatus / addLog 这些地方抛错。
```

这张任务要做的是：

```text
给 worker loop 加一层运行保护。
```

目标不是让错误消失，而是：

```text
错误要被记录
worker loop 不要因为一次异常就失控
```

---

## 任务 1：给 worker loop 增加 logger 选项

修改：

```text
apps/api/src/jobs/job-worker-loop.ts
```

先新增一个简单 logger 类型：

```ts
export type JobWorkerLoopLogger = {
  error(message: string, error: unknown): void;
};
```

然后给 `StartJobWorkerLoopOptions` 增加：

```ts
logger?: JobWorkerLoopLogger;
```

为什么不直接在函数里写死 `console.error`？

```text
写死 console.error 会让测试很难断言。

通过 logger 注入：
- 真实运行时默认用 console.error
- 测试时可以传一个 vi.fn()
```

这还是依赖注入，只不过这次注入的不是 repository，而是日志能力。

---

## 任务 2：给 loop 增加安全执行函数

继续修改：

```text
apps/api/src/jobs/job-worker-loop.ts
```

把现在的：

```ts
const timer = setInterval(() => {
  void processNextJob(options.repository, options.processor);
}, intervalMs);
```

改成类似：

```ts
const logger = options.logger ?? console;

const processSafely = async () => {
  try {
    await processNextJob(options.repository, options.processor);
  } catch (error) {
    logger.error("Job worker loop failed to process next job", error);
  }
};

const timer = setInterval(() => {
  void processSafely();
}, intervalMs);
```

学习点：

```text
processNextJob 负责“单个任务的业务状态流转”。

processSafely 负责“worker loop 自己的运行保护”。
```

这两个责任不要混在一起。

---

## 任务 3：补错误保护测试

修改：

```text
apps/api/tests/unit/job-worker-loop.test.ts
```

新增一个测试：

```ts
it("处理过程抛出未捕获错误时会记录错误并继续运行", async () => {
  vi.useFakeTimers();

  const logger = {
    error: vi.fn()
  };

  const repository = {
    create: vi.fn(),
    list: vi.fn(),
    findById: vi.fn(),
    addLog: vi.fn(),
    nextPending: vi
      .fn()
      .mockRejectedValueOnce(new Error("database disconnected"))
      .mockResolvedValue(null),
    updateStatus: vi.fn(),
    incrementAttempts: vi.fn()
  };

  const loop = startJobWorkerLoop({
    repository,
    processor: async () => {},
    logger,
    intervalMs: 1000
  });

  try {
    await vi.advanceTimersByTimeAsync(1000);

    expect(logger.error).toHaveBeenCalledWith(
      "Job worker loop failed to process next job",
      expect.any(Error)
    );

    await vi.advanceTimersByTimeAsync(1000);

    expect(repository.nextPending).toHaveBeenCalledTimes(2);
  } finally {
    loop.stop();
  }
});
```

这段测试想证明两件事：

```text
第一次 repository 抛错，会记录 logger.error。
第二次 interval 还能继续触发，说明 loop 没有因为第一次错误就死掉。
```

如果 TypeScript 对 repository mock 类型不满意，可以这样处理：

```ts
import type { JobRepository } from "../../src/jobs/job.repository.js";

const repository: JobRepository = {
  // ...
};
```

---

## 任务 4：保留原有两个测试

原有两个测试不要删：

```text
会按 interval 处理 pending job
stop 后不会继续处理新任务
```

新增错误保护后，worker loop 至少要覆盖三类行为：

```text
正常处理
停止运行
错误保护
```

---

## 验证命令

```bash
npm run test -w @learn/api -- tests/unit/job-worker-loop.test.ts
npm run typecheck -w @learn/api
npm run format:check
```

---

## 完成标准

- [x] `StartJobWorkerLoopOptions` 支持 `logger`
- [x] worker loop 默认 logger 使用 `console`
- [x] worker loop 用 `processSafely()` 捕获未处理异常
- [x] 发生未处理异常时会调用 `logger.error`
- [x] 一次异常后，下一轮 interval 仍然会继续触发
- [x] 保留正常处理 pending job 的测试
- [x] 保留 stop 后不继续处理任务的测试
- [x] 新增测试使用中文 `it(...)` 描述
- [x] `npm run test -w @learn/api -- tests/unit/job-worker-loop.test.ts` 通过
- [x] `npm run typecheck -w @learn/api` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
worker 错误保护完成了
```
