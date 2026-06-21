# Task: Activity Log action 复合索引实验

## 背景

你刚刚完成了一个判断：

```prisma
@@index([userId, projectSnapshotId, action, createdAt])
```

这个候选索引更贴近当前 Activity Log 的 action 查询：

```sql
WHERE userId = ?
  AND projectSnapshotId = ?
  AND action = ?
ORDER BY createdAt DESC
LIMIT 10
```

这一张任务开始做实验：真的加索引，跑 migration，再用 EXPLAIN 看 MySQL 是否会选它。

注意：本地数据量很少时，MySQL 仍然可能不选新索引。这不是你写错了，而是优化器会根据数据量、索引选择性、排序成本来自己做选择。

---

## 这张任务只练什么

只练一件事：

```text
用 migration 添加一个更贴近查询形状的复合索引，然后用 EXPLAIN 验证实际选择。
```

你不用改 API，不用改 repository，不用写新接口。

---

## 学习目标

完成后你应该能说清楚：

```text
1. Prisma 里怎么给已有 model 增加复合索引。
2. 为什么加了索引后还要生成 migration。
3. 为什么 EXPLAIN 的 key 才是“实际用了哪个索引”。
4. 为什么新索引没有被选择时，也不能马上断定索引没用。
```

---

## 任务 1：修改 Prisma schema

打开：

```text
prisma/schema.prisma
```

找到 `model ActivityLog`，在已有索引附近加入：

```prisma
// 这个索引用来实验带 action 的 Activity Log 查询。
// 当前查询形状是：
// where userId + projectSnapshotId + action，再 orderBy createdAt desc。
//
// 前三个字段都是等值过滤，createdAt 用来支持按时间倒序读取列表。
// 注意：它是实验索引，不代表一定要长期保留；是否保留要看 EXPLAIN 和真实业务频率。
@@index([userId, projectSnapshotId, action, createdAt])
```

你可以放在这个索引后面：

```prisma
@@index([userId, projectSnapshotId, createdAt])
```

---

## 任务 2：创建 migration

运行：

```bash
npm run prisma:migrate -w @learn/api -- --name add_activity_log_action_query_index
```

成功后会生成类似这样的目录：

```text
prisma/migrations/时间戳_add_activity_log_action_query_index/
```

里面的 `migration.sql` 大概会包含：

```sql
CREATE INDEX `ActivityLog_userId_projectSnapshotId_action_createdAt_idx`
ON `ActivityLog`(`userId`, `projectSnapshotId`, `action`, `createdAt`);
```

如果你看到的索引名略有不同，以 Prisma 生成的为准。

---

## 任务 3：重新生成 Prisma Client

运行：

```bash
npm run prisma:generate -w @learn/api
```

这一步的作用是让 Prisma Client 同步最新 schema。虽然索引通常不影响 TypeScript 类型，但改完 schema 后生成一次是一个好习惯。

---

## 任务 4：再次运行 EXPLAIN

运行：

```bash
npm run db:explain:activity-logs -w @learn/api
```

重点看第二段：

```text
ActivityLog query with action filter
```

记录这几个字段：

```text
possible_keys
key
rows
Extra
```

你要判断：

```text
1. possible_keys 里有没有新索引？
2. key 最终选择的是不是新索引？
3. rows 有没有变化？
4. Extra 有没有明显变化？
```

---

## 任务 5：写实验复盘

创建：

```text
docs/reviews/database-action-composite-index-experiment.md
```

写下面这些小标题：

```md
# Activity Log action 复合索引实验

## 1. 我新增的索引

## 2. migration 生成了什么 SQL

## 3. 加索引前的 EXPLAIN 结果

## 4. 加索引后的 EXPLAIN 结果

## 5. MySQL 最终选择了哪个 key

## 6. 我的暂时结论：保留、继续观察，还是考虑回滚
```

第 6 节你可以先这样写，然后根据实际结果改：

```text
如果新索引出现在 possible_keys，说明它已经成为候选索引。
如果 key 没有选择新索引，说明在当前本地数据量下，MySQL 认为旧索引成本更低。
我暂时不会只凭一次本地 EXPLAIN 就下最终结论，还需要结合真实数据量和接口访问频率判断。
```

---

## 验证命令

按顺序运行：

```bash
npm run prisma:migrate -w @learn/api -- --name add_activity_log_action_query_index
npm run prisma:generate -w @learn/api
npm run db:explain:activity-logs -w @learn/api
npm run typecheck
npm run format:check
```

如果 migration 已经跑过，不要重复创建同名 migration。你可以只运行后四个命令。

---

## 完成标准

- [x] `prisma/schema.prisma` 增加 `@@index([userId, projectSnapshotId, action, createdAt])`
- [x] 生成 `add_activity_log_action_query_index` migration
- [x] `npm run prisma:generate -w @learn/api` 通过
- [x] `npm run db:explain:activity-logs -w @learn/api` 能看到新索引是否进入候选
- [x] 创建 `docs/reviews/database-action-composite-index-experiment.md`
- [x] 写下是否保留这个索引的暂时判断
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Activity Log action 复合索引实验完成了
```
