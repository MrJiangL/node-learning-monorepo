# Activity Log action 复合索引判断

## 1. 当前带 action 查询的查询条件

```sql
WHERE userId = ?
  AND projectSnapshotId = ?
  AND action = ?
ORDER BY createdAt DESC
LIMIT 10
```

这个查询不是单独按 action 查，而是在某个用户、某个 Project 快照下面，再按 action 过滤，并按时间倒序取列表。

## 2. 为什么 action 单字段索引没有被实际选中

因为当前查询里，`action` 只是其中一个过滤条件，不是最主要的定位条件。

MySQL 看到的查询条件大概是：

```text
先限定 userId
再限定 projectSnapshotId
再限定 action
最后按 createdAt 倒序取最新 10 条
```

所以单字段索引：

```prisma
@@index([action])
```

只能帮助数据库先找到所有同一种 action 的日志，但这些日志可能属于很多用户、很多 Project。对当前接口来说，它不如先从用户和 Project 范围缩小数据更贴近查询形状。

这也是为什么 EXPLAIN 里它出现在 `possible_keys`，但最后实际使用的 `key` 仍然是：

```text
ActivityLog_userId_createdAt_idx
```

## 3. 我会设计什么候选复合索引

```prisma
@@index([userId, projectSnapshotId, action, createdAt])
```

这个顺序更贴近当前查询：

```text
userId            等值过滤：先限定当前用户
projectSnapshotId 等值过滤：再限定某个 Project 的历史快照
action            等值过滤：再限定具体动作类型
createdAt         排序字段：支持按时间倒序取列表
```

这里最重要的是：前面的字段都是等值过滤，最后的 `createdAt` 才是排序字段。这个结构比较适合“在一个很小的业务范围里，按时间拿最新记录”的列表接口。

## 4. 新增这个索引可能带来什么收益

如果 Activity Log 数据很多，并且经常按 action 查询某个 Project 的日志，这个索引可能让查询更稳定。

更具体一点说，它可能减少数据库扫描无关日志的数量，让数据库更快定位到：

```text
某个用户 + 某个 Project 快照 + 某种 action 下的最新日志
```

## 5. 新增这个索引可能带来什么代价

每次新增 ActivityLog 时，数据库都要维护更多索引，所以写入成本和存储占用会增加。

Activity Log 本身是写入比较频繁的表，因为 Project / Todo 的很多写操作都会记录日志。索引越多，新增日志时数据库要同步更新的索引结构也越多。

## 6. 我的暂时结论

我不会现在盲目添加这个索引，但它值得进入下一步实验。

原因是：

```text
1. 当前 EXPLAIN 已经说明 action 单字段索引没有被实际选中。
2. 当前查询形状确实更像 userId + projectSnapshotId + action + createdAt。
3. 但是本地数据量小，MySQL 不一定会立刻选择新索引。
4. 所以下一步应该先加复合索引，再用 EXPLAIN 对比结果，最后决定是否保留。
```

这个判断方式比“看到字段就加索引”更像真实后端开发：先看查询形状，再看执行计划，再考虑读写成本。
