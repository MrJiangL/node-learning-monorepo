# 数据库锁实验：SELECT FOR UPDATE

## 1. 我运行脚本看到了什么

```text
worker-1: trying to lock row
worker-2: trying to lock row
worker-1: locked row after 3ms
worker-1: updated attempts
worker-2: locked row after 1019ms
worker-2: updated attempts
Final attempts: 2
```

这个结果说明：

```text
worker-1 先锁住同一条 Job。
worker-2 也尝试锁同一条 Job，但它没有马上拿到锁。
worker-2 等 worker-1 的 transaction 结束后，才继续执行。
```

这次我还遇到了一个脚本错误：

```ts
await Promise.all([[runLockedWorker("worker-1", 1000), runLockedWorker("worker-2", 0)]]);
```

这里多包了一层数组，导致外层 `Promise.all` 没有真正等待两个 worker 完成。主流程提前执行到查询 final 和 `prisma.$disconnect()`，后台 transaction 还在跑，所以出现了 `Transaction not found`。

修正后应该是：

```ts
await Promise.all([runLockedWorker("worker-1", 1000), runLockedWorker("worker-2", 0)]);
```

## 2. 为什么第二个 worker 会等待

因为两个 worker 都在 transaction 里执行了：

```sql
SELECT id
FROM Job
WHERE id = ?
FOR UPDATE
```

`FOR UPDATE` 会对查到的行加排他锁。

当 worker-1 先锁住这条 Job 时，worker-2 如果也想锁同一行，就必须等待 worker-1 的 transaction 结束。

所以 worker-2 的日志里会看到类似：

```text
worker-2: locked row after 1019ms
```

## 3. SELECT FOR UPDATE 为什么要放在 transaction 里

`SELECT FOR UPDATE` 的锁会跟 transaction 绑定。

如果不放在 transaction 里，查询结束后连接可能很快提交或释放，锁的保护范围就很短，无法包住后续“读取、判断、更新”的业务流程。

放在 transaction 里的意思是：

```text
transaction 开始
SELECT FOR UPDATE 锁住行
基于这行数据做判断
更新这行数据
transaction 提交，释放锁
```

## 4. 行锁和 atomic increment 的区别

atomic increment 适合简单计数：

```text
attempts = attempts + 1
```

它不需要先把数据读出来做复杂判断。

行锁适合更复杂的流程：

```text
先锁住一行
读取当前状态
根据状态做业务判断
再决定怎么更新
```

所以：

```text
atomic increment 更简单，成本更低。
SELECT FOR UPDATE 更强，但会让其他并发流程等待。
```

## 5. 行锁的风险是什么

行锁可以保护复杂的并发读写，但锁持有时间越长，其他请求等待越久。

所以锁要尽量短，只包住必须保护的数据库操作。

真实项目里要避免在 transaction 里做这些事：

```text
1. 调第三方接口
2. 做很慢的计算
3. 等用户输入
4. 做不必要的大量查询
```

否则锁会被持有太久，影响并发性能。
