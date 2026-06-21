# Task: Activity Log 审计日志设计优化：Project 删除日志快照

## 背景

上一阶段你已经发现一个很关键的问题：

```text
project.deleted 不能像 todo.deleted 一样直接写 ActivityLog。
```

原因是当前模型里：

```prisma
projectId String
project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
```

这代表：

```text
ActivityLog 强依赖 Project。

Project 被删除时：
  ActivityLog 也会被级联删除
```

如果我们想让 Activity Log 更像真正的“审计日志”，它就不能完全依赖还活着的业务数据。

这张任务先做第一步：

```text
给 ActivityLog 增加 Project 快照字段，为长期保留 project.deleted 做准备。
```

---

## 这张任务只做什么

这张任务只做数据模型和 Repository 层调整。

暂时不要真正接入 `project.deleted`。

原因是：

```text
先让旧日志和新日志的数据形状稳定。
下一张任务再改 ProjectService.deleteProject。
```

---

## 目标设计

ActivityLog 同时保存两类信息：

```text
1. 当前仍然可关联的 Project 外键
2. 删除后仍然能保留的 Project 快照
```

建议字段：

```prisma
projectId String?
project   Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)

projectSnapshotId   String
projectSnapshotName String?
```

它们的含义：

```text
projectId:
  当前 Project 还存在时，用来关联 Project
  Project 删除后会变成 null

projectSnapshotId:
  永远保存当时的 Project id
  即使 Project 被删除，也不会丢

projectSnapshotName:
  永远保存当时的 Project 名称
  Project 删除后仍然可以展示“删除了哪个项目”
```

---

## 任务 1：更新 shared 类型

修改：

```text
packages/shared/src/index.ts
```

把 `ActivityLog` 从：

```ts
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

调整为：

```ts
export type ActivityLog = {
  id: string;
  action: ActivityLogAction;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  userId: string;

  // projectId 表示当前还能关联到的 Project。
  //
  // Project 删除后，这个字段会变成 null。
  // 所以前端不能只依赖 projectId 来展示历史日志。
  projectId: string | null;

  // projectSnapshotId 是“动作发生当时”的 Project id 快照。
  //
  // 即使 Project 被删除，这个字段也要保留。
  projectSnapshotId: string;

  // projectSnapshotName 是“动作发生当时”的 Project 名称快照。
  //
  // 这样 Project 删除后，日志仍然能展示：
  // “删除了项目 xxx”
  projectSnapshotName: string | null;
};
```

---

## 任务 2：更新 Prisma schema

修改：

```text
prisma/schema.prisma
```

把 `ActivityLog` 的 Project 关系从强依赖改成可空关系：

```prisma
projectId String?
project   Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)

projectSnapshotId   String
projectSnapshotName String?
```

并增加索引：

```prisma
@@index([projectSnapshotId, createdAt])
```

保留：

```prisma
@@index([projectId, createdAt])
@@index([userId, createdAt])
@@index([action])
```

学习点：

```text
projectId 是“当前关系”。
projectSnapshotId 是“历史事实”。

审计日志更关心历史事实，所以需要 snapshot 字段。
```

---

## 任务 3：生成 migration

运行：

```bash
npm run prisma:migrate -w @learn/api -- --name add_activity_log_project_snapshot
```

然后运行：

```bash
npm run prisma:generate -w @learn/api
```

注意：

```text
如果数据库里已有 ActivityLog 数据，新增 projectSnapshotId 这种必填字段时，
Prisma 可能要求提供默认值或先做数据迁移。

学习项目里如果迁移失败，把错误贴给我。
不要硬改 migration。
```

---

## 任务 4：更新 Repository 输入类型

修改：

```text
apps/api/src/modules/activity-logs/activity-logs.repository.ts
```

给 `CreateActivityLogInput` 增加：

```ts
projectSnapshotId: string;
projectSnapshotName?: string | null;
```

并保留：

```ts
projectId: string;
```

为什么 create 输入里 `projectId` 还是 string？

```text
当前所有日志仍然发生在一个存在的 Project 下。
所以创建日志时一定知道 projectId。

