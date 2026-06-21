# Task: 判断是否需要 Activity Log action 复合索引

## 背景

你已经对比了两条查询的 `EXPLAIN`：

```text
1. 不带 action 的 Activity Log 列表查询
2. 带 action 的 Activity Log 列表查询
```

结果是：

```text
带 action 后，possible_keys 多了 ActivityLog_action_idx
但 key 仍然选择 ActivityLog_userId_createdAt_idx
```

这说明：

```text
单字段 action 索引成为了候选索引，但没有被 MySQL 实际选中。
```

下一步不是马上加索引，也不是马上删索引，而是先练一个真实后端判断：

```text
这个查询到底需不需要一个更贴近业务形状的复合索引？
```

---

## 这张任务只练什么

只练索引设计判断，不改 schema：

```text
1. 写出带 action 查询的真实查询形状
2. 分析单字段 action 索引为什么可能不够贴合
3. 设计一个候选复合索引
4. 写下新增索引的收益和代价
```

暂时不创建 migration。

---

## 学习目标

完成后你应该能说清楚：

```text
1. 为什么 action 单字段索引没有被当前查询选中
2. 什么查询形状可能适合 userId + projectSnapshotId + action + createdAt
3. 为什么新增索引也有代价
4. 为什么先写判断，再写 migration
```

---

## 任务 1：创建判断笔记

创建：

```text
docs/reviews/database-action-composite-index-decision.md
```

写下面几个小标题：

```md
# Activity Log action 复合索引判断

## 1. 当前带 action 查询的查询条件

## 2. 为什么 action 单字段索引没有被实际选中

## 3. 我会设计什么候选复合索引

## 4. 新增这个索引可能带来什么收益

## 5. 新增这个索引可能带来什么代价

## 6. 我的暂时结论
```

---

## 任务 2：写出当前查询形状

在第 1 节写：

```sql
WHERE userId = ?
  AND projectSnapshotId = ?
  AND action = ?
ORDER BY createdAt DESC
LIMIT 10
```

然后用自己的话解释：

```text
这个查询不是单独按 action 查，而是在某个用户、某个 Project 快照下面，再按 action 过滤，并按时间倒序取列表。
```

---

## 任务 3：设计候选复合索引

在第 3 节写这个候选索引：

```prisma
@@index([userId, projectSnapshotId, action, createdAt])
```

先不用真的加到 `schema.prisma`。

你只需要解释为什么这个顺序比较贴近查询：

```text
userId / projectSnapshotId / action 都是等值过滤条件。
createdAt 用来支持时间倒序列表。
```

---

## 任务 4：写收益和代价

收益可以写：

```text
如果 Activity Log 数据很多，并且经常按 action 查询某个 Project 的日志，这个索引可能让查询更稳定。
```

代价可以写：

```text
每次新增 ActivityLog 时，数据库都要维护更多索引，所以写入成本和存储占用会增加。
```

---

## 验证命令

这张任务只改文档，所以运行：

```bash
npm run format:check
```

---

## 完成标准

- [x] 创建 `docs/reviews/database-action-composite-index-decision.md`
- [x] 写出带 action 查询的查询条件
- [x] 写出候选复合索引 `@@index([userId, projectSnapshotId, action, createdAt])`
- [x] 写清楚新增索引的收益
- [x] 写清楚新增索引的代价
- [x] 写下你的暂时结论
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Activity Log action 复合索引判断完成了
```
