# Task: Todo Create List And Toggle API

## 目标

上一张任务你已经完成了 Todo repository：

```text
TodoRepository -> Prisma -> MySQL
```

这一张任务把 Todo 接到 HTTP API 上：

```text
POST /projects/:projectId/todos
GET /projects/:projectId/todos
PATCH /todos/:id
```

你要练的是：

- 用 Zod 校验 Todo 请求体。
- 创建 Todo 前先确认 Project 属于当前用户。
- 列出 Todo 前先确认 Project 属于当前用户。
- 更新 Todo 前通过 `Todo -> Project -> User` 确认权限。
- 写 integration test，证明用户不能操作别人项目下的 Todo。

---

## Step 1: 创建 Todo schema

创建：

```text
apps/api/src/modules/todos/todos.schema.ts
```

写：

```ts
import { z } from "zod";

// 创建 Todo 时，客户端只提交 Todo 自己的内容。
//
// projectId 不从 body 里拿，而是从 URL 参数里拿：
// POST /projects/:projectId/todos
export const createTodoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Todo title is required")
    .max(100, "Todo title must be 100 characters or less"),

  description: z
    .string()
    .trim()
    .max(1000, "Description must be 1000 characters or less")
    .optional(),

  // 先用 string，后面 repository 会转成 Date。
  // API 任务先不做复杂日期校验，保持学习范围稳定。
  dueDate: z.string().optional()
});

// PATCH /todos/:id 是局部更新。
//
// 这次我们最关心 completed，因为它就是“完成状态切换”的核心字段。
export const updateTodoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Todo title is required")
    .max(100, "Todo title must be 100 characters or less")
    .optional(),

  description: z
    .string()
    .trim()
    .max(1000, "Description must be 1000 characters or less")
    .optional(),

  completed: z.boolean().optional(),
  dueDate: z.string().nullable().optional()
});
```

---

## Step 2: 创建 Todo service

创建：

```text
apps/api/src/modules/todos/todos.service.ts
```

写：

```ts
import type { CreateTodoInput, UpdateTodoInput } from "@learn/shared";
import { AppError } from "../../errors/app-error.js";
import type { ProjectRepository } from "../projects/projects.repository.js";
import type { TodoRepository } from "./todos.repository.js";

export function createTodoService(
  todoRepository: TodoRepository,
  projectRepository: ProjectRepository
) {
  async function requireOwnedProject(projectId: string, currentUserId: string) {
    // Todo 本身没有 userId。
    //
    // 所以创建/列表 Todo 前，必须先检查它所属的 Project 是否属于当前用户。
    const project = await projectRepository.findById(projectId);

    if (!project || project.userId !== currentUserId) {
      throw new AppError(404, "PROJECT_NOT_FOUND", "Project was not found");
    }

    return project;
  }

  async function requireOwnedTodo(todoId: string, currentUserId: string) {
    // 更新 Todo 时，URL 里只有 todoId，没有 projectId。
    //
    // 所以这里要先查 Todo，再通过 todo.projectId 查 Project，
    // 最后判断 Project.userId 是否等于当前用户 id。
    const todo = await todoRepository.findById(todoId);

    if (!todo) {
      throw new AppError(404, "TODO_NOT_FOUND", "Todo was not found");
    }

    await requireOwnedProject(todo.projectId, currentUserId);

    return todo;
  }

  return {
    async createTodo(projectId: string, input: CreateTodoInput, currentUserId: string) {
      await requireOwnedProject(projectId, currentUserId);
      return todoRepository.create(input, projectId);
    },

    async listTodos(projectId: string, currentUserId: string) {
      await requireOwnedProject(projectId, currentUserId);
      return todoRepository.findAllByProjectId(projectId);
    },

    async updateTodo(id: string, input: UpdateTodoInput, currentUserId: string) {
      await requireOwnedTodo(id, currentUserId);

      const todo = await todoRepository.update(id, input);

      if (!todo) {
        throw new AppError(404, "TODO_NOT_FOUND", "Todo was not found");
      }

      return todo;
    }
  };
}
```

---

## Step 3: 创建 Todo router

创建：

```text
apps/api/src/modules/todos/todos.routes.ts
```

写：

