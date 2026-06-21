# Task: EXPLAIN FORCE INDEX 实验

## 背景

你已经看到 500 条实验数据下，带 action 查询的结果是：

```text
key: ActivityLog_action_idx
rows: 100
Extra: Using where; Using filesort
```

但是我们设计过的复合索引也在 `possible_keys` 里：

```text
ActivityLog_userId_projectSnapshotId_action_createdAt_idx
```

下一步做一个实验：不用改业务代码，只在 EXPLAIN 脚本里加一条 `FORCE INDEX` 查询，观察如果 MySQL 被强制使用复合索引，`rows` 和 `Extra` 会怎么变化。

注意：`FORCE INDEX` 只是实验工具，不是现在要接入 API 的生产写法。

---

## 这张任务只练什么

只练一件事：

```text
用 FORCE INDEX 对比 MySQL 默认选择和强制复合索引后的 EXPLAIN 差异。
```

---

## 学习目标

完成后你应该能说清楚：

```text
1. FORCE INDEX 是什么。
2. 为什么不能随便在业务 SQL 里强制索引。
3. 默认 key 和强制 key 的 rows / Extra 有什么差异。
4. 复合索引是否真的减少 filesort 或扫描行数。
```

---

## 任务 1：修改 EXPLAIN 脚本

修改：

```text
apps/api/src/scripts/explain-activity-log-query.ts
```

在 `rowsWithAction` 查询后面，增加第三段查询：

```ts
const rowsWithForcedCompositeIndex = await prisma.$queryRaw<ExplainRow[]>`
  EXPLAIN
  SELECT
    id,
    action,
    message,
    createdAt,
    userId,
    projectSnapshotId
  FROM ActivityLog FORCE INDEX (ActivityLog_userId_projectSnapshotId_action_createdAt_idx)
  WHERE userId = ${sampleUserId}
    AND projectSnapshotId = ${sampleProjectSnapshotId}
    AND action = ${sampleAction}
  ORDER BY createdAt DESC
  LIMIT 10
`;

console.log("ActivityLog query with forced composite action index");
console.table(rowsWithForcedCompositeIndex);
```

建议在这段代码上方加注释：

```ts
// FORCE INDEX 是实验工具：
// - 它可以让我们观察“如果 MySQL 使用这个索引，会得到什么执行计划”
// - 但不要因为一次实验就把 FORCE INDEX 写进业务 API
// - 真实项目里要结合数据量、慢查询、线上表现再决定
```

---

## 任务 2：运行 seed

先确保实验数据存在：

```bash
npm run db:seed:activity-log-explain -w @learn/api
```

---

## 任务 3：运行 EXPLAIN

运行：

```bash
npm run db:explain:activity-logs -w @learn/api
```

这次应该看到三段输出：

```text
ActivityLog query without action filter
ActivityLog query with action filter
ActivityLog query with forced composite action index
```

重点比较后两段：

```text
默认 action 查询
强制复合索引查询
```

记录：

```text
key
rows
Extra
```

---

## 任务 4：写实验复盘

创建：

```text
docs/reviews/explain-force-index-experiment.md
```

写下面这些小标题：

```md
# EXPLAIN FORCE INDEX 实验

## 1. 默认 action 查询选择了哪个 key

## 2. FORCE INDEX 查询选择了哪个 key

## 3. rows 有没有变化

## 4. Extra 有没有变化

## 5. 我对 FORCE INDEX 的理解

## 6. 这个实验是否改变我对复合索引的判断
```

第 5 节可以这样开头：

```text
FORCE INDEX 可以帮助我做实验，但它不是优先使用的业务代码方案。
因为数据库的数据分布会变化，强制索引可能让未来某些场景变慢。
```

---

## 验证命令

按顺序运行：

```bash
npm run db:seed:activity-log-explain -w @learn/api
npm run db:explain:activity-logs -w @learn/api
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] `explain-activity-log-query.ts` 增加 FORCE INDEX 查询
- [x] EXPLAIN 输出出现第三段 `forced composite action index`
- [x] 创建 `docs/reviews/explain-force-index-experiment.md`
- [x] 对比默认查询和 FORCE INDEX 查询的 key / rows / Extra
- [x] 写下你对 FORCE INDEX 的理解
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
EXPLAIN FORCE INDEX 实验完成了
```