只是保存到 ActivityLog 后，Project 未来可能被删除，
数据库里的 projectId 才会变成 null。
```

---

## 任务 5：更新 Prisma Repository

修改：

```text
apps/api/src/modules/activity-logs/activity-logs.prisma-repository.ts
```

创建日志时同时写：

```ts
projectId: input.projectId,
projectSnapshotId: input.projectSnapshotId,
projectSnapshotName: input.projectSnapshotName ?? null
```

查询日志时，把权限边界从：

```ts
project: {
  userId: filter.userId;
}
```

暂时调整为：

```ts
userId: filter.userId,
projectSnapshotId: filter.projectId
```

为什么？

```text
Project 删除后，project 关系可能已经是 null。

如果还用 project: { userId } 查询，
删除后的日志会查不到。

当前学习项目里 Project/Todo 只有 owner 自己操作，
所以先用 ActivityLog.userId + projectSnapshotId 作为查询边界。
```

---

## 任务 6：更新 mapper

修改：

```text
apps/api/src/modules/activity-logs/activity-logs.mapper.ts
```

返回：

```ts
projectId: log.projectId,
projectSnapshotId: log.projectSnapshotId,
projectSnapshotName: log.projectSnapshotName
```

---

## 任务 7：更新 ActivityLogService 调用方

现在 ProjectService / TodoService 调用 `activityLogService.record` 时，需要多传两个字段：

```ts
projectSnapshotId: project.id,
projectSnapshotName: project.name
```

或者 Todo 场景里可以从已校验过的 Project 拿名字。

这张任务里我们选择了更完整的方案：

```ts
const project = await requireOwnedProject(projectId, currentUserId);

projectSnapshotId: project.id,
projectSnapshotName: project.name
```

原因：

```text
TodoService 做权限校验时，本来就会查 Project。
既然已经拿到了 Project，就不要只保存 null。
直接保存 project.name 可以让删除后的历史日志更好展示。
```

---

## 任务 8：更新测试

至少更新这些测试：

```text
activity-logs.prisma-repository.test.ts
activity-logs.service.test.ts
projects.service.test.ts
todos.service.test.ts
activity-logs.test.ts
```

重点断言：

```text
ActivityLog 返回 projectSnapshotId
ActivityLog 返回 projectSnapshotName
查询 API 仍然能返回日志
```

---

## 验证命令

先跑 Activity Log 相关测试：

```bash
npm run test -w @learn/api -- activity-logs
```

再跑 Project / Todo service：

```bash
npm run test -w @learn/api -- projects.service.test.ts
npm run test -w @learn/api -- todos.service.test.ts
```

最后跑：

```bash
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] shared `ActivityLog.projectId` 改为 `string | null`
- [x] shared `ActivityLog` 增加 `projectSnapshotId`
- [x] shared `ActivityLog` 增加 `projectSnapshotName`
- [x] Prisma `ActivityLog.projectId` 改为可空
- [x] Prisma `ActivityLog.project` 改为可空关系
- [x] Prisma Project 关系改为 `onDelete: SetNull`
- [x] Prisma 增加 `projectSnapshotId`
- [x] Prisma 增加 `projectSnapshotName`
- [x] 生成 `add_activity_log_project_snapshot` migration
- [x] 运行 `npm run prisma:generate -w @learn/api`
- [x] Repository create 写入 snapshot 字段
- [x] Repository findAll 使用 `userId + projectSnapshotId` 查询
- [x] mapper 返回 snapshot 字段
- [x] 相关 service 调用补齐 snapshot 输入
- [x] 相关测试更新并通过
- [x] `npm run test -w @learn/api -- activity-logs` 通过
- [x] `npm run test -w @learn/api -- projects.service.test.ts` 通过
- [x] `npm run test -w @learn/api -- todos.service.test.ts` 通过
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Activity Log Project 删除日志快照完成了
```
