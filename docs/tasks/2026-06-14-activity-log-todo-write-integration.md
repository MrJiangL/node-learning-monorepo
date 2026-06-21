# Task: Activity Log 综合业务模块：接入 Todo 写操作

## 背景

上一张任务已经把 Activity Log 接进 Project 写操作：

```text
createProject -> project.created
updateProject -> project.updated
deleteProject -> 暂时不写 project.deleted，因为 ActivityLog.projectId 外键会被 Project 删除影响
```

这一张任务接 Todo 写操作。

Todo 和 Project 有一个关键区别：

```text
ActivityLog 绑定的是 projectId，不是 todoId。
```

所以 Todo 删除时仍然可以写日志：

```text
删除 Todo 后，Project 还存在，ActivityLog.projectId 仍然有效。
```

这和 `project.deleted` 不一样。

---

## 目标

在 Todo 写操作成功后记录 Activity Log：

```text
createTodo:
  todo.created

updateTodo:
  todo.updated
  或者 completed 从 false -> true 时记录 todo.completed

deleteTodo:
  todo.deleted
```

仍然保持这条规则：

```text
只有真实成功的业务动作，才写 Activity Log。
```

权限失败、找不到 Todo、找不到 Project，都不应该写日志。

---

## 任务 1：让 TodoService 可选依赖 ActivityLogService

修改：

```text
apps/api/src/modules/todos/todos.service.ts
```

新增 import：

```ts
import type { ActivityLogService } from "../activity-logs/activity-logs.service.js";
```

把函数签名从：

```ts
export function createTodoService(
  todoRepository: TodoRepository,
  projectRepository: ProjectRepository
) {
```

改成：

```ts
type CreateTodoServiceOptions = {
  activityLogService?: ActivityLogService;
};

export function createTodoService(
  todoRepository: TodoRepository,
  projectRepository: ProjectRepository,
  options: CreateTodoServiceOptions = {}
) {
```

为什么仍然用可选依赖？

```text
为了保持旧测试和旧调用方式不被一次性打爆。

没传 activityLogService：
  TodoService 保持原行为

传了 activityLogService：
  写操作成功后记录日志
```

---

## 任务 2：createTodo 成功后记录 todo.created

当前逻辑大概是：

```ts
await requireOwnedProject(projectId, currentUserId);
return todoRepository.create(input, projectId);
```

改成：

```ts
await requireOwnedProject(projectId, currentUserId);
const todo = await todoRepository.create(input, projectId);

await options.activityLogService?.record({
  action: "todo.created",
  message: `创建了 Todo ${todo.title}`,
  metadata: {
    todoId: todo.id,
    title: todo.title
  },
  userId: currentUserId,
  projectId: todo.projectId
});

return todo;
```

学习点：

```text
日志里的 projectId 使用 todo.projectId。

因为真正写入成功后的 todo 才是事实来源。
不要依赖外层参数推测最终数据。
```

---

## 任务 3：updateTodo 成功后记录 todo.updated / todo.completed

`updateTodo` 现在会先：

```text
requireOwnedTodo
todoRepository.update
```

你需要保留更新前的 todo，用来判断 completed 是否从 false 变成 true：

```ts
const existingTodo = await requireOwnedTodo(id, currentUserId);
const todo = await todoRepository.update(id, input);
```

然后：

```ts
const action =
  input.completed === true && existingTodo.completed === false ? "todo.completed" : "todo.updated";

await options.activityLogService?.record({
  action,
  message: action === "todo.completed" ? `完成了 Todo ${todo.title}` : `更新了 Todo ${todo.title}`,
  metadata: {
    todoId: todo.id,
    title: todo.title,
    changedFields: Object.keys(input)
  },
  userId: currentUserId,
  projectId: todo.projectId
});
```

为什么要判断 `existingTodo.completed === false`？

```text
如果 Todo 本来就是 completed=true，
再次 PATCH { completed: true } 不应该重复记录“完成了 Todo”。
```

---

## 任务 4：deleteTodo 成功后记录 todo.deleted

删除前 `requireOwnedTodo` 会返回已有 Todo。

你要保留它：

```ts
const existingTodo = await requireOwnedTodo(id, currentUserId);
const deletedTodo = await todoRepository.delete(id);
```

