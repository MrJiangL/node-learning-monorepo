# Task: 数据库索引入门：从 Activity Log 查询反推复合索引

## 背景

你已经做完了测试强化阶段。下一阶段我帮你选：

```text
B. 深入数据库：索引、查询优化、事务、并发
```

第一张任务先不讲很玄的数据库优化，先从你已经写过的 Activity Log 查询开始。

现在 Activity Log 列表查询大概是这样：

```text
GET /projects/:projectId/activity-logs
```

它背后会按这些条件查：

```text
userId              当前登录用户，只能看自己的日志
projectSnapshotId   当前 Project 的历史快照 id
createdAt           按创建时间倒序，并支持时间范围过滤
action              可选过滤条件
```

这就是学习数据库索引的好入口：

```text
索引不是“字段多就加”。
索引应该从真实查询模式反推出来。
```

---

## 这张任务只练什么

只练：

```text
1. 看懂 Prisma schema 里的 @@index
2. 看懂 Activity Log 查询实际用到了哪些字段
3. 给 ActivityLog 补一个复合索引
4. 写一小段学习笔记
```

暂时不碰：

```text
EXPLAIN 执行计划
慢查询日志
并发锁
事务隔离级别
```

这些后面再学。

---

## 学习目标

完成后你应该能说清楚：

```text
1. 单字段索引和复合索引有什么区别
2. 为什么 Activity Log 列表适合用复合索引
3. 为什么索引顺序不是随便写的
4. Prisma 的 @@index 会生成数据库索引
5. 改 schema 后为什么要跑 migrate
```

---

## 任务 1：阅读 Activity Log 查询

打开：

```text
apps/api/src/modules/activity-logs/activity-logs.prisma-repository.ts
```

重点看 `findAll(filter)` 里的这段查询：

```ts
const where = {
  userId: filter.userId,
  projectSnapshotId: filter.projectId,
  action: filter.action,
  createdAt
};
```

再看：

```ts
orderBy: {
  createdAt: "desc";
}
```

你要先理解：

```text
这个接口不是只按 project 查。
它还必须按 userId 做权限边界，并按 createdAt 排序。
```

---

## 任务 2：阅读当前 ActivityLog 索引

打开：

```text
prisma/schema.prisma
```

找到：

```prisma
model ActivityLog {
  // ...

  @@index([userId, createdAt])
  @@index([projectId, createdAt])
  @@index([action])
  @@index([projectSnapshotId, createdAt])
}
```

先不用急着改，先回答自己：

```text
现在有没有一个索引同时覆盖 userId + projectSnapshotId + createdAt？
```

答案应该是：

```text
没有。
```

---

## 任务 3：补一个复合索引

修改：

```text
prisma/schema.prisma
```

在 `ActivityLog` 里补上这个索引：

```prisma
  // Activity Log 列表查询的核心条件是：
  // - userId：保证当前用户只能查自己的日志
  // - projectSnapshotId：定位某个 Project 的历史日志
  // - createdAt：支持按时间倒序列表和时间范围过滤
  //
  // 这是一个复合索引，适合服务 findAll 里的常见查询模式。
  @@index([userId, projectSnapshotId, createdAt])
```

放在现有 `@@index` 附近即可。

注意：这张任务先不要求你删旧索引。

旧索引有没有冗余，是下一步学习“索引取舍”时再判断。

---

## 任务 4：创建迁移

运行：

```bash
npm run prisma:migrate -w @learn/api -- --name add_activity_log_user_project_created_index
```

如果你看到 migration 文件被创建，说明 Prisma 已经根据 schema 生成了数据库变更。

迁移文件会出现在：

```text
prisma/migrations/
```

---

## 任务 5：写学习笔记

创建：

```text
docs/reviews/database-index-intro-notes.md
```

写下面几个小标题：

```md
# 数据库索引入门笔记

## 1. 索引是干嘛的

## 2. 单字段索引和复合索引的区别

## 3. Activity Log 为什么适合补 userId + projectSnapshotId + createdAt 索引

## 4. 为什么索引不是越多越好

## 5. 我现在还不懂的地方
```

每节 2-4 句即可。

---

## 验证命令

先跑 Prisma 生成：

```bash
npm run prisma:generate -w @learn/api
```

再跑：

```bash
npm run typecheck
npm run format:check
```

如果你不确定 migration 有没有成功，把终端报错复制给我。

---

## 完成标准

- [x] 看懂 `ActivityLogRepository.findAll` 的查询条件
- [x] 看懂 `ActivityLog` 当前已有索引
- [x] 给 `ActivityLog` 补上 `@@index([userId, projectSnapshotId, createdAt])`
- [x] 创建 Prisma migration
- [x] 创建 `docs/reviews/database-index-intro-notes.md`
- [x] `npm run prisma:generate -w @learn/api` 通过
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
数据库索引入门完成了
```
