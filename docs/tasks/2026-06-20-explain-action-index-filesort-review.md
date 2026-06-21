# Task: 复盘 action_idx 和 Using filesort

## 背景

你刚刚做完 Activity Log 数据量实验。

500 条实验数据后，带 action 查询的 EXPLAIN 结果发生了变化：

```text
key: ActivityLog_action_idx
rows: 100
Extra: Using where; Using filesort
```

这个结果很值得拆开看：

```text
1. MySQL 选择了 action 单字段索引。
2. rows 从 500 降到了 100。
3. 但是 Extra 出现了 Using filesort。
```

下一步先不急着改索引，而是把这个结果讲明白。

---

## 这张任务只练什么

只练 EXPLAIN 结果解释：

```text
1. 为什么 action_idx 能让 rows 变少。
2. 为什么使用 action_idx 后还会出现 Using filesort。
3. 为什么 possible_keys 里有复合索引，但 key 没选它。
4. 当前结果对索引保留决策有什么影响。
```

---

## 学习目标

完成后你应该能说清楚：

```text
1. 索引不仅能过滤，也可能帮助排序。
2. 单字段 action 索引适合先按 action 找数据，但不一定适合 ORDER BY createdAt。
3. Using filesort 不一定是错误，但它表示 MySQL 需要额外排序。
4. EXPLAIN 要把 key / rows / Extra 放在一起看。
```

---

## 任务 1：创建复盘文档

创建：

```text
docs/reviews/explain-action-index-filesort-review.md
```

写下面这些小标题：

```md
# action_idx 和 Using filesort 复盘

## 1. 当前 EXPLAIN 结果

## 2. 为什么 action_idx 让 rows 变少

## 3. 为什么出现 Using filesort

## 4. 为什么复合索引进入 possible_keys 但没成为 key

## 5. 我现在会怎么判断这个结果
```

---

## 任务 2：写当前 EXPLAIN 结果

在第 1 节写：

```text
带 action 查询最终选择了 ActivityLog_action_idx。
rows 是 100。
Extra 是 Using where; Using filesort。
```

---

## 任务 3：解释 rows 变少

在第 2 节用自己的话解释：

```text
seed 脚本插入了 500 条日志，并平均分布在 5 种 action 上。
todo.completed 大约有 100 条。
所以 MySQL 使用 action_idx 时，估算扫描行数从 500 变成 100。
```

---

## 任务 4：解释 Using filesort

在第 3 节写：

```text
action_idx 只能帮助 MySQL 按 action 找到数据。
但是当前查询还要求 ORDER BY createdAt DESC。
因为 action_idx 里没有 createdAt，MySQL 找到 action 对应的数据后，还需要额外按 createdAt 排序，所以出现 Using filesort。
```

注意：

```text
Using filesort 不代表一定很糟糕。
它只说明 MySQL 做了一次额外排序。
如果排序数据很少，成本可能还能接受；如果数据很多，就要继续优化。
```

---

## 任务 5：解释为什么没选复合索引

在第 4 节写一个暂时判断：

```text
复合索引已经进入 possible_keys，说明它可以作为候选。
但 MySQL 当前认为 action_idx 的成本更低，所以最终 key 选择了 action_idx。
这可能和本地数据分布、统计信息、每个 action 的选择性有关。
```

---

## 验证命令

这张任务只改文档，所以运行：

```bash
npm run format:check
```

---

## 完成标准

- [x] 创建 `docs/reviews/explain-action-index-filesort-review.md`
- [x] 写清楚 rows 为什么从 500 变成 100
- [x] 写清楚 Using filesort 是什么意思
- [x] 写清楚 action_idx 和复合索引的区别
- [x] 写下你对当前索引结果的判断
- [x] `npm run format:check` 通过

完成后告诉我：

```text
action_idx 和 Using filesort 复盘完成了
```