删除成功后记录：

```ts
await options.activityLogService?.record({
  action: "todo.deleted",
  message: `删除了 Todo ${existingTodo.title}`,
  metadata: {
    todoId: existingTodo.id,
    title: existingTodo.title
  },
  userId: currentUserId,
  projectId: existingTodo.projectId
});
```

为什么用 `existingTodo`，不是 `deletedTodo`？

```text
两者通常一样。

但 existingTodo 是权限检查阶段已经拿到的“删除前快照”，
用它写删除日志更符合“删除前保留上下文”的思路。
```

---

## 任务 5：在 Todo routes 里接入真实 ActivityLogService

修改：

```text
apps/api/src/modules/todos/todos.routes.ts
```

新增 import：

```ts
import { createPrismaActivityLogRepository } from "../activity-logs/activity-logs.prisma-repository.js";
import { createActivityLogService } from "../activity-logs/activity-logs.service.js";
```

把：

```ts
const todoService = createTodoService(
  createPrismaTodoRepository(),
  createPrismaProjectRepository()
);
```

改成：

```ts
const activityLogService = createActivityLogService(createPrismaActivityLogRepository());
const todoService = createTodoService(
  createPrismaTodoRepository(),
  createPrismaProjectRepository(),
  { activityLogService }
);
```

---

## 任务 6：补 TodoService 单元测试 fake

修改：

```text
apps/api/tests/unit/todos.service.test.ts
```

参考 Project 那张任务里的 fake：

```ts
import type {
  ActivityLogService,
  RecordActivityLogInput
} from "../../src/modules/activity-logs/activity-logs.service.js";
```

新增：

```ts
function createFakeActivityLogService(): ActivityLogService & {
  recorded: RecordActivityLogInput[];
} {
  const recorded: RecordActivityLogInput[] = [];

  return {
    recorded,
    async record(input) {
      recorded.push(input);

      return {
        id: crypto.randomUUID(),
        action: input.action,
        message: input.message,
        metadata: input.metadata ?? null,
        createdAt: new Date().toISOString(),
        userId: input.userId,
        projectId: input.projectId
      };
    },
    async listProjectLogs() {
      return {
        data: [],
        meta: {
          page: 1,
          pageSize: 10,
          total: 0,
          totalPages: 0
        }
      };
    }
  };
}
```

---

## 任务 7：测试 createTodo 会记录日志

新增测试：

```ts
it("创建 Todo 成功后记录 todo.created 活动日志", async () => {
  const project = createTestProject({ id: "project-1", userId: "user-1" });
  const projectRepository = createFakeProjectRepository([project]);
  const todoRepository = createFakeTodoRepository();
  const activityLogService = createFakeActivityLogService();
  const service = createTodoService(todoRepository, projectRepository, { activityLogService });

  const todo = await service.createTodo("project-1", { title: "Logged todo" }, "user-1");

  expect(activityLogService.recorded).toEqual([
    {
      action: "todo.created",
      message: "创建了 Todo Logged todo",
      metadata: {
        todoId: todo.id,
        title: "Logged todo"
      },
      userId: "user-1",
      projectId: "project-1"
    }
  ]);
});
```

---

## 任务 8：测试 updateTodo 会记录 todo.updated

新增测试：

```ts
it("更新 Todo 成功后记录 todo.updated 活动日志", async () => {
  const project = createTestProject({ id: "project-1", userId: "user-1" });
  const todo = createTestTodo({ id: "todo-1", title: "Old title", projectId: "project-1" });
  const projectRepository = createFakeProjectRepository([project]);
  const todoRepository = createFakeTodoRepository([todo]);
  const activityLogService = createFakeActivityLogService();
  const service = createTodoService(todoRepository, projectRepository, { activityLogService });

  await service.updateTodo("todo-1", { title: "New title" }, "user-1");

  expect(activityLogService.recorded).toEqual([
    {
      action: "todo.updated",
      message: "更新了 Todo New title",
      metadata: {
        todoId: "todo-1",
        title: "New title",
        changedFields: ["title"]
      },
      userId: "user-1",
      projectId: "project-1"
    }
  ]);
});
```

---

## 任务 9：测试 completed 从 false 变 true 时记录 todo.completed

