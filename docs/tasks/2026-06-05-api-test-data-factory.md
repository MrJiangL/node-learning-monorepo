# Task: 后端测试工程化：测试数据工厂入门

## 背景

你之前写 API 测试时，经常会遇到一个问题：

```text
为了测一个接口，要先创建 user、project、todo。
```

如果每个测试都手写一遍准备数据，测试会变得很长，而且你会分不清：

```text
这段代码到底是在“准备测试数据”，还是在“验证接口行为”？
```

这张任务要练的是测试数据工厂。

它不是业务功能，而是测试工程化能力。

目标是把重复的测试数据准备逻辑抽出来，让测试读起来更像：

```text
创建一个测试用户
创建这个用户的 project
创建这个 project 下的 todo
验证当前行为
```

---

## 你会练到什么

- 为什么测试需要 data factory
- 如何给测试创建唯一 email，避免数据冲突
- 如何把 Prisma 测试数据准备逻辑集中到 helper
- 如何让测试重点回到“行为断言”
- 为什么测试 helper 也需要清晰注释

---

## 任务 1：阅读现有测试 helper

先阅读：

```text
apps/api/tests/helpers/api-test-helpers.ts
```

重点看这些函数：

```text
clearDatabase()
createTestUser()
createTestProject()
authHeader()
```

你先不用改它们。

你要观察：

```text
哪些 helper 是通过 HTTP API 准备数据？
哪些 helper 是直接通过 Prisma 准备数据？
```

---

## 任务 2：创建测试数据工厂文件

创建文件：

```text
apps/api/tests/helpers/test-data-factory.ts
```

写入下面代码：

```ts
import { prisma } from "../../src/db/prisma.js";
import { hashPassword } from "../../src/modules/auth/password.js";

type CreateUserFactoryInput = {
  email?: string;
  password?: string;
  name?: string;
};

type CreateProjectFactoryInput = {
  userId: string;
  name?: string;
  description?: string | null;
};

type CreateTodoFactoryInput = {
  projectId: string;
  title?: string;
  description?: string | null;
  completed?: boolean;
  dueDate?: Date | null;
};

// 测试数据需要尽量避免互相撞车。
//
// 比如 User.email 在数据库里通常是唯一的。
// 如果两个测试都创建 test@example.com，就可能因为唯一约束导致失败。
//
// 所以这里用时间戳和随机数生成一个足够唯一的后缀。
const uniqueSuffix = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// createFactoryUser 直接通过 Prisma 创建用户。
//
// 它适合用在“当前测试不关心注册流程，只需要数据库里已经有一个用户”的场景。
// 如果测试目标是 POST /auth/register，那就不应该用这个 helper 绕过注册接口。
export const createFactoryUser = async (input: CreateUserFactoryInput = {}) => {
  const password = input.password ?? "Password123!";

  return prisma.user.create({
    data: {
      email: input.email ?? `factory-user-${uniqueSuffix()}@example.com`,
      name: input.name ?? "Factory User",
      passwordHash: await hashPassword(password)
    }
  });
};

// createFactoryProject 直接创建属于某个 user 的 Project。
//
// 注意：这里要求调用方传 userId。
// 这样测试读起来会更明确：这个 project 到底属于哪个用户。
export const createFactoryProject = async (input: CreateProjectFactoryInput) => {
  return prisma.project.create({
    data: {
      userId: input.userId,
      name: input.name ?? "Factory Project",
      description: input.description ?? null
    }
  });
};

// createFactoryTodo 直接创建属于某个 project 的 Todo。
//
// 它适合用在列表、更新、删除这类测试里：
// 这些测试的重点不是“如何创建 todo”，而是“已有 todo 后，接口行为是否正确”。
export const createFactoryTodo = async (input: CreateTodoFactoryInput) => {
  return prisma.todo.create({
    data: {
      projectId: input.projectId,
      title: input.title ?? "Factory Todo",
      description: input.description ?? null,
      completed: input.completed ?? false,
      dueDate: input.dueDate ?? null
    }
  });
};
```

这里故意写了比较详细的注释。

测试 helper 的注释不是为了装饰，而是为了提醒你：

```text
什么时候应该走 API 准备数据，什么时候可以直接走 Prisma 准备数据。
```

---

## 任务 3：写一个最小单元测试验证 factory

创建文件：

```text
apps/api/tests/unit/test-data-factory.test.ts
```

写入：

```ts
import { describe, expect, it, beforeEach } from "vitest";
import { clearDatabase } from "../helpers/api-test-helpers.js";
import {
  createFactoryProject,
  createFactoryTodo,
  createFactoryUser
} from "../helpers/test-data-factory.js";

describe("测试数据工厂", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it("可以创建用户、项目和待办数据", async () => {
    const user = await createFactoryUser();
    const project = await createFactoryProject({ userId: user.id });
    const todo = await createFactoryTodo({ projectId: project.id });

    expect(user.email).toContain("factory-user-");
    expect(project.userId).toBe(user.id);
    expect(todo.projectId).toBe(project.id);
    expect(todo.completed).toBe(false);
  });
});
```

这里测试描述继续用中文。

这个测试不是为了测 Prisma 本身，而是确认：

```text
factory 可以正确串起 User -> Project -> Todo 的关系。
```

---

## 任务 4：运行这个测试

运行：

```bash
npm run test -w @learn/api -- tests/unit/test-data-factory.test.ts
```

如果通过，继续下一步。

如果失败，优先看：

```text
是不是 import 路径写错？
是不是 clearDatabase 清理顺序导致外键冲突？
是不是 Prisma model 字段名写错？
```

---

## 任务 5：用 factory 改造一个已有测试

打开：

```text
apps/api/tests/integration/todos.test.ts
```

挑一个你觉得准备数据比较啰嗦的测试。

只改一个测试就好。

目标是把类似：

```text
先创建 user
再创建 project
再创建 todo
再测接口
```

这类准备逻辑改成：

```ts
const user = await createFactoryUser();
const project = await createFactoryProject({ userId: user.id });
const todo = await createFactoryTodo({ projectId: project.id });
```

注意：

```text
如果这个测试本身就是为了验证“创建 Todo 接口”，不要用 createFactoryTodo 直接创建 Todo。
```

因为那样会绕过你真正要测试的接口。

---

## 任务 6：运行验证

先跑你新增的 factory 测试：

```bash
npm run test -w @learn/api -- tests/unit/test-data-factory.test.ts
```

再跑被你改过的 todos 测试：

```bash
npm run test -w @learn/api -- tests/integration/todos.test.ts
```

最后跑类型检查和格式检查：

```bash
npm run typecheck -w @learn/api
npm run format:check
```

如果格式检查不通过：

```bash
npm run format
npm run format:check
```

---

## 完成标准

- [ ] 新增 `apps/api/tests/helpers/test-data-factory.ts`
- [ ] 新增 `apps/api/tests/unit/test-data-factory.test.ts`
- [ ] 测试描述使用中文
- [ ] factory 注释足够清楚，能解释为什么直接用 Prisma 准备数据
- [ ] 至少改造一个已有 todos integration test 使用 factory
- [ ] `npm run test -w @learn/api -- tests/unit/test-data-factory.test.ts` 通过
- [ ] `npm run test -w @learn/api -- tests/integration/todos.test.ts` 通过
- [ ] `npm run typecheck -w @learn/api` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
测试数据工厂完成了
```
