# Task: Prisma Transaction Create Project With Todos

## 目标

这一张任务练 Prisma transaction。

你要新增一个接口：

```text
POST /projects/with-todos
```

它一次创建：

- 一个 Project
- 多个初始 Todo

请求示例：

```json
{
  "name": "Node 深入学习",
  "description": "练 Prisma transaction",
  "todos": [{ "title": "理解 transaction 是什么" }, { "title": "写 createWithTodos repository" }]
}
```

返回示例：

```json
{
  "success": true,
  "data": {
    "project": {
      "id": "...",
      "name": "Node 深入学习",
      "description": "练 Prisma transaction",
      "userId": "..."
    },
    "todos": [
      {
        "id": "...",
        "title": "理解 transaction 是什么",
        "completed": false,
        "projectId": "..."
      }
    ]
  }
}
```

学习重点：

- transaction 解决“多步数据库写入要么全部成功，要么全部失败”。
- `prisma.$transaction(async (tx) => {})` 里的 `tx` 是事务客户端。
- 在 transaction 回调里，尽量使用 `tx.project` / `tx.todo`，不要混用外层 `prisma.project` / `prisma.todo`。
- service 继续只负责业务意图和当前用户身份，不直接碰 Prisma。

---

## Step 1: 更新 shared 类型

打开：

```text
packages/shared/src/index.ts
```

在 `CreateTodoInput` 和 `Todo` 类型后面新增：

```ts
// InitialTodoInput 表示“创建 Project 时顺便创建的初始 Todo”。
//
// 它复用了 CreateTodoInput 的字段，而不是重新手写一遍。
// 这样以后如果 CreateTodoInput 增加 dueDate 之类字段，
// 这里也能保持类型一致。
export type InitialTodoInput = Pick<CreateTodoInput, "title" | "description" | "dueDate">;

// CreateProjectWithTodosInput 表示一个更复杂的创建请求：
// - Project 的基本字段来自 CreateProjectInput
// - todos 是这个项目创建时要一起插入的初始任务
export type CreateProjectWithTodosInput = CreateProjectInput & {
  todos: InitialTodoInput[];
};

// ProjectWithTodos 是这个接口返回给客户端的数据形状。
//
// 注意这里不要把它设计成 Prisma 原始返回类型。
// API 层仍然应该返回我们 shared package 里定义好的干净类型。
export type ProjectWithTodos = {
  project: Project;
  todos: Todo[];
};
```

---

## Step 2: 更新 Project schema

打开：

```text
apps/api/src/modules/projects/projects.schema.ts
```

新增一个 `createProjectWithTodosSchema`。

参考代码：

```ts
// 创建 Project 时携带的初始 Todo。
//
// 这里没有直接 import createTodoSchema，是为了让 Project 模块的输入规则
// 在这个文件里一眼能看完整。等你更熟以后，也可以再考虑抽成共享 schema。
const initialTodoSchema = z.object({
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
  dueDate: z.string().optional()
});

export const createProjectWithTodosSchema = createProjectSchema.extend({
  // 这张任务强制至少 1 条 Todo，是为了让 transaction 的学习点更明显。
  //
  // max(10) 是一个简单保护：避免一次请求插入太多数据。
  // 真实项目里这个上限可以根据业务再调整。
  todos: z.array(initialTodoSchema).min(1, "At least one todo is required").max(10)
});
```

---

## Step 3: 更新 ProjectRepository 接口

打开：

```text
apps/api/src/modules/projects/projects.repository.ts
```

把导入改成：

```ts
import type {
  CreateProjectInput,
  CreateProjectWithTodosInput,
  Project,
  ProjectWithTodos
} from "@learn/shared";
```

在 `create` 后面新增：

```ts
// 一次创建 Project 和它的初始 Todo。
//
// 这个方法会由 Prisma repository 用 transaction 实现。
// repository 接口只描述“业务需要什么能力”，不暴露 Prisma 的 tx 细节。
createWithTodos(input: CreateProjectWithTodosInput, userId: string): Promise<ProjectWithTodos>;
```

---

## Step 4: 在 Prisma repository 里实现 transaction

打开：

```text
apps/api/src/modules/projects/projects.prisma-repository.ts
```

新增导入：