新增测试：

```ts
it("完成 Todo 时记录 todo.completed 活动日志", async () => {
  const project = createTestProject({ id: "project-1", userId: "user-1" });
  const todo = createTestTodo({
    id: "todo-1",
    title: "Finish me",
    completed: false,
    projectId: "project-1"
  });
  const projectRepository = createFakeProjectRepository([project]);
  const todoRepository = createFakeTodoRepository([todo]);
  const activityLogService = createFakeActivityLogService();
  const service = createTodoService(todoRepository, projectRepository, { activityLogService });

  await service.updateTodo("todo-1", { completed: true }, "user-1");

  expect(activityLogService.recorded[0]).toMatchObject({
    action: "todo.completed",
    message: "完成了 Todo Finish me",
    userId: "user-1",
    projectId: "project-1"
  });
});
```

---

## 任务 10：测试 deleteTodo 会记录 todo.deleted

新增测试：

```ts
it("删除 Todo 成功后记录 todo.deleted 活动日志", async () => {
  const project = createTestProject({ id: "project-1", userId: "user-1" });
  const todo = createTestTodo({ id: "todo-1", title: "Delete me", projectId: "project-1" });
  const projectRepository = createFakeProjectRepository([project]);
  const todoRepository = createFakeTodoRepository([todo]);
  const activityLogService = createFakeActivityLogService();
  const service = createTodoService(todoRepository, projectRepository, { activityLogService });

  await service.deleteTodo("todo-1", "user-1");

  expect(activityLogService.recorded).toEqual([
    {
      action: "todo.deleted",
      message: "删除了 Todo Delete me",
      metadata: {
        todoId: "todo-1",
        title: "Delete me"
      },
      userId: "user-1",
      projectId: "project-1"
    }
  ]);
});
```

---

## 任务 11：测试权限失败时不写日志

至少补一个：

```ts
it("更新别人 Project 下的 Todo 失败时不记录 Activity Log", async () => {
  const project = createTestProject({ id: "project-1", userId: "user-2" });
  const todo = createTestTodo({ id: "todo-1", projectId: "project-1" });
  const projectRepository = createFakeProjectRepository([project]);
  const todoRepository = createFakeTodoRepository([todo]);
  const activityLogService = createFakeActivityLogService();
  const service = createTodoService(todoRepository, projectRepository, { activityLogService });

  await expect(service.updateTodo("todo-1", { completed: true }, "user-1")).rejects.toMatchObject({
    statusCode: 404,
    code: "PROJECT_NOT_FOUND"
  });

  expect(activityLogService.recorded).toEqual([]);
});
```

---

## 先不要做

这张任务先不要：

```text
不要新增 Activity Log 查询 API
不要改 OpenAPI
不要把日志记录失败设计成后台任务
不要引入 transaction
```

日志失败是否应该影响主业务，是下一阶段可以复盘的问题。

这张先保持：

```text
主业务成功 -> await 记录日志 -> 返回结果
```

---

## 验证命令

先跑 Todo service 测试：

```bash
npm run test -w @learn/api -- todos.service.test.ts
```

再跑 Activity Log 相关测试：

```bash
npm run test -w @learn/api -- activity-logs
```

最后跑整体检查：

```bash
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] `createTodoService` 支持可选 `activityLogService`
- [x] `createTodo` 成功后记录 `todo.created`
- [x] `updateTodo` 普通更新成功后记录 `todo.updated`
- [x] `updateTodo` 从未完成变成完成时记录 `todo.completed`
- [x] `deleteTodo` 成功后记录 `todo.deleted`
- [x] `todos.routes.ts` 接入真实 ActivityLogService
- [x] Todo service 测试补 fake activity log service
- [x] 测试创建 Todo 成功后会记录日志
- [x] 测试更新 Todo 成功后会记录日志
- [x] 测试完成 Todo 后会记录 `todo.completed`
- [x] 测试删除 Todo 成功后会记录日志
- [x] 测试权限失败时不会记录日志
- [x] 测试描述使用中文
- [x] `npm run test -w @learn/api -- todos.service.test.ts` 通过
- [x] `npm run test -w @learn/api -- activity-logs` 通过
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Activity Log 接入 Todo 写操作完成了
```
