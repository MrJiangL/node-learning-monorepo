# Task: Activity Log action 复合索引最终判断

## 背景

你已经完成了三轮实验：

```text
1. 小数据量 EXPLAIN：MySQL 默认选择 userId_createdAt 索引。
2. 500 条数据量 EXPLAIN：MySQL 默认选择 action_idx，rows 约 100，但出现 Using filesort。
3. FORCE INDEX 实验：强制复合索引后，rows 仍约 100，但 Using filesort 消失。
```

现在要做一个阶段性判断：

```text
ActivityLog_userId_projectSnapshotId_action_createdAt_idx 到底要不要继续保留？
```

---

## 这张任务只练什么

只练真实后端决策，不写代码：

```text
1. 根据多次 EXPLAIN 结果做索引判断。
2. 同时考虑查询收益和写入成本。
3. 写出“学习项目”和“真实生产项目”两种结论。
```

---

## 学习目标

完成后你应该能说清楚：

```text
1. 为什么默认没选中不代表索引完全没价值。
2. 为什么 FORCE INDEX 能证明索引能力，但不能直接代表生产方案。
3. 为什么写入频繁的表不能无限加索引。
4. 什么情况下保留索引，什么情况下删除索引。
```

---

## 任务 1：创建最终判断文档

创建：

```text
docs/reviews/activity-log-index-final-decision.md
```

写下面这些小标题：

```md
# Activity Log action 复合索引最终判断

## 1. 我做过哪些实验

## 2. 默认 EXPLAIN 说明了什么

## 3. FORCE INDEX 说明了什么

## 4. 保留复合索引的理由

## 5. 删除复合索引的理由

## 6. 学习项目里的决定

## 7. 真实生产项目里的决定
```

---

## 任务 2：写实验总结

在第 1 节写：

```text
我做了小数据量 EXPLAIN、500 条 seed 数据 EXPLAIN、FORCE INDEX EXPLAIN 三轮实验。
```

---

## 任务 3：写默认 EXPLAIN 的结论

在第 2 节写：

```text
默认 EXPLAIN 说明 MySQL 当前更愿意选择 action_idx。
它可以把 rows 降到 100，但会出现 Using filesort。
```

---

## 任务 4：写 FORCE INDEX 的结论

在第 3 节写：

```text
FORCE INDEX 说明复合索引可以匹配这个查询形状，并且可以消除 Using filesort。
但 rows 没有明显减少，所以它的优势主要体现在排序路径上。
```

---

## 任务 5：写保留和删除理由

保留理由可以写：

```text
如果 action 过滤 + createdAt 倒序列表是高频查询，复合索引可能有价值，因为它能减少 filesort。
```

删除理由可以写：

```text
Activity Log 是写入频繁的表，额外索引会增加写入成本。
如果真实业务里很少按 action 过滤日志，保留这个索引可能不划算。
```

---

## 任务 6：写你的最终判断

学习项目里建议写：

```text
学习项目里我选择暂时保留这个索引，因为它能帮助我继续观察不同查询计划，也能作为理解复合索引和 filesort 的例子。
```

真实生产项目里建议写：

```text
真实生产项目里，我不会只凭本地实验决定保留。
我会结合慢查询日志、接口访问频率、真实数据量和写入压力，再决定是否保留或删除。
```

---

## 验证命令

这张任务只改文档，所以运行：

```bash
npm run format:check
```

---

## 完成标准

- [x] 创建 `docs/reviews/activity-log-index-final-decision.md`
- [x] 总结三轮 EXPLAIN 实验
- [x] 写清楚默认 EXPLAIN 的结论
- [x] 写清楚 FORCE INDEX 的结论
- [x] 写清楚保留索引的理由
- [x] 写清楚删除索引的理由
- [x] 写出学习项目和真实生产项目里的不同决策
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Activity Log action 复合索引最终判断完成了
```
