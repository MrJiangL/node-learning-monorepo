# Task: 用户级 Activity Log 查询 API

## 背景

Project / Todo 的主要业务功能已经越来越完整：

- Project 创建 / 编辑 / 删除
- Todo 创建 / 编辑 / 删除
- Todo 完成状态切换
- Todo dueDate 展示 / 编辑 / 清空
- Project 维度 Activity Log 展示

现在 Activity Log 有一个明显限制：

```text
必须选中某个 Project，才能看这个 Project 下的日志。
```

当前前端使用的是：

```text
GET /projects/:projectId/activity-logs
```

这个接口适合 Project 详情页。

但它不适合用户想看“最近所有操作”的场景。

例如：

- 我刚刚删除了哪个 Project？
- 我今天更新过哪些 Todo？
- 我最近跨多个 Project 做了什么？
- Project 已经删除后，我还能不能看到删除记录？

这些更适合用户级 Activity Log：

```text
GET /activity-logs
```

先做后端 API，再做前端入口。

---

## 这张任务只练什么

只做用户级 Activity Log 查询 API。

目标接口：

```text
GET /activity-logs
```

它表示：

```text
查询当前登录用户自己的所有 Activity Log。
```

先不要做：

- 前端用户级 Activity Log 页面
- metadata 精细展示
- 导出日志
- 管理员查看所有用户日志
- 删除日志

这张任务只把 API 边界补好。

---

## 任务 1：理解现有 Project 级 Activity Log 查询

先看：

```text
apps/api/src/modules/activity-logs/activity-logs.routes.ts
apps/api/src/modules/activity-logs/activity-logs.service.ts
apps/api/src/modules/activity-logs/activity-logs.repository.ts
apps/api/src/modules/activity-logs/activity-logs.prisma-repository.ts
apps/api/src/modules/activity-logs/activity-logs.schema.ts
```

重点理解当前路径：

```text
GET /projects/:projectId/activity-logs
  -> requireAuth
  -> listActivityLogsQuerySchema
  -> activityLogService.listProjectLogs
  -> repository.findAll
```

现在 `ListActivityLogsFilter` 里 `projectId` 是必填。

用户级查询需要把它变成可选，或者新增一个单独 filter 类型。

建议第一版保持简单：

```ts
projectId?: string;
```

然后 repository 根据是否传 projectId 决定是否加 project 条件。

---

## 任务 2：扩展 Service

修改：

```text
apps/api/src/modules/activity-logs/activity-logs.service.ts
```

新增：

```ts
export type ListUserActivityLogsInput = {
  userId: string;
  page: number;
  pageSize: number;
  action?: ActivityLogAction;
  createdAfter?: string;
  createdBefore?: string;
};
```

在 `ActivityLogService` 增加：

```ts
listUserLogs(input: ListUserActivityLogsInput): Promise<PaginatedResult<ActivityLog>>;
```

实现时传给 repository：

```ts
{
  userId: input.userId,
  action: input.action,
  createdAfter: input.createdAfter,
  createdBefore: input.createdBefore,
  page: input.page,
  pageSize: input.pageSize
}
```

学习点：

```text
Project 级查询和用户级查询最大的区别，不是权限都不要了。
用户级查询仍然必须使用 currentUser.id 做权限边界。
```

---

## 任务 3：扩展 Repository filter

修改：

```text
apps/api/src/modules/activity-logs/activity-logs.repository.ts
apps/api/src/modules/activity-logs/activity-logs.prisma-repository.ts
```

把：

```ts
projectId: string;
```

改成：

```ts
projectId?: string;
```

Prisma where 条件里只在有 projectId 时加 Project 条件。

用户级查询应该仍然包含：

```ts
userId: filter.userId;
```

也就是说：

```text
GET /activity-logs 只能查当前用户自己的日志。
```

不要因为是用户级查询，就漏掉 userId。

---

## 任务 4：新增 Route

修改：

```text
apps/api/src/modules/activity-logs/activity-logs.routes.ts
```

新增：

