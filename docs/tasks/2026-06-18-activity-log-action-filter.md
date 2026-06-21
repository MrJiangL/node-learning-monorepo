# Task: Activity Log 查询支持 action 过滤

## 背景

现在 Activity Log 已经能记录很多事件：

```text
project.created
project.updated
project.deleted
todo.created
todo.updated
todo.completed
todo.deleted
```

但查询接口目前只能按 Project 查全部日志：

```http
GET /projects/:projectId/activity-logs
```

如果前端以后想做这些筛选：

```text
只看 Todo 相关动作
只看 project.deleted
只看完成 Todo 的记录
```

后端就需要支持按 `action` 过滤。

这张任务先做最小版本：

```http
GET /projects/:projectId/activity-logs?action=todo.completed
```

---

## 学习目标

完成后你应该能说清楚：

```text
1. query string 也是外部输入，也要用 Zod 校验
2. route schema 和 service input / repository filter 怎么一层层传递
3. 可选过滤条件应该怎么写 Prisma where
4. 为什么 action 要复用 ActivityLogAction，而不是普通 string
```

---

## 任务 1：创建 Activity Log query schema

现在 route 里直接使用了：

```ts
paginationQuerySchema.parse(request.query);
```

这只能解析分页。

创建或修改：

```text
apps/api/src/modules/activity-logs/activity-logs.schema.ts
```

定义：

```ts
import { z } from "zod";
import { paginationQuerySchema } from "../../http/pagination-query-schema.js";

export const activityLogActionSchema = z.enum([
  "project.created",
  "project.updated",
  "project.deleted",
  "todo.created",
  "todo.updated",
  "todo.completed",
  "todo.deleted"
]);

export const listActivityLogsQuerySchema = paginationQuerySchema.extend({
  // action 是可选过滤条件。
  //
  // 不传 action 时，表示查询这个 Project 下的全部日志。
  // 传了 action 时，只返回对应类型的日志。
  action: activityLogActionSchema.optional()
});
```

注意：

```text
这里先手写 z.enum。
因为 TypeScript 类型在运行时不存在，Zod 需要真实数组来做运行时校验。
```

---

## 任务 2：扩展 service input

修改：

```text
apps/api/src/modules/activity-logs/activity-logs.service.ts
```

给 `ListProjectActivityLogsInput` 增加：

```ts
action?: ActivityLogAction;
```

然后传给 repository filter：

```ts
const filter: ListActivityLogsFilter = {
  userId: input.userId,
  projectId: input.projectId,
  action: input.action,
  page: input.page,
  pageSize: input.pageSize
};
```

---

## 任务 3：扩展 repository filter

修改：

```text
apps/api/src/modules/activity-logs/activity-logs.repository.ts
```

给 `ListActivityLogsFilter` 增加：

```ts
action?: ActivityLogAction;
```

记得已经有：

```ts
import type { ActivityLog, ActivityLogAction, PaginatedResult } from "@learn/shared";
```

所以不用再单独新增类型来源。

---

## 任务 4：更新 Prisma repository 查询

修改：

```text
apps/api/src/modules/activity-logs/activity-logs.prisma-repository.ts
```

把 where 从：

```ts
const where = {
  userId: filter.userId,
  projectSnapshotId: filter.projectId
};
```

改成：

```ts
const where = {
  userId: filter.userId,
  projectSnapshotId: filter.projectId,
  action: filter.action
};
```

学习点：

```text
Prisma 的 where 里字段值是 undefined 时，通常表示“不加这个过滤条件”。

所以 action 不传时：
  查询全部 action

action 传了时：
  只查指定 action
```

---

## 任务 5：更新 route

修改：

```text
apps/api/src/modules/activity-logs/activity-logs.routes.ts
```

用新 schema：

```ts
const query = listActivityLogsQuerySchema.parse(request.query);
```

然后调用 service 时传：

```ts
action: query.action,
```

旧注释里如果还写着“只复用 page/pageSize”，也要改掉。

---

## 任务 6：补测试

### Service 单元测试

修改：

```text
apps/api/tests/unit/activity-logs.service.test.ts
```

新增或调整测试，确认 service 会把 `action` 传给 repository：

```ts
it("查询 Project 活动记录时会把 action 过滤条件交给 repository.findAll", async () => {
  // 你来实现
});
```

### Prisma repository 测试

修改：

```text
apps/api/tests/unit/activity-logs.prisma-repository.test.ts
```

新增测试：

```ts
it("列表可以按 action 过滤 Activity Logs", async () => {
  // 你来实现
});
```

### API 集成测试

修改：

```text
apps/api/tests/integration/activity-logs.test.ts
```

新增测试：

```ts
it("可以按 action 查询 Project 活动记录", async () => {
  // 你来实现
});
```

推荐流程：

```text
1. 创建 Project
2. 创建 Todo
3. PATCH Todo completed
4. GET /projects/:projectId/activity-logs?action=todo.completed
5. 断言只返回 todo.completed
```

再补一个非法 action：

```ts
it("action 参数非法时返回校验错误", async () => {
  // 你来实现
});
```

断言重点：

```text
GET /projects/:projectId/activity-logs?action=bad.action
应该返回 400
错误码应该是 VALIDATION_ERROR
```

---

## 验证命令

先跑 Activity Log 相关测试：

```bash
npm run test -w @learn/api -- activity-logs
```

再跑：

```bash
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] 新增 `listActivityLogsQuerySchema`
- [x] `action` 使用 Zod enum 校验
- [x] route 使用新的 Activity Log query schema
- [x] service input 支持 `action`
- [x] repository filter 支持 `action`
- [x] Prisma repository 按 action 过滤
- [x] service 单元测试覆盖 action 参数传递
- [x] Prisma repository 测试覆盖 action 过滤
- [x] API 集成测试覆盖 action 过滤
- [x] API 集成测试覆盖非法 action
- [x] `npm run test -w @learn/api -- activity-logs` 通过
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Activity Log action 过滤完成了
```
