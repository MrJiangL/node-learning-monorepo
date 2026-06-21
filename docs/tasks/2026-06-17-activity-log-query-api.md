# Task: Activity Log 综合业务模块：查询 API

## 背景

现在 Activity Log 已经能被写入：

```text
Project:
  project.created
  project.updated

Todo:
  todo.created
  todo.updated
  todo.completed
  todo.deleted
```

下一步是把它查出来。

这张任务要新增一个接口：

```text
GET /projects/:projectId/activity-logs
```

它的含义是：

```text
查看当前登录用户某个 Project 下的活动记录。
```

注意：

```text
这个接口不是 GET /activity-logs。
```

原因是 ActivityLog 当前依赖 projectId，业务上也是“某个项目的动态流”。

---

## 任务 1：新增 Activity Logs route

新增文件：

```text
apps/api/src/modules/activity-logs/activity-logs.routes.ts
```

建议结构：

```ts
import { Router } from "express";
import { paginationQuerySchema } from "../../http/pagination-query-schema.js";
import { asyncHandler } from "../../http/async-handler.js";
import { mapZodErrorToAppError } from "../../http/validation-error.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { createPrismaActivityLogRepository } from "./activity-logs.prisma-repository.js";
import { createActivityLogService } from "./activity-logs.service.js";

export function createActivityLogsRouter() {
  const router = Router();
  const activityLogService = createActivityLogService(createPrismaActivityLogRepository());

  router.get(
    "/projects/:projectId/activity-logs",
    requireAuth,
    asyncHandler(async (request, response) => {
      try {
        const query = paginationQuerySchema.parse(request.query);
        const result = await activityLogService.listProjectLogs({
          userId: request.user!.id,
          projectId: request.params.projectId as string,
          page: query.page,
          pageSize: query.pageSize
        });

        response.json({
          success: true,
          data: result.data,
          meta: result.meta
        });
      } catch (error) {
        mapZodErrorToAppError(error, "query");
      }
    })
  );

  return router;
}
```

学习点：

```text
query 用 paginationQuerySchema 复用已有分页规则。

但是 ActivityLogRepository 当前只支持 createdAt desc，
所以 sortBy / sortOrder 先解析出来也不传下去。
后面如果要支持排序，再扩展 repository filter。
```

---

## 任务 2：注册到 app.ts

修改：

```text
apps/api/src/app.ts
```

新增 import：

```ts
import { createActivityLogsRouter } from "./modules/activity-logs/activity-logs.routes.js";
```

注册路由：

```ts
app.use(createActivityLogsRouter());
```

建议放在：

```text
app.use(createTodosRouter());
```

附近。

因为它的完整路径已经包含：

```text
/projects/:projectId/activity-logs
```

所以不要写成：

```ts
app.use("/projects", createActivityLogsRouter());
```

否则路径会变成：

```text
/projects/projects/:projectId/activity-logs
```

---

## 任务 3：补集成测试文件

新增：

```text
apps/api/tests/integration/activity-logs.test.ts
```

测试要走真实 HTTP：

```text
register/login
POST /projects
POST /projects/:projectId/todos
PATCH /todos/:id
DELETE /todos/:id
GET /projects/:projectId/activity-logs
```

---

## 任务 4：测试未登录不能访问

建议测试：

```ts
it("未登录不能查看 Project 活动记录", async () => {
  const app = createApp();

  const response = await request(app).get("/projects/project-1/activity-logs");

  expect(response.status).toBe(401);
  expect(response.body.error.code).toBe("AUTH_REQUIRED");
});
```

---

## 任务 5：测试可以查到当前 Project 的日志

建议测试：

```ts
it("当前用户可以查看自己 Project 下的活动记录", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "activity-log-owner@example.com");

  const project = await createProject(app, auth.token, "Activity Log Project");
  const todo = await createTodo(app, auth.token, project.id, "Logged todo");

  await request(app)
    .patch(`/todos/${todo.id}`)
    .set(authHeader(auth.token))
    .send({ completed: true });

  const response = await request(app)
    .get(`/projects/${project.id}/activity-logs`)
    .set(authHeader(auth.token));

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data.map((log: { action: string }) => log.action)).toEqual([
    "todo.completed",
    "todo.created",
    "project.created"
  ]);
  expect(response.body.meta.total).toBe(3);
});
```

