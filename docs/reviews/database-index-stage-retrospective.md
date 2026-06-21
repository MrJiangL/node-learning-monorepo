# 数据库索引阶段总复盘

## 1. 这一阶段我做了什么

1. 从 Activity Log 查询反推复合索引。
2. 判断旧索引是否冗余。
3. 用 EXPLAIN 看 MySQL 实际选择哪个索引。
4. 对比 action 查询下的索引选择。
5. 添加 action 复合索引并做实验。
6. 用 seed 数据观察数据量变化后的 EXPLAIN。
7. 用 FORCE INDEX 验证复合索引能否消除 Using filesort。
8. 做 action 复合索引最终判断。

## 2. 我现在怎么理解复合索引

复合索引不是把字段随便拼在一起，而是要从查询形状反推。

比如 Activity Log 的查询形状是：

```sql
WHERE userId = ?
  AND projectSnapshotId = ?
  AND action = ?
ORDER BY createdAt DESC
LIMIT 10
```

所以候选复合索引才会设计成：

```prisma
@@index([userId, projectSnapshotId, action, createdAt])
```

我现在理解的是：

```text
前面的字段通常服务 where 等值过滤。
最后的 createdAt 可以服务排序。
索引字段顺序要贴近真实查询，而不是看到哪个字段就给哪个字段加索引。
```

## 3. 我现在怎么阅读 EXPLAIN

我现在看 EXPLAIN 不只看 key。
我会先看 possible_keys 了解候选索引，再看 key 了解实际使用的索引。
然后看 rows 估算扫描量，最后看 Extra 了解是否还有 Using where、Using filesort、Backward index scan 等额外动作。

## 4. 我怎么理解 possible_keys / key / rows / Extra

```text
possible_keys：MySQL 认为可能可以使用的候选索引。
key：MySQL 最终实际选择使用的索引。
rows：MySQL 估算需要扫描的行数，不是最终返回的数据条数。
Extra：额外执行信息，比如 Using where、Using filesort、Backward index scan。
```

我现在会把它们放在一起看，而不是只盯着 `key`。

## 5. 我怎么理解 Using filesort

Using filesort 表示 MySQL 不能完全依赖当前索引顺序完成排序，需要额外排序。
它不一定代表查询一定很慢，但如果参与排序的数据很多，就可能成为性能问题。

## 6. 我怎么理解 FORCE INDEX

FORCE INDEX 适合用来做实验，观察某个索引如果被使用，会得到怎样的执行计划。
但是它不应该随便写进业务代码，因为数据分布会变化，强制索引可能让未来的查询变慢。

## 7. 我对 Activity Log action 复合索引的最终判断

学习项目里我选择暂时保留 `ActivityLog_userId_projectSnapshotId_action_createdAt_idx`。

原因是：

```text
1. 它匹配 action 过滤 + createdAt 倒序列表的查询形状。
2. FORCE INDEX 证明它能消除 Using filesort。
3. 它适合作为后续继续观察 EXPLAIN 的实验样本。
```

真实生产项目里，我不会只凭本地实验决定保留。我会继续看：

```text
1. action 过滤是不是高频功能。
2. 慢查询日志里这个查询是否真的慢。
3. ActivityLog 写入压力是否明显。
4. 真实数据量下 MySQL 是否更愿意选择这个复合索引。
```

## 8. 我还不太确定的地方

我还不太确定的是：

```text
1. 真实生产数据量下，MySQL 会不会主动选择 action 复合索引。
2. 什么数据分布会让 MySQL 从 action_idx 切换到复合索引。
3. 写入压力变大时，多个 ActivityLog 索引的维护成本会有多明显。
```

## 9. 下一阶段我准备学什么

下一阶段我准备进入事务和并发边界。
因为我已经学过 Prisma transaction 的基础用法，现在可以继续学习并发更新、数据库锁、幂等和一致性问题。
