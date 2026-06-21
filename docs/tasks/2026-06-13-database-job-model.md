# Task: MySQL 数据库队列：设计 Job / JobLog 数据模型

## 背景

你已经选择下一阶段走：

```text
B：MySQL 数据库队列
```

现在不要急着把内存队列全替换掉。

第一步只做数据库模型：

```text
Job
JobLog
```

目标是让数据库能表达当前内存队列里的这些概念：

```text
id
type
payload
status
attempts
maxAttempts
createdAt
updatedAt
logs
```

---

## 任务 1：在 Prisma 里添加 Job model

修改：

```text
prisma/schema.prisma
```

新增：

```prisma
model Job {
  id          String   @id
  type        String
  payload     Json
  status      String
  attempts    Int      @default(0)
  maxAttempts Int      @default(3)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  logs        JobLog[]

  @@index([status, createdAt])
  @@index([type])
}
```

学习点：

```text
payload 用 Json，是因为不同 job type 的 payload 结构可能不同。

send-email 可能是 { to, subject, content }
generate-report 可能是 { userId, reportType }

如果用很多固定列，会很难兼容不同任务类型。
```

---

## 任务 2：在 Prisma 里添加 JobLog model

继续修改：

```text
prisma/schema.prisma
```

新增：

```prisma
model JobLog {
  id        String   @id
  message   String
  createdAt DateTime @default(now())

  jobId     String
  job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@index([jobId])
}
```

学习点：

```text
为什么 logs 不直接放在 Job.logs Json？

学习阶段两种都可以。
但单独建 JobLog 表更接近真实后端：
- 可以按 jobId 查询日志
- 日志可以不断追加
- 不需要每次更新整个 Job 的大 JSON
- 后面可以做分页或筛选
```

---

## 任务 3：理解为什么 status 暂时用 String

你可能会问：

```text
为什么不用 Prisma enum？
```

这里先用：

```prisma
status String
```

原因：

```text
项目当前 Plan.status / difficulty 也还在用 String
先减少 Prisma enum 的新概念
这张任务重点是数据库队列建模，不是 enum
```

但你要知道，真实项目后面可以改成 enum：

```prisma
enum JobStatus {
  pending
  processing
  completed
  failed
}
```

---

## 任务 4：运行 Prisma migration

运行：

```bash
npm run prisma:migrate -w @learn/api -- --name add_job_queue_tables
npm run prisma:generate -w @learn/api
```

注意：

```text
这会连接你的本地 MySQL。
如果 MySQL 没启动，migration 会失败。
如果失败，把报错贴给我，不要把 .env 密码贴出来。
```

---

## 任务 5：补一份建模复盘

新建：

```text
docs/reviews/database-job-model.md
```

回答：

```text
1. 为什么 Job 需要 status？
2. 为什么 Job 需要 attempts / maxAttempts？
3. 为什么 payload 适合用 Json？
4. 为什么 JobLog 单独建表？
5. @@index([status, createdAt]) 是为了优化什么查询？
```

你不会写完整也没关系，先写你的理解。

---

## 验证命令

```bash
npm run prisma:migrate -w @learn/api -- --name add_job_queue_tables
npm run prisma:generate -w @learn/api
npm run typecheck -w @learn/api
npm run format:check
```

---

## 完成标准

- [x] 新增 Prisma `Job` model
- [x] 新增 Prisma `JobLog` model
- [x] `Job.payload` 使用 `Json`
- [x] `Job.logs` 和 `JobLog.job` 建立关系
- [x] `JobLog` 删除跟随 `Job` 级联删除
- [x] 给 `Job.status + createdAt` 加索引
- [x] 给 `Job.type` 加索引
- [x] 给 `JobLog.jobId` 加索引
- [x] 跑通 Prisma migration
- [x] 跑通 Prisma generate
- [x] 新增 `docs/reviews/database-job-model.md`
- [x] `npm run typecheck -w @learn/api` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
数据库 Job 模型完成了
```
