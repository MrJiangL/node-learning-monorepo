# 数据库 Job 模型复盘

## 1. 为什么 Job 需要 status？

`status` 用来记录任务当前处于哪个阶段。

数据库队列不是只保存一条普通数据，它要表达一个任务的生命周期：

```text
pending -> processing -> completed
pending -> processing -> failed
pending -> processing -> pending -> 再次重试
```

如果没有 `status`，worker 就不知道哪些任务还没处理，也无法区分正在处理、已经成功、最终失败的任务。

## 2. 为什么 Job 需要 attempts / maxAttempts？

`attempts` 记录任务已经尝试处理了多少次。

`maxAttempts` 记录任务最多允许尝试多少次。

它们配合起来决定失败后要不要继续重试：

```text
attempts < maxAttempts  -> 回到 pending，等待下次重试
attempts >= maxAttempts -> 标记 failed，不再重试
```

如果没有这两个字段，任务失败后就很难判断是继续重试，还是已经应该最终失败。

## 3. 为什么 payload 适合用 Json？

因为不同任务类型需要的数据结构不一样。

例如：

```text
send-email      -> { to, subject, content }
generate-report -> { userId, reportType }
resize-image    -> { fileId, width, height }
```

如果把这些字段都做成固定列，表会越来越乱，而且很多列只对某一种任务有意义。

`Json` 更适合保存“不同任务类型各自不同的参数”。

## 4. 为什么 JobLog 单独建表？

`JobLog` 单独建表后，可以按 `jobId` 查询某个任务的所有日志。

这样做有几个好处：

```text
日志可以不断追加
不用每次更新整个 Job 的大 JSON
后面可以对日志做分页
Job 删除时可以通过 Cascade 删除对应日志
```

这比把 logs 全部塞到 `Job.logs Json` 里更接近真实后端系统。

## 5. @@index([status, createdAt]) 是为了优化什么查询？

这个索引用来优化 worker 查找待处理任务的查询。

典型查询会像这样：

```text
找 status = "pending" 的任务
按 createdAt 从早到晚排序
取最早的一条或一批
```

也就是：

```text
WHERE status = "pending"
ORDER BY createdAt ASC
```

所以 `@@index([status, createdAt])` 可以帮助数据库更快找到“最早进入队列的 pending 任务”。
