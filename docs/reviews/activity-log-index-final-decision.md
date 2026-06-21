# Activity Log action 复合索引最终判断

## 1. 我做过哪些实验

我做了小数据量 EXPLAIN、500 条 seed 数据 EXPLAIN、FORCE INDEX EXPLAIN 三轮实验。

这三轮实验分别回答了不同问题：

```text
小数据量 EXPLAIN：看默认查询在本地少量数据下怎么选索引。
500 条 seed 数据 EXPLAIN：看数据量变大后，默认查询计划会不会变化。
FORCE INDEX EXPLAIN：看如果强制使用复合索引，rows 和 Extra 会不会变化。
```

## 2. 默认 EXPLAIN 说明了什么

默认 EXPLAIN 说明 MySQL 当前更愿意选择 action_idx。

它可以把 rows 降到 100，但会出现 Using filesort。

这说明 `action_idx` 在当前数据分布下有过滤价值：

```text
500 条日志平均分布在 5 种 action 上。
todo.completed 大约 100 条。
MySQL 使用 action_idx 后，估算扫描行数约为 100。
```

但它也有不足：

```text
action_idx 只能按 action 过滤。
它不能同时满足 ORDER BY createdAt DESC。
所以 MySQL 还需要额外排序，出现 Using filesort。
```

## 3. FORCE INDEX 说明了什么

FORCE INDEX 说明复合索引可以匹配这个查询形状，并且可以消除 Using filesort。

但 rows 没有明显减少，所以它的优势主要体现在排序路径上。

这次强制复合索引后的结果可以这样理解：

```text
key: ActivityLog_userId_projectSnapshotId_action_createdAt_idx
rows: 100
Extra: Backward index scan
```

复合索引并没有让 rows 从 100 继续下降，但它让 `Using filesort` 消失了。这说明它能帮助 MySQL 按索引里的 `createdAt` 顺序反向扫描。

## 4. 保留复合索引的理由

如果 action 过滤 + createdAt 倒序列表是高频查询，复合索引可能有价值，因为它能减少 filesort。

特别是当某个 action 下的数据量继续变大时，避免额外排序可能会更有意义。

保留它的理由是：

```text
1. 它匹配 userId + projectSnapshotId + action + createdAt 的查询形状。
2. FORCE INDEX 证明它能消除 Using filesort。
3. 它可以作为继续观察查询计划的实验样本。
```

## 5. 删除复合索引的理由

Activity Log 是写入频繁的表，额外索引会增加写入成本。

如果真实业务里很少按 action 过滤日志，保留这个索引可能不划算。

删除它的理由是：

```text
1. MySQL 默认查询计划目前没有主动选择它。
2. rows 没有比 action_idx 更少。
3. ActivityLog 每次写入都要维护更多索引。
4. 真实生产里索引越多，写入成本和存储成本越高。
```

## 6. 学习项目里的决定

学习项目里我选择暂时保留这个索引，因为它能帮助我继续观察不同查询计划，也能作为理解复合索引和 filesort 的例子。

这个决定偏向学习价值：保留它可以继续做更多 EXPLAIN 对比。

## 7. 真实生产项目里的决定

真实生产项目里，我不会只凭本地实验决定保留。

我会结合慢查询日志、接口访问频率、真实数据量和写入压力，再决定是否保留或删除。

如果 action 过滤是高频功能，并且慢查询显示 `Using filesort` 带来明显成本，我会考虑保留甚至调整索引。

如果 action 过滤很少使用，或者写入压力更重要，我会倾向删除这个实验索引，让 ActivityLog 表保持更轻。
