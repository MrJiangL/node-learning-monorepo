# EXPLAIN FORCE INDEX 实验

## 1. 默认 action 查询选择了哪个 key

```text
ActivityLog_action_idx
```

默认 action 查询的结果是：

```text
key: ActivityLog_action_idx
rows: 100
Extra: Using where; Using filesort
```

这说明 MySQL 默认认为先用 action 单字段索引过滤到大约 100 行，是当前成本更低的选择。

## 2. FORCE INDEX 查询选择了哪个 key

```text
ActivityLog_userId_projectSnapshotId_action_createdAt_idx
```

FORCE INDEX 后的结果是：

```text
key: ActivityLog_userId_projectSnapshotId_action_createdAt_idx
rows: 100
Extra: Backward index scan
```

这说明 FORCE INDEX 确实让 MySQL 使用了我们指定的复合索引。

## 3. rows 有没有变化

没有明显变化。

默认 action 查询：

```text
rows: 100
```

FORCE INDEX 查询：

```text
rows: 100
```

这说明在当前 500 条实验数据下，强制复合索引并没有让 MySQL 估算扫描行数进一步降低。

## 4. Extra 有没有变化

有变化。

默认 action 查询：

```text
Extra: Using where; Using filesort
```

FORCE INDEX 查询：

```text
Extra: Backward index scan
```

这个变化很重要：默认使用 `action_idx` 时，MySQL 还需要额外排序，所以出现 `Using filesort`。强制使用复合索引后，MySQL 可以按索引顺序反向扫描 `createdAt`，所以 `Using filesort` 消失了。

## 5. 我对 FORCE INDEX 的理解

FORCE INDEX 可以帮助我做实验，但它不是优先使用的业务代码方案。

因为数据库的数据分布会变化，强制索引可能让未来某些场景变慢。

这次 FORCE INDEX 的作用是让我观察：

```text
如果 MySQL 使用复合索引，执行计划会不会减少 filesort。
```

结果是：会减少 filesort，但 rows 没有明显变化。

## 6. 这个实验是否改变我对复合索引的判断

会改变一部分判断。

之前我只知道复合索引进入了 `possible_keys`，但默认没有被选中。

现在 FORCE INDEX 证明了：

```text
1. 复合索引确实能服务 userId + projectSnapshotId + action + createdAt 这个查询形状。
2. 复合索引可以避免默认 action_idx 带来的 Using filesort。
3. 但在当前实验数据下，MySQL 默认仍然不选它，说明优化器认为 action_idx 成本更低。
```

所以我的暂时判断是：复合索引有潜在价值，但是否长期保留，还要看真实业务里 action 过滤 + 时间倒序列表是不是高频场景。
