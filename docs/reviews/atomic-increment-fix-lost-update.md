# 用 atomic increment 修复 lost update

## 1. lost update 脚本的结果

```text
First read attempts: 0
Second read attempts: 0
Final attempts: 1
Expected if both increments were preserved: 2
```

## 2. atomic increment 脚本的结果

```text
Final attempts: 2
Expected after two atomic increments: 2
```

## 3. 为什么 increment 可以修复这个问题

因为 `increment` 不是先把旧值读到应用层，再由应用层计算新值。

它让数据库直接执行类似下面的操作：

```sql
attempts = attempts + 1
```

所以两个并发 update 的含义是：

```text
第一次：把数据库当前 attempts 加 1
第二次：再把数据库当前 attempts 加 1
```

每次递增都基于数据库执行时的当前值，而不是应用层之前读到的旧值，所以不会出现两个流程都把 `1` 写回去的问题。

## 4. atomic increment 适合什么场景

atomic increment 适合单字段计数类更新，比如：

```text
1. attempts + 1
2. viewCount + 1
3. retryCount + 1
4. stock - 1
```

这些场景的共同点是：更新逻辑很简单，只需要让数据库对某个字段做原子加减。

## 5. 它不能替代哪些 transaction 场景

atomic increment 不能替代多步骤一致性场景。

比如一个业务流程需要同时做这些事：

```text
1. attempts + 1
2. 创建一条 JobLog
3. 如果 attempts 超过 maxAttempts，把 Job 标记为 failed
```

这种情况下，问题不只是“某个数字加一”，而是多个写操作要么一起成功，要么一起失败。这就需要 transaction 来保护一致性边界。

所以我现在的理解是：

```text
atomic increment 解决单字段并发递增。
transaction 解决多步骤写入的一致性。
lock 解决更复杂的并发读写竞争。
```