```ts
import { Router } from "express";
import { ZodError } from "zod";
import { AppError } from "../../errors/app-error.js";
import { asyncHandler } from "../../http/async-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { createPrismaProjectRepository } from "../projects/projects.prisma-repository.js";
import { createPrismaTodoRepository } from "./todos.prisma-repository.js";
import { createTodoSchema, updateTodoSchema } from "./todos.schema.js";
import { createTodoService } from "./todos.service.js";

export function createTodosRouter() {
  const todosRouter = Router();
  const todoService = createTodoService(
    createPrismaTodoRepository(),
    createPrismaProjectRepository()
  );

  todosRouter.use(requireAuth);

  todosRouter.get(
    "/projects/:projectId/todos",
    asyncHandler(async (request, response) => {
      const todos = await todoService.listTodos(
        request.params.projectId as string,
        request.user!.id
      );

      response.json({ success: true, data: todos });
    })
  );

  todosRouter.post(
    "/projects/:projectId/todos",
    asyncHandler(async (request, response) => {
      try {
        const input = createTodoSchema.parse(request.body);
        const todo = await todoService.createTodo(
          request.params.projectId as string,
          input,
          request.user!.id
        );

        response.status(201).json({ success: true, data: todo });
      } catch (error) {
        if (error instanceof ZodError) {
          throw new AppError(
            400,
            "VALIDATION_ERROR",
            error.issues[0]?.message ?? "Invalid request body"
          );
        }

        throw error;
      }
    })
  );

  todosRouter.patch(
    "/todos/:id",
    asyncHandler(async (request, response) => {
      try {
        const input = updateTodoSchema.parse(request.body);
        const todo = await todoService.updateTodo(
          request.params.id as string,
          input,
          request.user!.id
        );

        response.json({ success: true, data: todo });
      } catch (error) {
        if (error instanceof ZodError) {
          throw new AppError(
            400,
            "VALIDATION_ERROR",
            error.issues[0]?.message ?? "Invalid request body"
          );
        }

        throw error;
      }
    })
  );

  return todosRouter;
}
```

---

## Step 4: 在 app.ts 挂载 Todo router

打开：

```text
apps/api/src/app.ts
```

导入：

```ts
import { createTodosRouter } from "./modules/todos/todos.routes.js";
```

挂载：

```ts
app.use(createTodosRouter());
```

建议放在：

```ts
app.use("/plans", createPlansRouter());
app.use("/projects", createProjectsRouter());
app.use(createTodosRouter());
app.use("/auth", createAuthRouter());
```

注意：这里没有写 `app.use("/todos", ...)`，因为 router 里同时有：

```text
/projects/:projectId/todos
/todos/:id
```

---

## Step 5: 写 integration test

创建：

```text
apps/api/tests/integration/todos.test.ts
```

你可以先照着这几个测试目标写：

```text
1. 未登录不能创建 Todo
2. 登录用户可以在自己的 Project 下创建并列表 Todo
3. 用户不能在别人的 Project 下创建 Todo
4. 用户可以把自己的 Todo completed 改成 true
5. 用户不能更新别人 Project 下的 Todo
```

测试准备建议：

```ts
async function registerAndLogin(...)
function authHeader(...)
async function createProject(app, token, name)
async function createTodo(app, token, projectId, title)
```

这张任务我故意不把完整测试贴满，因为你前面已经看过 Project API 测试了。
你可以先模仿：

```text
apps/api/tests/integration/projects.test.ts
```

写不出来也没关系，你完成后告诉我，我会帮你补。

---

## Step 6: 跑测试

先跑 Todo API 测试：

```bash
npm run test -w @learn/api -- tests/integration/todos.test.ts
```

再跑全量：

```bash
npm run test
npm run typecheck
npm run format:check
npm run build
```

---

## 验收标准

完成后告诉我：

```text
Todo API 完成了
```

我会帮你检查：

- 创建 Todo 前是否确认 Project 属于当前用户。
- 列表 Todo 前是否确认 Project 属于当前用户。
- 更新 Todo 前是否通过 `Todo -> Project -> User` 校验权限。
- 测试是否覆盖“不能操作别人的 Todo”。
- 是否需要补更详细中文注释。
