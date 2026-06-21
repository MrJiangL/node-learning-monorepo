# Task: Todo Repository And Unit Tests

## 目标

现在你已经完成了：

```text
Project 数据模型 -> Project repository -> Project API
```

下一步开始做 `Todo`。

这一张任务先不写 HTTP API，只写 Todo 的数据访问层：

```text
TodoRepository -> Prisma -> MySQL
```

你要练的是：

- Todo 必须属于 Project。
- Repository 里如何保存 `projectId` 外键。
- 如何测试“只列出某个 Project 下的 Todo”。
- 如何更新 Todo 的完成状态。
- 如何在测试里准备多层数据：`User -> Project -> Todo`。

---

## Step 1: 在 shared 包里补 Todo 类型

打开：

```text
packages/shared/src/index.ts
```

添加：

```ts
// Todo 表示系统返回给客户端的一条任务数据。
//
// dueDate 用 string | null，而不是 Date：
// HTTP API 返回 JSON 时没有真正的 Date 类型，Date 会被序列化成字符串。
export type Todo = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string;
};

// CreateTodoInput 表示“创建 Todo 时客户端可以传什么”。
//
// projectId 不放在这里，是因为 projectId 会来自 URL：
// POST /projects/:projectId/todos
//
// 这样客户端虽然能选择“在哪个项目下创建 Todo”，
// 但后面 service 仍然要校验这个 project 是否属于当前用户。
export type CreateTodoInput = {
  title: string;
  description?: string;
  dueDate?: string;
};

// UpdateTodoInput 表示“更新 Todo 时客户端可以传什么”。
//
// 下一张 API 任务会做“完成状态切换”，所以这里先把 completed 放进来。
export type UpdateTodoInput = {
  title?: string;
  description?: string;
  completed?: boolean;
  dueDate?: string | null;
};
```

---

## Step 2: 创建 Todo 模块文件

创建目录和文件：

```text
apps/api/src/modules/todos/todos.repository.ts
apps/api/src/modules/todos/todos.mapper.ts
apps/api/src/modules/todos/todos.prisma-repository.ts
```

---

## Step 3: 定义 TodoRepository 接口

在：

```text
apps/api/src/modules/todos/todos.repository.ts
```

写：

```ts
import type { CreateTodoInput, Todo, UpdateTodoInput } from "@learn/shared";

export type TodoRepository = {
  // 创建 Todo 时必须传 projectId。
  //
  // Todo 不直接属于 User，而是属于 Project。
  // 所以 Todo 的归属链路是：Todo -> Project -> User。
  create(input: CreateTodoInput, projectId: string): Promise<Todo>;

  // 查询某个 Project 下的所有 Todo。
  //
  // 注意这里按 projectId 查，不是按 userId 查。
  // 因为 Todo 表里没有 userId，权限校验后面会通过 Project 来完成。
  findAllByProjectId(projectId: string): Promise<Todo[]>;

  // 按 Todo id 查询一条记录。
  //
  // 找不到时返回 null，保持和 Plan / Project repository 一样的接口风格。
  findById(id: string): Promise<Todo | null>;

  // 更新 Todo。
  //
  // 下一张 API 会用它来做 completed 状态切换。
  update(id: string, input: UpdateTodoInput): Promise<Todo | null>;
};
```

---

## Step 4: 写 Todo mapper

在：

```text
apps/api/src/modules/todos/todos.mapper.ts
```

写：

```ts
import type { Todo } from "@learn/shared";
import type { PrismaTodo } from "./todos.prisma-repository.js";

// Prisma 返回的 createdAt / updatedAt / dueDate 是 Date 对象。
// shared Todo 里这些时间字段要返回 string，方便 HTTP JSON 输出。
export function mapPrismaTodoToTodo(todo: PrismaTodo): Todo {
  return {
    id: todo.id,
    title: todo.title,
    description: todo.description,
    completed: todo.completed,
    dueDate: todo.dueDate ? todo.dueDate.toISOString() : null,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
    projectId: todo.projectId
  };
}
```

---

## Step 5: 写 Prisma Todo Repository

在：

```text
apps/api/src/modules/todos/todos.prisma-repository.ts
```

先照这个结构写，然后补完 TODO：

