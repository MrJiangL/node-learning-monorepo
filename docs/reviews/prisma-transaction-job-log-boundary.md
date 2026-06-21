# Prisma transaction 一致性边界实验

## 1. 不使用 transaction 的结果

```text
Unsafe flow failed: Simulated failure before creating JobLog
After unsafe flow { attempts: 1, logCount: 0 }
```

这说明 `attempts + 1` 已经写入数据库了，但后面的 JobLog 没有创建成功。

## 2. 使用 transaction 的结果

```text
Transaction flow failed: Simulated failure inside transaction
After transaction flow { attempts: 0, logCount: 0 }
```

这说明 transaction 里的 `attempts + 1` 没有留下来，被回滚了。

## 3. 为什么 unsafe flow 会留下 attempts = 1

因为不使用 transaction 时，每一次数据库写入都是独立提交的。

unsafe flow 的过程是：

```text
1. update Job.attempts 成功，数据库已经保存 attempts = 1。
2. 业务在创建 JobLog 前抛错。
3. 抛错不会自动撤销前面已经提交的 update。
```

所以最后出现了一个半完成状态：

```text
attempts: 1
logCount: 0
```

## 4. 为什么 transaction flow 会回滚 attempts

因为 `prisma.$transaction` 会把 transaction 回调里的写操作放进同一个事务边界。

transaction flow 的过程是：

```text
1. transaction 内 update Job.attempts。
2. transaction 内抛出错误。
3. Prisma 回滚整个 transaction。
4. transaction 内已经执行过的 update 不会真正提交。
```

所以最后回到初始状态：

```text
attempts: 0
logCount: 0
```

## 5. transaction 和 atomic increment 的区别

atomic increment 解决单字段并发递增。
transaction 解决多个数据库写操作要么一起成功、要么一起失败的问题。

我现在可以这样区分：

```text
atomic increment：保护一个字段的原子加减。
transaction：保护一组数据库操作的一致性边界。
lock：保护更复杂的并发读写竞争。
```
