# EXPLAIN 结果复盘

## 1. 这次 possible_keys 有哪些索引

这次 `possible_keys` 里面有三个索引：

```text
ActivityLog_userId_createdAt_idx
ActivityLog_projectSnapshotId_createdAt_idx
ActivityLog_userId_projectSnapshotId_createdAt_idx
```

`possible_keys` 的意思是：MySQL 觉得这些索引“可能可以用”。

它不是最终结果，只是候选名单。

## 2. 这次 key 实际选择了哪个索引

这次 `key` 实际选择的是：

```text
ActivityLog_userId_createdAt_idx
```

`key` 才是 MySQL 最后真正决定使用的索引。

所以虽然我们新增的 `userId + projectSnapshotId + createdAt` 出现在了 `possible_keys`，但这次它没有被最终选中。

## 3. 为什么 possible_keys 有新索引，但 key 没选它

因为 MySQL 优化器不是简单地按“字段最多”来选索引。

它会根据当前数据量、索引统计信息、查询条件、排序方式来估算成本。

这次本地数据很少，`rows` 估算只有 `1`，所以 MySQL 可能认为用 `userId + createdAt` 已经足够便宜。

另外，这条查询有 `ORDER BY createdAt DESC`，`userId + createdAt` 这个索引也能比较自然地配合按时间倒序扫描。

## 4. 为什么现在暂时不删旧索引

因为这次 `key` 实际选择了旧索引：

```text
ActivityLog_userId_createdAt_idx
```

这说明旧索引至少在当前数据和当前查询计划下仍然可能被使用。

如果现在直接删除它，可能会让 MySQL 改用别的索引，甚至在某些查询下变慢。

所以现在的正确判断是：先保留旧索引，继续用更多查询形状和更多数据量观察。

## 5. 我现在还不懂的地方

我现在还不懂的是：为什么看起来更精确的新复合索引，没有被 MySQL 最终选中。

我还需要继续学习 `type`、`key_len`、`rows`、`Extra` 这些字段，以及数据量变大后查询计划会不会变化。

目前我先记住：`possible_keys` 是候选索引，`key` 是实际使用索引。