为什么顺序是 completed、created、project.created？

```text
ActivityLogRepository.findAll 当前按 createdAt desc 排序。

最新发生的日志排在前面。
```

如果你的测试因为时间太接近导致顺序不稳定，可以先只断言包含：

```ts
expect(actions).toContain("project.created");
expect(actions).toContain("todo.created");
expect(actions).toContain("todo.completed");
```

---

## 任务 6：测试不能看别人的 Project 日志

建议测试：

```ts
it("不能查看别人的 Project 活动记录", async () => {
  const app = createApp();
  const owner = await registerAndLogin(app, "activity-log-owner-a@example.com");
  const anotherUser = await registerAndLogin(app, "activity-log-owner-b@example.com");

  const project = await createProject(app, anotherUser.token, "Private Project");
  await createTodo(app, anotherUser.token, project.id, "Private Todo");

  const response = await request(app)
    .get(`/projects/${project.id}/activity-logs`)
    .set(authHeader(owner.token));

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data).toEqual([]);
  expect(response.body.meta.total).toBe(0);
});
```

为什么这里是 200 空数组，不是 404？

```text
当前 ActivityLogRepository.findAll 的设计是：
projectId + project.userId 不匹配时，查不到任何日志。

它不会额外判断 Project 是否存在，也不会抛 404。

这张任务先接受这个行为。
后面复盘时可以讨论：查询日志时应该返回 404 还是 200 空数组。
```

---

## 任务 7：测试分页

建议：

```ts
it("活动记录支持分页 meta", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "activity-log-page@example.com");
  const project = await createProject(app, auth.token, "Paged Activity Project");

  await createTodo(app, auth.token, project.id, "Todo 1");
  await createTodo(app, auth.token, project.id, "Todo 2");
  await createTodo(app, auth.token, project.id, "Todo 3");

  const response = await request(app)
    .get(`/projects/${project.id}/activity-logs?page=1&pageSize=2`)
    .set(authHeader(auth.token));

  expect(response.status).toBe(200);
  expect(response.body.data).toHaveLength(2);
  expect(response.body.meta).toEqual({
    page: 1,
    pageSize: 2,
    total: 4,
    totalPages: 2
  });
});
```

为什么 total 是 4？

```text
createProject 会写一条 project.created。
三个 createTodo 各写一条 todo.created。

所以总数是 1 + 3 = 4。
```

---

## 任务 8：更新 cleanupDatabase

如果你还没更新：

```text
apps/api/tests/helpers/api-test-helpers.ts
```

确认 `cleanupDatabase` 里最前面有：

```ts
await prisma.activityLog.deleteMany();
```

原因：

```text
ActivityLog 同时依赖 Project 和 User。
集成测试清理数据时，应该先清 ActivityLog，再清 Todo / Project / User。
```

---

## 先不要做

这张任务先不要：

```text
不要改 OpenAPI
不要做 action 过滤
不要做日期过滤
不要做前端页面
```

先把查询 API 链路打通。

---

## 验证命令

先跑新测试：

```bash
npm run test -w @learn/api -- activity-logs.test.ts
```

再跑相关测试：

```bash
npm run test -w @learn/api -- activity-logs
npm run test -w @learn/api -- todos.service.test.ts
```

最后跑整体检查：

```bash
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] 新增 `activity-logs.routes.ts`
- [x] `GET /projects/:projectId/activity-logs` 需要登录
- [x] route 使用 `activityLogService.listProjectLogs`
- [x] route 返回 `{ success, data, meta }`
- [x] `app.ts` 注册 Activity Logs router
- [x] 新增 `activity-logs.test.ts`
- [x] 测试未登录不能查看活动记录
- [x] 测试当前用户可以查看自己 Project 下的活动记录
- [x] 测试不能查看别人的 Project 活动记录
- [x] 测试分页 meta
- [x] `cleanupDatabase` 先清理 `activityLog`
- [x] 测试描述使用中文
- [x] `npm run test -w @learn/api -- activity-logs.test.ts` 通过
- [x] `npm run test -w @learn/api -- activity-logs` 通过
- [x] `npm run test -w @learn/api -- todos.service.test.ts` 通过
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Activity Log 查询 API 完成了
```
