# Worker Loop 阶段复盘

## 1. setInterval 和 async 为什么容易出问题？

`setInterval` 不会等待 async 函数完成，它只负责按时间触发回调。

如果上一轮还没结束，下一轮时间到了仍然会触发。比如 `intervalMs = 1000`，但某个 job 处理需要 3000ms，那么第 2 秒、第 3 秒仍然可能继续触发新的 `processNextJob()`。

`isProcessing` 是为了防止同一个 loop 内部重叠执行。它相当于当前 Node 进程里的一个运行中标记：

```text
isProcessing = true
  表示上一轮还没结束，下一轮直接跳过

isProcessing = false
  表示当前没有任务处理流程在跑，可以开始下一轮
```

这个防重入只保护同一个 Node 进程里的同一个 worker loop。它不是数据库锁，也不是分布式锁。

## 2. processNextJob 的错误和 worker loop 的错误有什么区别？

`processNextJob` 处理单个 job 的业务失败。

比如 `processor` 抛错，说明这个 job 的业务处理失败了。`processNextJob` 会 catch 这个错误，然后根据 `attempts` 和 `maxAttempts` 把 job 更新成：

```text
pending
```

或者：

```text
failed
```

这是业务层面的失败，属于“这个 job 没处理成功”。

`processSafely` 保护 worker loop 自己不要因为运行异常失控。

比如 `repository.nextPending()` 查询数据库时连接失败，或者 `updateStatus()` 写数据库时出错，这种错误不一定对应某个 job 的业务失败，而是 worker loop 自己运行时出问题。

所以我现在的理解是：

```text
processNextJob:
  处理单个 job 的状态流转

processSafely:
  保护 worker loop 本身，避免一次运行异常导致整个 loop 失控
```

## 3. stop、shutdown、JOB_WORKER_ENABLED 分别解决什么问题？

`stop()` 负责停止后台定时器，也就是执行 `clearInterval(timer)`。

如果不 stop，`setInterval` 还会继续留在 Node 进程里，后面仍然可能触发 `processNextJob()`。

`shutdown` 负责服务退出时的整体清理：

```text
先 stop worker loop
再关闭 HTTP server
```

`JOB_WORKER_ENABLED=false` 适合本地学习，因为 worker 会改变数据库状态。

如果本地 API 一启动就自动处理 pending job，我可能还没来得及观察任务状态，它就已经从 `pending` 变成 `completed` 或 `failed` 了。默认关闭更安全，需要的时候再显式打开：

```bash
JOB_WORKER_ENABLED=true
```

## 4. 当前 worker loop 的心智模型

```text
server.ts
-> 根据 JOB_WORKER_ENABLED 决定是否启动 loop
-> setInterval 定时触发
-> processSafely 检查 isProcessing
-> processNextJob 处理一个 pending job
-> processor 根据 type 执行业务
-> repository 更新 job 状态和日志
-> shutdown 时 stop loop
```
