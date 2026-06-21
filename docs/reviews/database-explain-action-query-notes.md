# EXPLAIN action 查询对比笔记

## 1. 不带 action 时 key 选择了什么

不带 action 时，`key` 选择的是：

```text
ActivityLog_userId_createdAt_idx
```

也就是 Prisma schema 里的：

```prisma
@@index([userId, createdAt])
```

说明在当前本地数据量和查询条件下，MySQL 认为先按 `userId` 缩小范围，再配合 `createdAt` 倒序扫描是比较便宜的方案。

## 2. 带 action 时 possible_keys 多了什么

带 action 后，`possible_keys` 多了：

```text
ActivityLog_action_idx
```

这是因为 SQL 里新增了：

```sql
AND action = ?
```

所以 MySQL 认为 `@@index([action])` 也有可能用得上。

## 3. 带 action 时 key 最后选择了什么

带 action 时，`key` 最后仍然选择：

```text
ActivityLog_userId_createdAt_idx
```

也就是说，虽然 `ActivityLog_action_idx` 出现在候选索引里，但 MySQL 最后没有选它。

这说明 `possible_keys` 只是候选名单，真正要看的是 `key`。

## 4. 这说明 action 单字段索引一定有用吗

不能说明 action 单字段索引在当前查询里一定有用。

因为当前 Activity Log 列表查询不是单独按 action 查，它同时带着 `userId`、`projectSnapshotId`，还要按 `createdAt` 倒序。

所以对这个接口来说，单字段 `action` 索引可能不如一个更贴近查询形状的复合索引。

但现在也不能直接删它，因为未来可能会有“按 action 做全局统计”这类查询。

## 5. 我现在还不懂的地方

我现在还不懂的是：如果经常查询 `userId + projectSnapshotId + action + createdAt`，是不是应该新增一个包含 action 的复合索引。

下一步需要继续判断：这个查询是不是高频、数据量是否足够大、以及新增索引会不会让写入成本变高。
