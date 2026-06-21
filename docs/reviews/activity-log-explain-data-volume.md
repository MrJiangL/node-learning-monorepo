# Activity Log EXPLAIN 数据量实验

## 1. 我 seed 了多少数据

500 条 ActivityLog 实验数据。

## 2. seed 脚本为什么使用固定 userId 和 projectSnapshotId

因为 explain 脚本里查询的是固定的：

```text
userId = explain-user-id
projectSnapshotId = explain-project-id
```

如果 seed 脚本每次都生成随机 userId 或 projectSnapshotId，EXPLAIN 查询就不一定能命中刚刚插入的实验数据。

另外，ActivityLog 和 User 有必填关系，Project 也属于某个 User，所以 seed 脚本要先准备固定 User 和固定 Project，再插入属于它们的日志。

## 3. 数据量变大后的 EXPLAIN 结果

带 action 查询的结果里，`possible_keys` 包含：

```text
ActivityLog_userId_createdAt_idx,
ActivityLog_action_idx,
ActivityLog_projectSnapshotId_createdAt_idx,
ActivityLog_userId_projectSnapshotId_createdAt_idx,
ActivityLog_userId_projectSnapshotId_action_createdAt_idx
```

最终 `key` 选择：

```text
ActivityLog_action_idx
```

## 4. MySQL 最终选择了哪个 key

```text
ActivityLog_action_idx
```

这说明数据量变成 500 条后，MySQL 的选择发生了变化：它不再选择 `ActivityLog_userId_createdAt_idx`，而是选择了单字段 `action` 索引。

## 5. rows / Extra 有没有变化

有变化。

不带 action 查询：

```text
key: ActivityLog_userId_createdAt_idx
rows: 500
Extra: Using index condition; Using where; Backward index scan
```

带 action 查询：

```text
key: ActivityLog_action_idx
rows: 100
Extra: Using where; Using filesort
```

这里可以这样理解：

```text
rows 从 500 变成 100：因为 500 条数据平均分布在 5 种 action 上，todo.completed 大约有 100 条。
Using filesort：说明 MySQL 用 action 索引找到数据后，还需要额外排序 createdAt。
```

## 6. 我的理解

EXPLAIN 不是看“我希望数据库用哪个索引”，而是看 MySQL 根据当前数据和统计信息实际准备怎么查。

这次数据量实验说明：

```text
1. 数据量变大后，MySQL 的 key 选择确实可能变化。
2. action 单字段索引能减少扫描行数，所以 MySQL 选择了它。
3. 但因为 action 单字段索引不包含 createdAt 排序能力，所以 Extra 出现了 Using filesort。
4. 复合索引已经在 possible_keys 里，但当前优化器仍然没有选择它。
```

所以这次结果不是“复合索引一定没用”，而是说明下一步可以专门分析：

```text
为什么 MySQL 选择 action_idx，而不是 userId + projectSnapshotId + action + createdAt 复合索引？
```
