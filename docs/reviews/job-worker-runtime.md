# Worker 运行与关闭复盘

## 1. API server 和 worker loop 是什么关系？

API server 负责接收用户请求，比如 `POST /jobs` 创建 job、`GET /jobs` 查看任务列表。

worker loop 负责在后台定时处理 `pending` job。它不是用户主动请求一次才执行一次，而是服务启动后按照 `intervalMs` 一轮一轮检查有没有任务可以处理。

学习阶段把 API server 和 worker loop 放在同一个 Node 进程里更直观：

```text
一个进程里同时有两个工作：
- HTTP server：响应请求
- worker loop：定时处理后台任务
```

真实项目里如果任务很重，或者任务处理会占用很多 CPU / IO，就可能拆成独立 worker 进程。这样 worker 处理慢任务时，不会影响 API 请求响应。

## 2. 为什么 JOB_WORKER_ENABLED 默认是 false？

后台任务会改变数据库状态。比如 worker 会把 job 从：

```text
pending -> processing -> completed
```

或者：

```text
pending -> processing -> failed
```

学习阶段不希望 API 一启动就自动处理 pending job，因为我可能只是想观察数据库里的任务状态，或者手动调用 `/jobs/process-next` 看状态怎么变化。如果 worker 默认开启，API 启动后可能还没来得及观察，任务就已经被处理掉了。

所以 `JOB_WORKER_ENABLED` 默认是 `false` 更安全。

我现在的理解是：

```text
会改变数据的后台行为，不应该在本地开发时悄悄发生。
```

显式开启比默认开启更安全，因为我必须清楚地写：

```bash
JOB_WORKER_ENABLED=true
```

这表示我知道 worker 会开始处理数据库里的 pending job。

## 3. shutdown 为什么要 stop worker loop？

`startJobWorkerLoop()` 内部用了 `setInterval`。

如果不 `clearInterval`，这个定时器就会一直留在 Node 进程里。结果可能是：

```text
进程不能干净退出
测试或本地开发时出现残留定时器
worker 继续尝试处理任务
资源没有被明确释放
```

`SIGINT` 通常来自我在终端按 `Ctrl+C`。

`SIGTERM` 通常来自外部系统要求进程退出，比如部署平台、进程管理器、容器平台关闭服务。

`server.close()` 负责停止 HTTP server：

```text
不再接收新的 HTTP 请求
等待已有连接关闭后执行回调
```

`jobWorkerLoop.stop()` 负责停止后台定时器：

```text
clearInterval(timer)
不再继续触发 processNextJob()
```

所以 shutdown 里要同时做两件事：

```text
先停 worker loop
再关闭 HTTP server
```

## 4. 当前后台任务完整流程

```text
client -> POST /jobs
API -> JobRepository.create()
MySQL -> 保存 pending job
worker loop -> 每隔 intervalMs 触发
processNextJob -> nextPending()
processor -> processJobByType()
JobRepository -> updateStatus(completed / failed / pending)
```
