# Task: EXPLAIN 结果复盘：为什么暂时不删旧索引

## 背景

你已经跑通了 Activity Log 查询的 `EXPLAIN`。

这次结果里最值得注意的是：

```text
possible_keys 里包含新复合索引
key 实际选择了 ActivityLog_userId_createdAt_idx
```

这说明：

```text
MySQL 认为新索引“可能可用”，但最后没有选它。
```

所以我们现在不能直接删除旧索引。

---

## 这张任务只练什么

只练：

```text
1. 复盘 EXPLAIN 输出
2. 解释 possible_keys 和 key 的差异
3. 写出“为什么暂时不删旧索引”的判断
```

暂时不改 schema，不删索引，不写 migration。

---

## 学习目标

完成后你应该能说清楚：

```text
1. 为什么 possible_keys 有新索引，不代表 key 一定选新索引
2. 为什么 key 选择旧索引时，不能立刻删除旧索引
3. 为什么优化器选择可能受数据量影响
```

---

## 任务 1：重新运行 EXPLAIN

运行：

```bash
npm run db:explain:activity-logs -w @learn/api
```

看输出里的这几列：

```text
possible_keys
key
rows
Extra
```

---

## 任务 2：创建复盘笔记

创建：

```text
docs/reviews/database-explain-result-review.md
```

写下面几个小标题：

```md
# EXPLAIN 结果复盘

## 1. 这次 possible_keys 有哪些索引

## 2. 这次 key 实际选择了哪个索引

## 3. 为什么 possible_keys 有新索引，但 key 没选它

## 4. 为什么现在暂时不删旧索引

## 5. 我现在还不懂的地方
```

每节 2-4 句即可。

---

## 参考理解

你可以这样写：

```text
possible_keys 表示 MySQL 觉得可能能用的索引。
key 表示 MySQL 实际选择的索引。
这次新复合索引出现在 possible_keys，但没有出现在 key。
所以现在不能证明旧索引没用，暂时不应该删除旧索引。
```

---

## 验证命令

运行：

```bash
npm run db:explain:activity-logs -w @learn/api
npm run format:check
```

---

## 完成标准

- [x] 创建 `docs/reviews/database-explain-result-review.md`
- [x] 写清楚 `possible_keys` 和 `key` 的区别
- [x] 写清楚这次实际选择的索引
- [x] 写清楚为什么暂时不删旧索引
- [x] `npm run db:explain:activity-logs -w @learn/api` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
EXPLAIN 结果复盘完成了
```