```ts
import type {
  CreateProjectInput,
  CreateProjectWithTodosInput,
  Project,
  ProjectWithTodos
} from "@learn/shared";
import { mapPrismaTodoToTodo } from "../todos/todos.mapper.js";
```

在 `create` 方法后面新增：

```ts
async createWithTodos(
  input: CreateProjectWithTodosInput,
  userId: string
): Promise<ProjectWithTodos> {
  const result = await prisma.$transaction(async (tx) => {
    // 第一步：先创建 Project。
    //
    // 这里使用 tx.project.create，而不是 prisma.project.create。
    // tx 代表“当前事务里的 Prisma client”。
    // 只要在这个回调里使用 tx，Prisma 就能保证这些写入属于同一个事务。
    const project = await tx.project.create({
      data: {
        id: crypto.randomUUID(),
        name: input.name,
        description: input.description ?? null,
        userId
      }
    });

    // 第二步：创建这个 Project 下的初始 Todo。
    //
    // input.todos.map(...) 会为每一条 Todo 生成一个 create Promise。
    // Promise.all 等全部创建完成后，返回完整的 Todo 数组。
    //
    // 如果其中任何一条创建失败，整个 $transaction 会回滚：
    // Project 不会留下来，已经创建的 Todo 也不会留下来。
    const todos = await Promise.all(
      input.todos.map((todoInput) =>
        tx.todo.create({
          data: {
            id: crypto.randomUUID(),
            title: todoInput.title,
            description: todoInput.description ?? null,
            dueDate: todoInput.dueDate ? new Date(todoInput.dueDate) : null,
            projectId: project.id
          }
        })
      )
    );

    return { project, todos };
  });

  return {
    project: mapPrismaProjectToProject(result.project),
    todos: result.todos.map(mapPrismaTodoToTodo)
  };
},
```

注意：

```text
这个方法最后有逗号，因为它在 return { ... } 对象里面。
```

---

## Step 5: 更新 Project service

打开：

```text
apps/api/src/modules/projects/projects.service.ts
```

把导入改成：

```ts
import type { CreateProjectInput, CreateProjectWithTodosInput } from "@learn/shared";
```

在 `createProject` 后面新增：

```ts
createProjectWithTodos(input: CreateProjectWithTodosInput, currentUserId: string) {
  // 和普通 createProject 一样，userId 必须来自当前登录用户。
  //
  // body 里的 name / description / todos 是用户可以提交的数据；
  // currentUserId 是 requireAuth 从 JWT 里解析出的身份。
  // 两者不能混在一起。
  return projectRepository.createWithTodos(input, currentUserId);
},
```

---

## Step 6: 新增 route

打开：

```text
apps/api/src/modules/projects/projects.routes.ts
```

把 schema 导入改成：

```ts
import { createProjectSchema, createProjectWithTodosSchema } from "./projects.schema.js";
```

在 `projectsRouter.post("/")` 前面新增：

```ts
projectsRouter.post(
  "/with-todos",
  asyncHandler(async (request, response) => {
    try {
      // 这个接口的 body 比 POST /projects 多一个 todos 数组。
      //
      // route 层只做输入校验和 HTTP 响应组织；
      // 真正的 transaction 细节放在 Prisma repository。
      const input = createProjectWithTodosSchema.parse(request.body);
      const result = await projectService.createProjectWithTodos(input, request.user!.id);

      response.status(201).json({ success: true, data: result });
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
```

---

## Step 7: 更新测试

你先补这三个测试。

### 7.1 Prisma repository 单元测试

打开：

```text
apps/api/tests/unit/projects.prisma-repository.test.ts
```

新增测试：

```ts
it("creates a project with initial todos in one transaction", async () => {
  const repository = createPrismaProjectRepository();
  const owner = await createTestUser("project-transaction-owner@example.com");

  const result = await repository.createWithTodos(
    {
      name: "Transaction project",
      description: "Create project and todos together",
      todos: [{ title: "Todo 1" }, { title: "Todo 2" }]
    },
    owner.id
  );

  expect(result.project).toMatchObject({
    name: "Transaction project",
    userId: owner.id
  });
  expect(result.todos.map((todo) => todo.title)).toEqual(["Todo 1", "Todo 2"]);
  expect(result.todos.every((todo) => todo.projectId === result.project.id)).toBe(true);

  // 再直接查数据库，确认 Project 和 Todo 都真的写进去了。
  const savedTodos = await prisma.todo.findMany({
    where: { projectId: result.project.id },
    orderBy: { createdAt: "asc" }
  });

  expect(savedTodos.map((todo) => todo.title)).toEqual(["Todo 1", "Todo 2"]);
});
```

