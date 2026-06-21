# action_idx 和 Using filesort 复盘

## 1. 当前 EXPLAIN 结果

带 action 查询最终选择了 ActivityLog_action_idx。

rows 是 100。

Extra 是 Using where; Using filesort。

## 2. 为什么 action_idx 让 rows 变少

seed 脚本插入了 500 条日志，并平均分布在 5 种 action 上。

todo.completed 大约有 100 条。

所以 MySQL 使用 action_idx 时，估算扫描行数从 500 变成 100。

这里的重点是：action_idx 能帮 MySQL 先按 action 过滤一批数据。

## 3. 为什么出现 Using filesort

action_idx 只能帮助 MySQL 按 action 找到数据。

但是当前查询还要求 ORDER BY createdAt DESC。

因为 action_idx 里没有 createdAt，MySQL 找到 action 对应的数据后，还需要额外按 createdAt 排序，所以出现 Using filesort。

Using filesort 不一定代表查询很糟糕，但它说明 MySQL 没有完全利用索引顺序完成排序。如果 rows 很少，这个额外排序可能可以接受；如果 rows 很多，就值得继续优化。

## 4. 为什么复合索引进入 possible_keys 但没成为 key

复合索引已经进入 possible_keys，说明它可以作为候选。

但 MySQL 当前认为 action_idx 的成本更低，所以最终 key 选择了 action_idx。

这可能和本地数据分布、统计信息、每个 action 的选择性有关。

也就是说：

```text
possible_keys 说明“能用”。
key 说明“最后选了谁”。
Extra 说明“选完之后还要做什么额外动作”。
```

## 5. 我现在会怎么判断这个结果

我现在不会立刻删除复合索引，也不会立刻认为 action_idx 就是最优答案。

当前结果说明：

```text
1. action_idx 在当前数据分布下能有效减少扫描行数。
2. 但 action_idx 不能覆盖 ORDER BY createdAt DESC，所以出现 Using filesort。
3. 复合索引已经进入 possible_keys，说明它不是无效索引。
4. 下一步可以用 FORCE INDEX 做实验，观察如果强制使用复合索引，rows 和 Extra 会怎么变化。
```

这里的学习重点是：EXPLAIN 不能只看 key，应该把 key、rows、Extra 放在一起看。
