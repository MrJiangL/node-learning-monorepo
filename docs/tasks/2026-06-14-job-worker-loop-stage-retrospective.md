# Task: MySQL 数据库队列：worker loop 阶段复盘

## 背景

你已经完成了 worker loop 的几个关键能力：

```text
定时轮询
可停止 stop()
server 启动接入
错误保护 logger.error
防重入 isProcessing
```

这张任务不写新功能。

这张任务写一份阶段复盘，帮助你把后台任务 loop 的几个概念真正串起来。

---

## 任务 1：新增复盘文档

新增：

```text
docs/reviews/job-worker-loop-stage.md
```

标题：

```md
# Worker Loop 阶段复盘
```

---

## 任务 2：解释 setInterval + async 的坑

写一个小节：

```md
## 1. setInterval 和 async 为什么容易出问题？
```

请你用自己的话回答：

```text
setInterval 会不会等待 async 函数完成？
如果一次处理超过 intervalMs，会发生什么？
为什么需要 isProcessing？
```

可以参考这个方向：

```text
setInterval 只负责按时间触发回调，不会等待 Promise。
如果上一轮还没结束，下一轮时间到了仍然会触发。
isProcessing 是为了防止同一个 loop 内部重叠执行。
```

---

## 任务 3：解释错误保护的边界

写一个小节：

```md
## 2. processNextJob 的错误和 worker loop 的错误有什么区别？
```

请你区分：

```text
processor 抛错
repository 抛错
processNextJob catch 的是什么？
processSafely catch 的是什么？
```

核心理解：

```text
processNextJob 处理单个 job 的业务失败。
processSafely 保护 worker loop 自己不要因为运行异常失控。
```

---

## 任务 4：解释 stop / shutdown / env 开关

写一个小节：

```md
## 3. stop、shutdown、JOB_WORKER_ENABLED 分别解决什么问题？
```

请你说明：

```text
stop() 解决什么？
shutdown 解决什么？
JOB_WORKER_ENABLED=false 为什么适合本地学习？
```

---

## 任务 5：写当前 worker loop 心智模型

写一个小节：

```md
## 4. 当前 worker loop 的心智模型
```

用纯文本流程写：

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

---

## 验证命令

```bash
npm run format:check
```

---

## 完成标准

- [x] 新增 `docs/reviews/job-worker-loop-stage.md`
- [x] 能解释 `setInterval` 不等待 async 完成
- [x] 能解释为什么需要 `isProcessing`
- [x] 能区分 `processNextJob` 错误处理和 `processSafely` 错误保护
- [x] 能解释 `stop()` / `shutdown` / `JOB_WORKER_ENABLED`
- [x] 能写出当前 worker loop 心智模型
- [x] `npm run format:check` 通过

完成后告诉我：

```text
worker loop 阶段复盘完成了
```
