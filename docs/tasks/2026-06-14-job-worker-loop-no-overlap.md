# Task: MySQL 数据库队列：worker 防重入处理

## 背景

现在 worker loop 已经有了错误保护：

```text
processSafely()
  -> try processNextJob()
  -> catch error
  -> logger.error(...)
```

但还有一个定时器后台任务里很常见的问题：

```text
如果一次 processNextJob 处理时间超过 intervalMs，
下一轮 setInterval 仍然会触发。
```

举个例子：

```text
intervalMs = 1000
第 1 秒：开始处理 job A，但它需要 3 秒
第 2 秒：setInterval 又触发一次
第 3 秒：setInterval 又触发一次
```

这可能导致多个 `processNextJob()` 同时运行。

这张任务要做的是：

```text
如果上一轮还在处理，就跳过这一轮。
```

这叫“防重入”。

---

## 任务 1：在 worker loop 里增加 isProcessing 标记

修改：

```text
apps/api/src/jobs/job-worker-loop.ts
```

在 `processSafely` 外面增加：

```ts
let isProcessing = false;
```

然后把 `processSafely` 改成类似：

```ts
const processSafely = async () => {
  if (isProcessing) {
    return;
  }

  isProcessing = true;

  try {
    await processNextJob(options.repository, options.processor);
  } catch (error) {
    logger.error("Job worker loop failed to process next job", error);
  } finally {
    isProcessing = false;
  }
};
```

学习点：

```text
isProcessing 是这个 loop 的“运行中锁”。

它不是数据库锁，也不是分布式锁。
它只能防止同一个 Node 进程里的同一个 loop 重叠执行。
```

以后如果有多个 worker 进程，就需要更强的机制，比如数据库原子更新、队列系统、锁、或者 BullMQ 这类工具。

---

## 任务 2：补防重入测试

修改：

```text
apps/api/tests/unit/job-worker-loop.test.ts
```

新增测试：

```ts
it("上一轮还没结束时不会重叠处理下一轮", async () => {
  vi.useFakeTimers();

  let finishProcessing: (() => void) | undefined;

  const queue = createMemoryJobQueue();

  await queue.create({
    type: "send-email",
    payload: {
      to: "user@example.com"
    }
  });

  const processor = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finishProcessing = resolve;
      })
  );

  const loop = startJobWorkerLoop({
    repository: queue,
    processor,
    intervalMs: 1000
  });

  try {
    await vi.advanceTimersByTimeAsync(1000);

    expect(processor).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);

    expect(processor).toHaveBeenCalledTimes(1);

    finishProcessing?.();
    await vi.runOnlyPendingTimersAsync();
  } finally {
    loop.stop();
  }
});
```

这个测试的意思是：

```text
第一次 interval 开始处理 job，但 processor 故意不结束。
第二次 interval 到了，如果没有防重入，就会再次调用 processor。
有防重入后，processor 仍然只会被调用 1 次。
```

---

## 任务 3：注意 finally

防重入逻辑必须使用 `finally`：

```ts
finally {
  isProcessing = false;
}
```

原因是：

```text
无论成功还是失败，都要释放运行中标记。

如果只在成功时释放，那么某次异常后 isProcessing 会一直是 true，
worker loop 就永远不再处理任务了。
```

---

## 任务 4：保留错误保护测试

上一张任务的错误保护测试不能删：

```text
处理过程抛出未捕获错误时会记录错误并继续运行
```

防重入之后，它仍然应该通过。

因为异常后 `finally` 会把 `isProcessing` 改回 false，下一轮 interval 还能继续执行。

---

## 验证命令

```bash
npm run test -w @learn/api -- tests/unit/job-worker-loop.test.ts
npm run typecheck -w @learn/api
npm run format:check
```

---

## 完成标准

- [x] worker loop 增加 `isProcessing` 标记
- [x] 上一轮正在执行时，下一轮 interval 会直接跳过
- [x] `isProcessing` 在 `finally` 中释放
- [x] 防重入测试使用中文 `it(...)` 描述
- [x] 防重入测试证明 processor 不会被重叠调用
- [x] 原有错误保护测试仍然通过
- [x] 原有 stop 测试仍然通过
- [x] `npm run test -w @learn/api -- tests/unit/job-worker-loop.test.ts` 通过
- [x] `npm run typecheck -w @learn/api` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
worker 防重入完成了
```