```text
GET /activity-logs
```

要求：

- 使用 `requireAuth`
- 使用同一个 `listActivityLogsQuerySchema`
- 从 `request.user!.id` 取 userId
- 返回同样 envelope：

```ts
{
  success: true,
  data: result.data,
  meta: result.meta
}
```

不要从 query 或 body 接收 userId。

权限边界必须来自登录态。

---

## 任务 5：补测试

至少补：

```text
apps/api/src/modules/activity-logs/activity-logs.service.test.ts
apps/api/src/modules/activity-logs/activity-logs.routes.test.ts
```

如果现有测试文件名字不同，就沿用当前项目结构。

建议覆盖：

1. service `listUserLogs` 会调用 repository.findAll，且只带 userId，不带 projectId
2. route `GET /activity-logs` 未登录返回 401
3. route `GET /activity-logs` 登录后返回当前用户日志
4. route 支持 `action` 过滤
5. route 支持分页参数
6. route 不允许客户端指定其他 userId

如果已有 repository 测试，也可以补一条：

```text
不传 projectId 时，findAll 返回该 userId 下跨 Project 的日志。
```

---

## 任务 6：更新 API 示例或文档

如果项目里已有 API 示例文档，补一个例子：

```http
GET /activity-logs?page=1&pageSize=10
Authorization: Bearer <token>
```

以及：

```http
GET /activity-logs?action=todo.updated
Authorization: Bearer <token>
```

这一步不用写很长。

只要让后面接前端时知道接口怎么调用。

---

## 验证命令

```bash
npm run test -w @learn/api
npm run typecheck -w @learn/api
npm run format:check
npm run build -w @learn/api
```

如果 API workspace 没有单独 build，就按项目现有脚本调整。

---

## 完成标准

- [x] `GET /activity-logs` 支持查询当前用户所有 Activity Log
- [x] 用户级查询仍然使用 currentUser.id 做权限边界
- [x] 支持 page / pageSize
- [x] 支持 action 过滤
- [x] 支持 createdAfter / createdBefore
- [x] Project 级查询 `/projects/:projectId/activity-logs` 不回归
- [x] 补 service 测试
- [x] 补 route/API 测试
- [x] 更新 API 示例或文档
- [x] npm run test -w @learn/api 通过
- [x] npm run typecheck -w @learn/api 通过
- [x] npm run format:check 通过
- [x] npm run build -w @learn/api 通过

## 完成记录

- 完成时间：2026-06-29
- 更新 API：
  - apps/api/src/modules/activity-logs/activity-logs.routes.ts
  - apps/api/src/modules/activity-logs/activity-logs.service.ts
  - apps/api/src/modules/activity-logs/activity-logs.repository.ts
  - apps/api/src/modules/activity-logs/activity-logs.prisma-repository.ts
- 更新测试：
  - apps/api/tests/unit/activity-logs.service.test.ts
  - apps/api/tests/unit/activity-logs.prisma-repository.test.ts
  - apps/api/tests/integration/activity-logs.test.ts
  - apps/api/tests/unit/projects.service.test.ts
  - apps/api/tests/unit/todos.service.test.ts
- 更新文档：
  - docs/api-examples.md
- 核心行为：
  - 新增 `GET /activity-logs`。
  - 用户级查询只使用 `request.user!.id` 作为权限边界。
  - 即使客户端传 `?userId=...`，也不会影响查询范围。
  - `ListActivityLogsFilter.projectId` 改为可选。
  - 不传 projectId 时，repository 查询当前用户跨 Project 的 Activity Log。
  - 传 projectId 时，原有 Project 级查询继续按 `projectSnapshotId` 查询，不回归。
  - 用户级查询支持 page / pageSize / action / createdAfter / createdBefore。
- 验证结果：
  - npm run test -w @learn/api 通过，38 个测试文件、277 个测试
  - npm run typecheck -w @learn/api 通过
  - npm run format:check 通过
  - npm run build -w @learn/api 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-29-web-user-activity-log-entry.md
```
