# Task: Activity Log action 索引保留决策

## 背景

你已经完成了 action 复合索引实验：

```prisma
@@index([userId, projectSnapshotId, action, createdAt])
```

实验结果是：

```text
possible_keys 里出现了新索引
key 最终仍然选择 ActivityLog_userId_createdAt_idx
```

这说明新索引已经创建成功，也进入了 MySQL 的候选索引列表。但是在当前本地数据量下，MySQL 没有实际选择它。

下一步不急着继续加索引，而是练一个真实后端决策：

```text
这个实验索引现在应该保留、回滚，还是继续观察？
```

---

## 这张任务只练什么

只练索引生命周期判断，不写新 API：

```text
1. 根据 EXPLAIN 结果判断新索引有没有证明收益。
2. 根据写入成本判断额外索引有没有代价。
3. 写出一个明确的临时决策。
4. 如果决定继续观察，写清楚以后用什么信号再重新判断。
```

---

## 学习目标

完成后你应该能说清楚：

```text
1. possible_keys 出现新索引，不等于 key 实际使用新索引。
2. 一个没被当前小数据量选中的索引，不一定永远没价值。
3. Activity Log 这种写入频繁的表，索引越多，写入成本越高。
4. 后端索引决策不是“字段越多越好”，而是读性能、写成本、业务频率之间的取舍。
```

---

## 任务 1：创建决策复盘

创建：

```text
docs/reviews/database-action-index-keep-or-revert.md
```

写下面这些小标题：

```md
# Activity Log action 索引保留决策

## 1. 当前实验结果

## 2. 新索引证明了什么

## 3. 新索引还没有证明什么

## 4. 保留它的理由

## 5. 回滚它的理由

## 6. 我的临时决策

## 7. 以后什么时候重新评估
```

---

## 任务 2：写当前实验结果

在第 1 节写：

```text
新索引 ActivityLog_userId_projectSnapshotId_action_createdAt_idx 已经出现在 possible_keys。
但是 MySQL 最终选择的 key 仍然是 ActivityLog_userId_createdAt_idx。
```

这句话很重要，因为它把“候选”和“实际使用”分开了。

---

## 任务 3：写新索引证明了什么

在第 2 节写：

```text
新索引证明了它的字段顺序能匹配当前查询条件，所以 MySQL 会把它加入候选索引。
这说明 schema 和 migration 是有效的，索引不是无效索引。
```

---

## 任务 4：写新索引还没有证明什么

在第 3 节写：

```text
新索引还没有证明它在当前数据量下比旧索引更快。
因为 EXPLAIN 的 key 没有选择它，rows 也没有明显变化。
```

这里要记住：

```text
possible_keys 是“可能能用”
key 是“实际选择用”
```

---

## 任务 5：分别写保留和回滚理由

保留理由可以写：

```text
如果将来 Activity Log 数据量变大，并且用户经常按 action 过滤某个 Project 的日志，这个索引可能会有价值。
```

回滚理由可以写：

```text
Activity Log 是写入频繁的表，每次创建日志都要维护更多索引。当前 EXPLAIN 还没有证明新索引带来实际收益，所以它可能只是增加写入和存储成本。
```

---

## 任务 6：写临时决策

你可以选择下面其中一个结论。

我建议你先选 A：

```text
A. 暂时保留，继续观察
```

理由：

```text
这是学习项目，本阶段重点是理解索引实验流程。
新索引已经进入 possible_keys，可以作为后续大数据量实验和慢查询观察的样本。
但在真实生产项目里，如果长期没有查询收益，就应该考虑回滚。
```

你也可以选择 B：

```text
B. 回滚索引，保持表更轻
```

如果选 B，下一步我们会写一个删除索引的 migration。

---

## 验证命令

这张任务只改文档，所以运行：

```bash
npm run format:check
```

---

## 完成标准

- [x] 创建 `docs/reviews/database-action-index-keep-or-revert.md`
- [x] 写清楚 possible_keys 和 key 的区别
- [x] 写清楚保留索引的理由
- [x] 写清楚回滚索引的理由
- [x] 写下你的临时决策：A 暂时保留，或 B 回滚索引
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Activity Log action 索引保留决策完成了
```
