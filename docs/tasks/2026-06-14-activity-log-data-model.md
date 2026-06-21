# Task: Activity Log 综合业务模块：数据模型设计

## 背景

后台任务阶段已经结束。

下一阶段我帮你选：

```text
C：做综合业务模块 Activity Log
```

原因是：

```text
你现在已经学了很多后端能力：
- Prisma
- Repository / Service
- 权限边界
- Zod
- API 测试
- OpenAPI
- Redis 缓存
- 后台任务

现在需要一个真实业务模块，把这些能力重新组合起来。
```

Activity Log 是一个很适合练习的模块。

它可以记录：

```text
谁在什么时候对哪个项目做了什么事
```

例如：

```text
用户创建了 Project
用户更新了 Project 名称
用户删除了 Todo
用户完成了 Todo
```

这张任务只做第一步：

```text
设计 ActivityLog 数据模型。
```

---

## 任务 1：在 shared package 增加类型

修改：

```text
packages/shared/src/index.ts
```

增加：

```ts
export type ActivityLogAction =
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "todo.created"
  | "todo.updated"
  | "todo.completed"
  | "todo.deleted";

export type ActivityLog = {
  id: string;
  action: ActivityLogAction;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  userId: string;
  projectId: string;
};
```

学习点：

```text
action 用联合类型，而不是普通 string。

这样可以防止到处乱写：
- "project.create"
- "project_created"
- "createProject"

统一 action 名称后，后面做筛选、OpenAPI 文档、前端展示都会更稳定。
```

---

## 任务 2：在 Prisma schema 增加 ActivityLog model

修改：

```text
prisma/schema.prisma
```

增加：

```prisma
model ActivityLog {
  id        String   @id
  action    String
  message   String
  metadata  Json?
  createdAt DateTime @default(now())

  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([projectId, createdAt])
  @@index([action])
}
```

然后给 `User` 增加反向关系：

```prisma
activityLogs ActivityLog[]
```

给 `Project` 增加反向关系：

```prisma
activityLogs ActivityLog[]
```

为什么 ActivityLog 同时关联 User 和 Project？

```text
userId:
  记录是谁触发了这个动作

projectId:
  记录这个动作发生在哪个项目里
```

为什么 `metadata` 用 Json？

```text
不同 action 的附加信息不一样。

例如：
- project.updated 可能记录 oldName / newName
- todo.completed 可能记录 todoId / title

用 Json 可以保留弹性。
```

---

## 任务 3：生成迁移

运行：

```bash
npm run prisma:migrate -w @learn/api -- --name add_activity_logs
```

如果 Prisma 提示需要确认，按提示确认即可。

迁移完成后检查：

```text
prisma/migrations/*_add_activity_logs/migration.sql
```

你应该能看到新建 `ActivityLog` 表，以及相关索引和外键。

---

## 任务 4：生成 Prisma Client

运行：

```bash
npm run prisma:generate -w @learn/api
```

为什么要 generate？

```text
schema.prisma 改了之后，Prisma Client 的 TypeScript 类型也要更新。

否则代码里访问 prisma.activityLog 时，TypeScript 可能还不知道这个模型存在。
```

---

## 任务 5：先不要写 API

这张任务只做数据模型。

暂时不要新增：

```text
activity-logs.routes.ts
activity-logs.repository.ts
activity-logs.service.ts
```

原因是：

```text
先把数据库关系设计稳定，再写 Repository。
```

---

## 验证命令

```bash
npm run prisma:generate -w @learn/api
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] `packages/shared/src/index.ts` 增加 `ActivityLogAction`
- [x] `packages/shared/src/index.ts` 增加 `ActivityLog`
- [x] `prisma/schema.prisma` 增加 `ActivityLog` model
- [x] `User` 增加 `activityLogs ActivityLog[]`
- [x] `Project` 增加 `activityLogs ActivityLog[]`
- [x] 生成 `add_activity_logs` migration
- [x] 运行 `npm run prisma:generate -w @learn/api`
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Activity Log 数据模型完成了
```
