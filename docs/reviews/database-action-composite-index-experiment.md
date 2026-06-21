# Activity Log action 复合索引实验

## 1. 我新增的索引

```prisma
@@index([userId, projectSnapshotId, action, createdAt])
```

这个索引对应的查询形状是：

```sql
WHERE userId = ?
  AND projectSnapshotId = ?
  AND action = ?
ORDER BY createdAt DESC
LIMIT 10
```

前面的 `userId`、`projectSnapshotId`、`action` 都是等值过滤条件，最后的 `createdAt` 用来支持时间倒序列表。

## 2. migration 生成了什么 SQL

```sql
CREATE INDEX `ActivityLog_userId_projectSnapshotId_action_createdAt_idx`
ON `ActivityLog`(`userId`, `projectSnapshotId`, `action`, `createdAt`);
```

这说明 Prisma migration 最终做的事情就是让 MySQL 在 `ActivityLog` 表上创建一个新的复合索引。

## 3. 加索引前的 EXPLAIN 结果

加索引前，带 action 查询的核心结果是：

```text
possible_keys:
ActivityLog_userId_createdAt_idx,
ActivityLog_action_idx,
ActivityLog_projectSnapshotId_createdAt_idx,
ActivityLog_userId_projectSnapshotId_createdAt_idx

key:
ActivityLog_userId_createdAt_idx

rows:
1

Extra:
Using where; Backward index scan
```

这里最重要的是：`ActivityLog_action_idx` 只是候选索引，最后实际使用的是 `ActivityLog_userId_createdAt_idx`。

## 4. 加索引后的 EXPLAIN 结果

加索引后，不带 action 的查询已经能看到新索引进入候选：

```text
possible_keys:
ActivityLog_userId_createdAt_idx,
ActivityLog_projectSnapshotId_createdAt_idx,
ActivityLog_userId_projectSnapshotId_createdAt_idx,
ActivityLog_userId_projectSnapshotId_action_createdAt_idx

key:
ActivityLog_userId_createdAt_idx
```

带 action 的查询也能看到新索引进入候选：

```text
possible_keys:
ActivityLog_userId_createdAt_idx,
ActivityLog_action_idx,
ActivityLog_projectSnapshotId_createdAt_idx,
ActivityLog_userId_projectSnapshotId_createdAt_idx,
ActivityLog_userId_projectSnapshotId_action_createdAt_idx

key:
ActivityLog_userId_createdAt_idx

rows:
1

Extra:
Using where; Backward index scan
```

这说明新索引是有效创建的，也被 MySQL 认为“可能能用”。但是在当前本地数据量和统计信息下，MySQL 仍然认为旧索引成本更低。

## 5. MySQL 最终选择了哪个 key

```text
ActivityLog_userId_createdAt_idx
```

也就是说：

```text
possible_keys 里出现新索引：说明新索引进入候选。
key 没有选择新索引：说明 MySQL 当前没有实际使用它。
```

这不是 migration 失败，也不是 Prisma 写错。它只是说明优化器根据当前数据量，选择了它认为更便宜的执行方案。

## 6. 我的暂时结论：保留、继续观察，还是考虑回滚

我的暂时结论是：继续观察，不马上回滚，也不马上把它当成“必须保留”的最终索引。

原因是：

```text
1. 新索引已经进入 possible_keys，说明索引创建成功，也确实匹配查询条件。
2. 当前 key 仍然选择旧索引，说明本地小数据量下，新索引优势没有体现出来。
3. Activity Log 是写入频繁的表，额外索引会增加写入和存储成本。
4. 是否长期保留，应该结合真实数据量、接口访问频率、慢查询表现继续判断。
```

这次实验最重要的收获不是“新索引有没有被用”，而是学会了后端里更真实的索引判断流程：

```text
查询形状 -> 设计候选索引 -> migration -> EXPLAIN -> 看 possible_keys/key -> 做取舍
```
