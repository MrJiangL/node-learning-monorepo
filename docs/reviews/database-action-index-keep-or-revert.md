# Activity Log action 索引保留决策

## 1. 当前实验结果

新索引 ActivityLog_userId_projectSnapshotId_action_createdAt_idx 已经出现在 possible_keys。
但是 MySQL 最终选择的 key 仍然是 ActivityLog_userId_createdAt_idx。

## 2. 新索引证明了什么

新索引证明了它的字段顺序能匹配当前查询条件，所以 MySQL 会把它加入候选索引。
这说明 schema 和 migration 是有效的，索引不是无效索引。

## 3. 新索引还没有证明什么

新索引还没有证明它在当前数据量下比旧索引更快。
因为 EXPLAIN 的 key 没有选择它，rows 也没有明显变化。

这里要把两个字段分开看：

```text
possible_keys：MySQL 觉得“可能能用”的索引
key：MySQL 最终实际选择的索引
```

## 4. 保留它的理由

如果将来 Activity Log 数据量变大，并且用户经常按 action 过滤某个 Project 的日志，这个索引可能会有价值。

这个索引的价值点在于它更贴近下面这种查询：

```sql
WHERE userId = ?
  AND projectSnapshotId = ?
  AND action = ?
ORDER BY createdAt DESC
LIMIT 10
```

## 5. 回滚它的理由

Activity Log 是写入频繁的表，每次创建日志都要维护更多索引。当前 EXPLAIN 还没有证明新索引带来实际收益，所以它可能只是增加写入和存储成本。

真实项目里，如果一个索引长期没有被慢查询、访问频率或者执行计划证明有收益，就应该考虑删掉，避免让写入路径越来越重。

## 6. 我的临时决策

A. 暂时保留，继续观察

这是学习项目，本阶段重点是理解索引实验流程。

新索引已经进入 possible_keys，可以作为后续大数据量实验和慢查询观察的样本。

但在真实生产项目里，如果长期没有查询收益，就应该考虑回滚。

## 7. 以后什么时候重新评估

以后出现下面几种情况时，需要重新评估：

```text
1. Activity Log 数据量明显变大，比如单个用户或单个 Project 下有大量日志。
2. 用户经常使用 action 过滤日志，比如只看 todo.completed 或 project.updated。
3. 慢查询日志显示 Activity Log action 查询变慢。
4. EXPLAIN 显示新索引开始被选为 key，或者 rows 明显减少。
5. 写入压力变大，需要减少 Activity Log 表上的索引数量。
```

目前我的选择是先保留它，用后续“数据量实验”继续观察。
