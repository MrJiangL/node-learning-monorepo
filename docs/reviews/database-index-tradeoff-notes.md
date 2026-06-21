# 数据库索引取舍笔记

## 1. 当前 ActivityLog 索引分析

| 索引                                              | 可能服务的查询                       | 暂时判断                |
| ------------------------------------------------- | ------------------------------------ | ----------------------- |
| `@@index([userId, createdAt])`                    | 查询某个用户的全部日志，并按时间排序 | 暂时保留 / 可能未来有用 |
| `@@index([projectId, createdAt])`                 | 旧的按 projectId 查询日志            | 需要继续确认            |
| `@@index([action])`                               | 按 action 做统计或过滤               | 暂时保留                |
| `@@index([projectSnapshotId, createdAt])`         | 不带 userId 时按 Project 快照查日志  | 需要继续确认            |
| `@@index([userId, projectSnapshotId, createdAt])` | 当前 Project Activity Log 列表查询   | 保留                    |

## 2. 什么是最左前缀规则

最左前缀规则可以先理解成：复合索引要从最左边的字段开始连续使用。

比如：

```prisma
@@index([userId, projectSnapshotId, createdAt])
```

它的顺序是：

```text
先按 userId 排
再在同一个 userId 里面按 projectSnapshotId 排
最后在同一个 projectSnapshotId 里面按 createdAt 排
```

所以它适合 `where userId = ?`，也适合 `where userId = ? and projectSnapshotId = ?`。

但如果查询只有 `where projectSnapshotId = ?`，就跳过了最左边的 `userId`，这个复合索引就不一定能很好发挥作用。

## 3. 为什么新复合索引不能直接替代所有旧索引

因为复合索引的字段顺序很重要，不是字段都出现过就能互相替代。

`@@index([userId, projectSnapshotId, createdAt])` 可以服务“先按用户，再按 Project 快照，再按时间”的查询。

但它不能直接替代 `@@index([projectSnapshotId, createdAt])`，因为后者适合“不带 userId，只按 Project 快照和时间查”的查询。

同理，它也不能直接替代 `@@index([action])`，因为 action 不在这个复合索引里。

## 4. 我觉得哪些索引以后可能可以删除

我觉得以后可能优先确认的是：

```prisma
@@index([projectId, createdAt])
```

原因是现在 Activity Log 查询已经改成依赖 `projectSnapshotId`，Project 删除后 `projectId` 可能会变成 `null`。

所以 `projectId + createdAt` 可能是旧查询留下来的索引。

但是现在先不删除，因为还没用 `EXPLAIN` 看真实查询计划，也还没确认代码里有没有别的地方依赖它。

`@@index([projectSnapshotId, createdAt])` 也需要继续确认，但它不能只因为新索引里包含 `projectSnapshotId` 就立刻删掉。