```ts
import type { Todo as PrismaTodoModel } from "@prisma/client";
import type { CreateTodoInput, Todo, UpdateTodoInput } from "@learn/shared";
import { prisma } from "../../db/prisma.js";
import { mapPrismaTodoToTodo } from "./todos.mapper.js";
import type { TodoRepository } from "./todos.repository.js";

export type PrismaTodo = PrismaTodoModel;

function parseOptionalDate(value: string | null | undefined): Date | null | undefined {
  // undefined 表示“不更新这个字段”。
  // null 表示“明确清空 dueDate”。
  // string 表示“设置一个新的截止时间”。
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return new Date(value);
}

export function createPrismaTodoRepository(): TodoRepository {
  return {
    async create(input: CreateTodoInput, projectId: string): Promise<Todo> {
      // TODO: 用 prisma.todo.create 创建 Todo。
      //
      // 提示：
      // - id 用 crypto.randomUUID()
      // - completed 不用手动传，schema.prisma 里已经有 @default(false)
      // - description 没传时存 null
      // - dueDate 没传时存 null
      // - projectId 使用参数 projectId
    },

    async findAllByProjectId(projectId: string): Promise<Todo[]> {
      // TODO: 用 prisma.todo.findMany 查询某个项目下的 Todo。
      //
      // 提示：
      // - where: { projectId }
      // - orderBy: { createdAt: "asc" }
      // - 最后 map 成 shared Todo 类型
    },

    async findById(id: string): Promise<Todo | null> {
      // TODO: 用 prisma.todo.findUnique 按 id 查询。
      //
      // 找不到时返回 null。
    },

    async update(id: string, input: UpdateTodoInput): Promise<Todo | null> {
      // TODO: 先 findUnique，找不到返回 null。
      //
      // 找到后再 prisma.todo.update。
      // 注意 dueDate 要用 parseOptionalDate(input.dueDate) 转换。
    }
  };
}
```

---

## Step 6: 写 Todo repository 单元测试

创建：

```text
apps/api/tests/unit/todos.prisma-repository.test.ts
```

测试骨架如下：

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db/prisma.js";
import { createPrismaTodoRepository } from "../../src/modules/todos/todos.prisma-repository.js";

async function createTestUser(email: string) {
  return prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email,
      passwordHash: "temporary-test-user",
      name: "Todo Repository Test User"
    }
  });
}

async function createTestProject(userId: string, name: string) {
  // Todo 依赖 Project，所以测试 Todo repository 前要先准备 Project。
  //
  // 这里直接用 Prisma 创建 Project，是为了让测试聚焦在 TodoRepository，
  // 不被 ProjectRepository 的实现细节影响。
  return prisma.project.create({
    data: {
      id: crypto.randomUUID(),
      name,
      description: null,
      userId
    }
  });
}

describe("prisma todo repository", () => {
  beforeEach(async () => {
    // 清理顺序：Todo -> Project -> User。
    //
    // 因为 Todo 依赖 Project，Project 依赖 User。
    await prisma.todo.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
  });

  it("creates a todo for the provided project", async () => {
    const repository = createPrismaTodoRepository();
    const owner = await createTestUser("todo-create-owner@example.com");
    const project = await createTestProject(owner.id, "Todo project");

    // TODO: 调用 repository.create() 创建 Todo。
    //
    // 然后用 prisma.todo.findUnique({ include: { project: true } })
    // 验证它真的关联到了 project。
  });

  it("lists only todos from the provided project", async () => {
    const repository = createPrismaTodoRepository();
    const owner = await createTestUser("todo-list-owner@example.com");
    const project = await createTestProject(owner.id, "Main project");
    const anotherProject = await createTestProject(owner.id, "Another project");

    // TODO: 在 project 下创建两个 Todo。
    // TODO: 在 anotherProject 下创建一个 Todo。
    //
    // 调用 findAllByProjectId(project.id)，断言只返回 project 下的两个 Todo。
  });

  it("finds a todo by id", async () => {
    const repository = createPrismaTodoRepository();
    const owner = await createTestUser("todo-find-owner@example.com");
    const project = await createTestProject(owner.id, "Find project");

    // TODO: 创建 Todo，然后 findById(createdTodo.id)。
    //
    // 断言至少包含：
    // - id
    // - title
    // - projectId
  });

  it("updates a todo completed status", async () => {
    const repository = createPrismaTodoRepository();
    const owner = await createTestUser("todo-update-owner@example.com");
    const project = await createTestProject(owner.id, "Update project");

    // TODO: 创建一个默认未完成的 Todo。
    // TODO: 调用 update(createdTodo.id, { completed: true })。
    //
    // 断言 completed 变成 true。
  });

  it("returns null when updating a missing todo", async () => {
    const repository = createPrismaTodoRepository();

    // TODO: 调用 update("missing-todo-id", { completed: true })。
    // 断言返回 null。
  });
});
```

---

## Step 7: 跑测试

先跑你新增的 Todo repository 测试：

```bash
npm run test -w @learn/api -- tests/unit/todos.prisma-repository.test.ts
```

如果通过，再跑：

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
Todo repository 完成了
```

我会帮你：

- 检查 Todo 是否正确关联 Project。
- 检查列表是否只返回指定 Project 下的 Todo。
- 检查 completed 更新是否正确。
- 补详细中文注释。
- 跑完整验证。
- 给你下一张 `Todo API：创建、列表、完成状态切换` 任务卡。