### 7.2 Project service 单元测试

打开：

```text
apps/api/tests/unit/projects.service.test.ts
```

你需要更新 fake repository，让它支持 `createWithTodos`。

先把导入改成：

```ts
import type {
  CreateProjectInput,
  CreateProjectWithTodosInput,
  Project,
  ProjectWithTodos,
  Todo
} from "@learn/shared";
```

再给 fake repository 的返回类型补一个记录字段：

```ts
createdWithTodos: Array<{ input: CreateProjectWithTodosInput; userId: string }>;
```

然后在 fake repository 对象里新增方法：

```ts
async createWithTodos(input, userId): Promise<ProjectWithTodos> {
  createdWithTodos.push({ input, userId });

  const now = new Date().toISOString();
  const project: Project = {
    id: crypto.randomUUID(),
    name: input.name,
    description: input.description ?? null,
    createdAt: now,
    updatedAt: now,
    userId
  };

  const todos: Todo[] = input.todos.map((todoInput) => ({
    id: crypto.randomUUID(),
    title: todoInput.title,
    description: todoInput.description ?? null,
    completed: false,
    dueDate: todoInput.dueDate ?? null,
    createdAt: now,
    updatedAt: now,
    projectId: project.id
  }));

  projects.push(project);

  return { project, todos };
},
```

新增测试：

```ts
it("创建 Project 和初始 Todo 时，会把 currentUserId 传给 repository", async () => {
  const repository = createFakeProjectRepository();
  const service = createProjectService(repository);

  const result = await service.createProjectWithTodos(
    {
      name: "Transaction service",
      todos: [{ title: "First todo" }]
    },
    "user-1"
  );

  expect(result.project).toMatchObject({
    name: "Transaction service",
    userId: "user-1"
  });
  expect(result.todos.map((todo) => todo.title)).toEqual(["First todo"]);
  expect(repository.createdWithTodos).toEqual([
    {
      input: {
        name: "Transaction service",
        todos: [{ title: "First todo" }]
      },
      userId: "user-1"
    }
  ]);
});
```

### 7.3 Project API integration test

打开：

```text
apps/api/tests/integration/projects.test.ts
```

新增测试：

```ts
it("creates a project with initial todos for the current user", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "project-with-todos@example.com");

  const response = await request(app)
    .post("/projects/with-todos")
    .set(authHeader(auth.token))
    .send({
      name: "Project with todos",
      todos: [{ title: "Todo A" }, { title: "Todo B" }]
    });

  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);
  expect(response.body.data.project).toMatchObject({
    name: "Project with todos",
    userId: auth.user.id
  });
  expect(response.body.data.todos.map((todo: { title: string }) => todo.title)).toEqual([
    "Todo A",
    "Todo B"
  ]);

  // 直接查数据库，确认 todos 的 projectId 指向刚创建的 project。
  const savedTodos = await prisma.todo.findMany({
    where: { projectId: response.body.data.project.id },
    orderBy: { createdAt: "asc" }
  });

  expect(savedTodos.map((todo) => todo.title)).toEqual(["Todo A", "Todo B"]);
});
```

再新增一个校验失败测试：

```ts
it("rejects creating a project with empty initial todos", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "project-with-empty-todos@example.com");

  const response = await request(app)
    .post("/projects/with-todos")
    .set(authHeader(auth.token))
    .send({
      name: "Invalid transaction project",
      todos: []
    });

  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe("VALIDATION_ERROR");
});
```

---

## Step 8: 跑测试

先跑本任务相关测试：

```bash
npm run test -w @learn/api -- tests/unit/projects.prisma-repository.test.ts tests/unit/projects.service.test.ts tests/integration/projects.test.ts
```

再跑类型检查：

```bash
npm run typecheck
```

如果这两个都过了，再跑全量：

```bash
npm run test
npm run format:check
npm run build
```

你完成后告诉我：

```text
Prisma transaction 完成了
```

然后我会帮你：

- 跑验证。
- 补更详细的中文注释。
- 如果测试写得不完整，我会补测试并解释为什么这么测。
- 更新任务索引。
- 给下一张任务卡。
