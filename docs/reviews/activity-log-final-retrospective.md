# Activity Log 综合模块阶段复盘

## 1. Activity Log 和普通业务表的区别

Project / Todo 是当前业务状态。

ActivityLog 是过去发生过什么，应该保留用户的操作日志。它更像“历史事实记录”，不是当前业务状态本身。

比如：

- Project 现在叫什么名字，是 Project 表的当前状态。
- 用户什么时候创建、更新、删除过 Project，是 ActivityLog 记录的历史事实。

## 2. 为什么需要 Project 快照字段

不能只存 `projectId`。

因为 `projectId` 表示当前还能关联到的 Project。Project 删除后，`ActivityLog.projectId` 会变成 `null`。

所以需要额外保存快照字段：

- `projectId`：当前关系，可以因为 Project 删除而变成 `null`
- `projectSnapshotId`：历史事实，不能丢
- `projectSnapshotName`：历史展示信息，不能只依赖还活着的 Project

这样即使 Project 被删除，ActivityLog 仍然可以展示：

```text
删除了项目 xxx
```

## 3. 为什么 ActivityLogService 不自己查 Project

谁手里已经有 Project，谁就负责传 `projectSnapshotId` / `projectSnapshotName`。

ActivityLogService 只负责记录日志，不负责猜业务上下文。

比如：

- `ProjectService.createProject` 创建完 Project 后，手里已经有 `project`
- `ProjectService.updateProject` 更新完 Project 后，手里已经有 `updatedProject`
- `ProjectService.deleteProject` 删除前已经查过 `project`
- `TodoService` 在校验权限时已经通过 `requireOwnedProject` 拿到了 Project

所以这些业务 service 更清楚 Project 从哪里来，也更适合传快照字段。

## 4. metadata schema 解决了什么问题

`metadata: Record<string, unknown>` 太宽了。

它表示 metadata 里可以放任何字段，但 TypeScript 和运行时都不知道每种 action 到底需要什么字段。

如果没有 schema，可能出现这种问题：

```text
action 是 todo.completed
metadata 却忘了 title
```

这样前端展示日志时就可能拿不到需要的数据。

所以 action 和 metadata 应该一起设计：

- `todo.created` 需要 `todoId` / `title`
- `todo.completed` 需要 `todoId` / `title` / `changedFields`
- `project.deleted` 需要 `projectName`

TypeScript 主要在开发时帮忙，Zod 是运行时校验。后端内部生成 ActivityLog 时，也可能写错 metadata，所以 ActivityLogService 里需要用 Zod 再校验一次。

## 5. 查询链路

Activity Log 查询链路是：

```text
query string
  -> Zod schema
  -> route
  -> service input
  -> repository filter
  -> Prisma where
```

例子一：按 action 过滤

```http
GET /projects/:projectId/activity-logs?action=todo.completed
```

这条链路最后会进入 Prisma where：

```ts
{
  userId,
  projectSnapshotId,
  action: "todo.completed"
}
```

例子二：按时间范围过滤

```http
GET /projects/:projectId/activity-logs?createdAfter=2026-06-01T00:00:00.000Z
```

这条链路最后会进入 Prisma where：

```ts
{
  createdAt: {
    gte: new Date("2026-06-01T00:00:00.000Z");
  }
}
```

其中：

- `gte` 是大于等于
- `lte` 是小于等于

## 6. 我现在对测试的理解

我现在还不会完全自己写测试，但能看懂一些测试在保护什么问题。

Service 单元测试：

```text
主要测参数有没有正确传给协作者。
```

比如 route 已经传了 `createdAfter`，但 service 如果忘了继续传给 repository，service 测试可以发现。

Repository 测试：

```text
主要测数据库查询条件是否真的生效。
```

比如 action 过滤、createdAt 时间范围过滤，更适合在 repository 测试里准备固定数据验证。

API 集成测试：

```text
主要测 HTTP -> middleware -> route -> service -> database 的完整链路。
```

比如非法 query 参数会不会返回 `400 / VALIDATION_ERROR`，Project 删除后日志还能不能通过快照查回来。

## 7. 这阶段最容易混乱的点

1. `projectId` 和 `projectSnapshotId` 的区别。
2. TypeScript 类型和 Zod 运行时校验的区别。
3. route schema / service input / repository filter 的边界。
4. API 集成测试和 repository 测试分别该测什么。
5. Prisma Date 查询里的 `gte` / `lte`。
6. 为什么有些测试适合在 service 层写，有些测试适合在 repository 层写。

## 8. 下一阶段选择

我选择：

```text
B. 强化测试：系统学 service / repository / integration 测试
```

原因：

我现在后端主功能已经能跟着任务卡写出来，但测试经常不知道怎么写。

最近很多任务都是：

```text
业务实现完成了
但是测试不会写
```

所以下一阶段不急着继续加新业务，而是把测试补成一个小阶段。这样以后写后端功能时，我会更清楚：

- 这个逻辑应该写 service 单元测试还是 repository 测试
- 什么时候需要 API 集成测试
- 怎么用 fake repository
- 怎么准备数据库测试数据
- 怎么判断测试是否真的保护了业务规则
