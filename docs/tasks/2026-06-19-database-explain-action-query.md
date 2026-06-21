# Task: EXPLAIN 对比：Activity Log 带 action 查询会怎么选索引

## 背景

上一张你已经看懂了第一条 EXPLAIN 输出：

```text
possible_keys 是候选索引
key 是实际选择的索引
```

这次要练一个更真实的查询形状：

```text
Activity Log 列表 + action 过滤
```

也就是：

```sql
WHERE userId = ?
  AND projectSnapshotId = ?
  AND action = ?
ORDER BY createdAt DESC
```

你现在的 ActivityLog 里有一个单字段 action 索引：

```prisma
@@index([action])
```

但这条查询不只是按 action 查，它还带着 userId、projectSnapshotId 和 createdAt 排序。

所以我们要用 EXPLAIN 看看 MySQL 会怎么选。

---

## 这张任务只练什么

只练：

```text
1. 在 EXPLAIN 脚本里新增一个带 action 的查询
2. 对比两个 EXPLAIN 输出的 possible_keys / key
3. 写一段学习笔记
```

暂时不改 schema、不加索引、不删索引。

---

## 任务 1：扩展 EXPLAIN 脚本

修改：

```text
apps/api/src/scripts/explain-activity-log-query.ts
```

在原来的查询下面，再加一个带 action 的查询：

```ts
const sampleAction = "todo.completed";

const rowsWithAction = await prisma.$queryRaw<ExplainRow[]>`
  EXPLAIN
  SELECT
    id,
    action,
    message,
    createdAt,
    userId,
    projectSnapshotId
  FROM ActivityLog
  WHERE userId = ${sampleUserId}
    AND projectSnapshotId = ${sampleProjectSnapshotId}
    AND action = ${sampleAction}
  ORDER BY createdAt DESC
  LIMIT 10
`;

console.log("ActivityLog query with action filter");
console.table(rowsWithAction);
```

你也可以给原来的输出前面补一句：

```ts
console.log("ActivityLog query without action filter");
console.table(rows);
```

这样终端里会更容易看清楚两张表分别是哪条查询。

---

## 任务 2：运行脚本

运行：

```bash
npm run db:explain:activity-logs -w @learn/api
```

你应该会看到两张表：

```text
ActivityLog query without action filter
ActivityLog query with action filter
```

重点看第二张表的：

```text
possible_keys
key
rows
Extra
```

---

## 任务 3：写学习笔记

创建：

```text
docs/reviews/database-explain-action-query-notes.md
```

写下面几个小标题：

```md
# EXPLAIN action 查询对比笔记

## 1. 不带 action 时 key 选择了什么

## 2. 带 action 时 possible_keys 多了什么

## 3. 带 action 时 key 最后选择了什么

## 4. 这说明 action 单字段索引一定有用吗

## 5. 我现在还不懂的地方
```

每节 2-4 句即可。

---

## 验证命令

运行：

```bash
npm run db:explain:activity-logs -w @learn/api
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] EXPLAIN 脚本输出“不带 action”和“带 action”两张表
- [x] 创建 `docs/reviews/database-explain-action-query-notes.md`
- [x] 记录带 action 查询的 `possible_keys`
- [x] 记录带 action 查询的 `key`
- [x] 写下你对 `@@index([action])` 的初步判断
- [x] `npm run db:explain:activity-logs -w @learn/api` 通过
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
EXPLAIN action 查询对比完成了
```
