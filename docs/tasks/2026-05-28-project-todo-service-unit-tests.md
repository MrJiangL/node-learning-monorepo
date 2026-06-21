# Task: Project And Todo Service Unit Tests

## 目标

你选择继续深入 Node 后端，所以这张任务开始补“业务层测试”。

前面我们已经写过：

```text
Repository unit test：真的连 Prisma / MySQL
Integration test：真的走 HTTP / Express / Auth
```

这一张只测 service：

```text
Service unit test：不用 HTTP，不连 MySQL，只用 fake repository 测业务规则
```

你要练的是：

- 怎么手写 fake repository。
- 怎么测试 service 会把 `currentUserId` 传给 repository。
- 怎么测试 Todo 的权限链路：`Todo -> Project -> User`。
- 怎么断言 `AppError`。

---

## Step 1: 写 Project service 测试

创建：

```text
apps/api/tests/unit/projects.service.test.ts
```

先写这个骨架：

```ts
import { describe, expect, it } from "vitest";
import type { Project, CreateProjectInput } from "@learn/shared";
import type { ProjectRepository } from "../../src/modules/projects/projects.repository.js";
import { createProjectService } from "../../src/modules/projects/projects.service.js";

function createFakeProjectRepository(): ProjectRepository & {
  created: Array<{ input: CreateProjectInput; userId: string }>;
} {
  const projects: Project[] = [];
  const created: Array<{ input: CreateProjectInput; userId: string }> = [];

  return {
    created,

    async create(input, userId) {
      // 记录 service 有没有把 currentUserId 正确传下来。
      created.push({ input, userId });

      const now = new Date().toISOString();
      const project: Project = {
        id: crypto.randomUUID(),
        name: input.name,
        description: input.description ?? null,
        createdAt: now,
        updatedAt: now,
        userId
      };

      projects.push(project);
      return project;
    },

    async findAllByUserId(userId) {
      return projects.filter((project) => project.userId === userId);
    },

    async findById(id) {
      return projects.find((project) => project.id === id) ?? null;
    }
  };
}

describe("project service", () => {
  it("creates a project for the current user", async () => {
    const repository = createFakeProjectRepository();
    const service = createProjectService(repository);

    const project = await service.createProject(
      {
        name: "Backend depth"
      },
      "user-1"
    );

    expect(project).toMatchObject({
      name: "Backend depth",
      userId: "user-1"
    });

    expect(repository.created).toEqual([
      {
        input: { name: "Backend depth" },
        userId: "user-1"
      }
    ]);
  });

  it("lists only current user's projects", async () => {
    const repository = createFakeProjectRepository();
    const service = createProjectService(repository);

    await service.createProject({ name: "User 1 project" }, "user-1");
    await service.createProject({ name: "User 2 project" }, "user-2");

    const result = await service.listProjects("user-1");

    expect(result.map((project) => project.name)).toEqual(["User 1 project"]);
  });
});
```

学习点：

- 这里没有用 Prisma。
- fake repository 只是模拟 repository 的行为。
- service 测试重点不是数据库，而是业务层有没有正确调用 repository。

---

## Step 2: 写 Todo service 测试

创建：

```text
apps/api/tests/unit/todos.service.test.ts
```

这次你不要一次写太多，先完成 3 个核心测试。

### 测试 1：当前用户可以在自己的 Project 下创建 Todo

要验证：

```text
project.userId === currentUserId
=> 允许创建 Todo
```

测试思路：

```ts
const projectRepository = fakeProjectRepository({
  id: "project-1",
  userId: "user-1"
});

const todoRepository = fakeTodoRepository();
const service = createTodoService(todoRepository, projectRepository);

const todo = await service.createTodo("project-1", { title: "Write test" }, "user-1");

expect(todo.projectId).toBe("project-1");
```

### 测试 2：不能在别人的 Project 下创建 Todo

要验证：

```text
project.userId !== currentUserId
=> 抛 PROJECT_NOT_FOUND
=> 不应该调用 todoRepository.create
```

断言可以写：

```ts
await expect(service.createTodo("project-1", { title: "Nope" }, "user-2")).rejects.toMatchObject({
  statusCode: 404,
  code: "PROJECT_NOT_FOUND"
});
```

### 测试 3：不能更新别人的 Todo

要验证：

```text
todo.projectId -> project.userId !== currentUserId
=> 抛 PROJECT_NOT_FOUND
=> 不应该 update Todo
```

这个测试最重要，因为它对应真实权限链路：

```text
Todo -> Project -> User
```

---

## Step 3: fake repository 提示

你可以先在测试文件里写简单 fake，不需要抽到公共文件。

Project fake 可以长这样：

```ts
const projectRepository: ProjectRepository = {
  async create() {
    throw new Error("not needed in this test");
  },
  async findAllByUserId() {
    throw new Error("not needed in this test");
  },
  async findById(id) {
    if (id !== project.id) {
      return null;
    }

    return project;
  }
};
```

Todo fake 可以长这样：

```ts
const updatedIds: string[] = [];

const todoRepository: TodoRepository = {
  async create(input, projectId) {
    return {
      id: "todo-1",
      title: input.title,
      description: input.description ?? null,
      completed: false,
      dueDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectId
    };
  },
  async findAllByProjectId(projectId) {
    return todos.filter((todo) => todo.projectId === projectId);
  },
  async findById(id) {
    return todos.find((todo) => todo.id === id) ?? null;
  },
  async update(id, input) {
    updatedIds.push(id);
    const todo = todos.find((item) => item.id === id);

    if (!todo) {
      return null;
    }

    return {
      ...todo,
      ...input,
      updatedAt: new Date().toISOString()
    };
  }
};
```

---

## Step 4: 跑测试

先跑 service 测试：

```bash
npm run test -w @learn/api -- tests/unit/projects.service.test.ts tests/unit/todos.service.test.ts
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
Service 单元测试完成了
```

我会帮你：

- 检查 fake repository 写法是否清楚。
- 检查 Todo 权限链路是否测到。
- 补详细中文注释。
- 跑完整验证。
- 出下一张“Todo 列表分页”任务卡。
