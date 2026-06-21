# Task: MySQL 数据库队列：worker 运行与关闭复盘

## 背景

你已经完成了这一条后台任务链路：

```text
POST /jobs
  -> 写入 MySQL pending job

worker loop
  -> 定时查找 pending job
  -> 调用 processor
  -> 更新 job 状态

server shutdown
  -> stop worker loop
  -> close HTTP server
```

这张任务不写新功能。

这张任务只做复盘，目标是让你能说清楚：

```text
后台任务为什么不是普通 HTTP 请求
worker 为什么要能启动和停止
env 开关为什么重要
```

---

## 任务 1：新增复盘文档

新增：

```text
docs/reviews/job-worker-runtime.md
```

标题：

```md
# Worker 运行与关闭复盘
```

---

## 任务 2：回答 API 和 worker 的关系

在文档里写一段你自己的理解：

```md
## 1. API server 和 worker loop 是什么关系？
```

可以从这些问题展开：

```text
API server 负责什么？
worker loop 负责什么？
为什么它们现在可以放在同一个 Node 进程？
未来什么时候可能拆成两个进程？
```

你可以参考这个方向，但不要完全照抄：

```text
API server 负责接收用户请求，例如创建 job。
worker loop 负责在后台定时处理 pending job。
学习阶段它们放在同一个进程里更直观。
真实项目里如果任务很重，可能会拆成独立 worker 进程，避免影响 API 请求响应。
```

---

## 任务 3：回答为什么要用 env 开关

继续写：

```md
## 2. 为什么 JOB_WORKER_ENABLED 默认是 false？
```

请你解释：

```text
为什么后台任务会改变数据库状态？
为什么学习阶段不希望 API 一启动就自动处理 pending job？
为什么显式开启比默认开启更安全？
```

这里重点不是背答案。

你要抓住一个后端原则：

```text
会改变数据的后台行为，不应该在本地开发时悄悄发生。
```

---

## 任务 4：回答 shutdown 做了什么

继续写：

```md
## 3. shutdown 为什么要 stop worker loop？
```

请你解释：

```text
setInterval 如果不 clearInterval 会怎么样？
SIGINT 通常什么时候触发？
SIGTERM 通常什么时候触发？
server.close() 和 jobWorkerLoop.stop() 分别负责什么？
```

可以用自己的话写。

你写得不完整也没关系，完成后我会帮你补。

---

## 任务 5：画一条流程

在文档最后加一个流程：

```md
## 4. 当前后台任务完整流程
```

用纯文本写就行：

```text
client -> POST /jobs
API -> JobRepository.create()
MySQL -> 保存 pending job
worker loop -> 每隔 intervalMs 触发
processNextJob -> nextPending()
processor -> processJobByType()
JobRepository -> updateStatus(completed / failed / pending)
```

---

## 验证命令

```bash
npm run format:check
```

---

## 完成标准

- [x] 新增 `docs/reviews/job-worker-runtime.md`
- [x] 能说明 API server 和 worker loop 的分工
- [x] 能说明为什么 `JOB_WORKER_ENABLED` 默认 false
- [x] 能说明为什么 shutdown 要 stop worker loop
- [x] 能说明 SIGINT / SIGTERM 的大概含义
- [x] 能写出当前后台任务完整流程
- [x] `npm run format:check` 通过

完成后告诉我：

```text
worker 运行关闭复盘完成了
```
