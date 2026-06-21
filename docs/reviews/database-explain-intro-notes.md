# EXPLAIN 入门笔记

## 1. EXPLAIN 是干嘛的

`EXPLAIN` 是让 MySQL 告诉我们：如果执行这条 SQL，它大概会怎么查。

它不是看业务数据结果，而是看查询计划，比如可能用哪些索引、实际选了哪个索引、大概扫描多少行。

## 2. possible_keys / key 分别是什么意思

`possible_keys` 表示 MySQL 认为这条查询“可能可以用”的索引列表。

`key` 表示 MySQL 优化器最后实际选择使用的索引。

所以 `possible_keys` 里面出现某个索引，不代表它最后真的用了；要看 `key`。

## 3. 这次 ActivityLog 查询用了哪个索引

这次 `possible_keys` 里面出现了：

```text
ActivityLog_userId_createdAt_idx
ActivityLog_projectSnapshotId_createdAt_idx
ActivityLog_userId_projectSnapshotId_createdAt_idx
```

但是 `key` 实际选择的是：

```text
ActivityLog_userId_createdAt_idx
```

这说明 MySQL 这次没有选择我们刚补的 `userId + projectSnapshotId + createdAt` 复合索引。

这不一定代表新索引没用，也可能是当前测试数据量、统计信息、查询参数导致优化器觉得旧索引成本更低。

## 4. rows / Extra 我现在怎么看

`rows` 是 MySQL 估算大概要扫描多少行，不是最终一定返回多少行。

这次 `rows` 很小，说明当前本地数据量不大，所以优化器选哪个索引的差异可能并不明显。

`Extra` 里出现了 `Using where; Backward index scan`，表示 MySQL 使用了 where 条件，并且为了满足倒序排序做了反向索引扫描。

## 5. 我现在还不懂的地方

我现在还不懂的是：为什么我们新建了更贴合查询条件的复合索引，但 MySQL 最后还是选了 `userId + createdAt`。

下一步需要继续学习：优化器为什么会这样选、数据量会不会影响选择、以及什么时候可以安全删除旧索引。
