# 事务和并发阶段复盘

## 1. 这一阶段我做了什么

这一阶段我做了：

```text
1. 用 lost update 脚本观察并发读旧值再写回的问题。
2. 用 atomic increment 修复单字段计数丢失更新。
3. 用 Prisma transaction 对比多步骤写入失败时的回滚行为。
4. 用 SELECT FOR UPDATE 观察行锁如何让第二个 worker 等待。
5. 用 idempotencyKey 防止同一个 Job 创建请求重复生成数据。
```

## 2. 我怎么理解 lost update

lost update 是指多个流程都基于同一个旧值计算新值，然后后写入的结果覆盖了前一次更新的意义。

这阶段的例子是：

```text
两个流程都读到 attempts = 0。
两个流程都计算 0 + 1 = 1。
两个流程都写回 attempts = 1。
最终结果是 1，而不是 2。
```

## 3. atomic increment 解决什么问题

atomic increment 解决单字段计数类并发更新。

它让数据库直接执行：

```text
attempts = attempts + 1
```

这样每一次递增都基于数据库执行时的当前值，而不是应用层之前读到的旧值。

## 4. transaction 解决什么问题

transaction 解决多个数据库操作的一致性边界。

比如：

```text
1. Job.attempts + 1
2. 创建 JobLog
```

如果中间失败，不使用 transaction 可能留下：

```text
attempts: 1
logCount: 0
```

使用 transaction 后，失败会整体回滚：

```text
attempts: 0
logCount: 0
```

## 5. SELECT FOR UPDATE 解决什么问题

SELECT FOR UPDATE 解决复杂读写流程里的并发竞争。

当一个 transaction 锁住某一行后，另一个 transaction 如果也想锁同一行，就要等待。

这一阶段的行锁实验里，第二个 worker 大约等待了 1 秒才拿到锁：

```text
worker-2: locked row after 1017ms
```

这说明行锁可以保护“先读、判断、再写”的流程，但锁持有太久会影响并发性能。

## 6. idempotency key 解决什么问题

idempotency key 解决重复请求问题。

比如同一个 `POST /jobs` 请求因为网络重试或用户重复点击被发送两次，如果带着同一个 `idempotencyKey`，后端应该返回第一次创建的 Job，而不是再创建一条新 Job。

它解决的是：

```text
同一个业务请求重复执行
```

不是：

```text
多个流程同时修改同一行
```

## 7. 它们之间的区别

atomic increment：解决单字段计数类并发更新。
transaction：解决多个数据库操作要么一起成功、要么一起失败。
SELECT FOR UPDATE：解决复杂读写流程里，同一行数据被多个 transaction 同时修改的问题。
idempotency key：解决同一个业务请求被重复提交或重复投递的问题。

我的选择思路是：

```text
如果只是 attempts + 1，我优先考虑 atomic increment。
如果是 Job update + JobLog create，要一起成功或失败，我考虑 transaction。
如果必须先读一行、判断状态、再更新，而且多个 worker 会抢同一行，我考虑 SELECT FOR UPDATE。
如果是同一个创建请求可能重复发送，我考虑 idempotency key。
```

## 8. 我还不太确定的地方

我还不太确定的是：

```text
1. 真实生产里什么时候应该使用行锁，什么时候应该避免行锁。
2. 幂等 key 的过期和清理策略怎么设计。
3. 多个 worker 抢任务时，应该用 SELECT FOR UPDATE、状态条件更新，还是数据库队列专门方案。
4. 并发问题怎么写成稳定的自动化测试。
```

## 9. 下一阶段我想学什么

后端工程化阶段收束：从功能实现转向部署、监控、CI 或生产化设计。

我下一阶段想从“代码功能能跑”继续走向“项目更像真实后端服务”，包括：

```text
1. CI / GitHub Actions
2. 部署和环境变量管理
3. 健康检查和日志
4. 生产化运行前的检查清单
```
