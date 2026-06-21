# Task: Extract API Test Helpers

## 目标

下一阶段我帮你选：

```text
A. 继续后端工程化
```

但我们不空谈工程化，先做一个马上能提升你开发体验的任务：

```text
抽取 API 集成测试 helper
```

你现在的集成测试里重复写了很多：

- `registerAndLogin`
- `authHeader`
- `createProject`
- `createTodo`
- 清理数据库

这会让你每次写测试时很累，因为你脑子里既要想“业务行为”，又要想“怎么准备登录用户和测试数据”。

这张任务的目标是：把重复的测试准备代码抽到一个 helper 文件里，让测试更像业务描述。

---

## Step 1: 新建测试 helper 文件

创建：

```text
apps/api/tests/helpers/api-test-helpers.ts
```

写入：

```ts
import request from "supertest";
import type { createApp } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";

type TestApp = ReturnType<typeof createApp>;

export type TestAuth = {
  token: string;
  user: {
    id: string;
    email: string;
  };
};

export async function cleanupDatabase() {
  // 清理顺序要从子表到父表。
  //
  // Todo 依赖 Project，Project 依赖 User。
  // 如果先删 User，数据库可能会因为外键关系报错，或者依赖级联行为。
  await prisma.todo.deleteMany();
  await prisma.project.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.user.deleteMany();
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function registerAndLogin(
  app: TestApp,
  email: string,
  name = "Test User"
): Promise<TestAuth> {
  // 这里走真实注册和登录流程。
  //
  // 这样集成测试覆盖的是完整链路：
  // auth/register -> auth/login -> requireAuth -> 业务 route
  await request(app).post("/auth/register").send({
    email,
    password: "password123",
    name
  });

  const loginResponse = await request(app).post("/auth/login").send({
    email,
    password: "password123"
  });

  return {
    token: loginResponse.body.data.token as string,
    user: loginResponse.body.data.user as { id: string; email: string }
  };
}

export async function createProject(app: TestApp, token: string, name: string) {
  const response = await request(app).post("/projects").set(authHeader(token)).send({ name });

  return response.body.data as {
    id: string;
    name: string;
    userId: string;
  };
}

export async function createTodo(
  app: TestApp,
  token: string,
  projectId: string,
  title: string,
  input: { dueDate?: string } = {}
) {
  const response = await request(app)
    .post(`/projects/${projectId}/todos`)
    .set(authHeader(token))
    .send({ title, ...input });

  return response.body.data as {
    id: string;
    title: string;
    completed: boolean;
    projectId: string;
  };
}
```

---

## Step 2: 先只改 todos 集成测试

修改：

```text
apps/api/tests/integration/todos.test.ts
```

把文件顶部这些本地 helper 删除：

```ts
async function registerAndLogin(...)
function authHeader(...)
async function createProject(...)
async function createTodo(...)
```

然后改成从 helper 文件导入：

```ts
import {
  authHeader,
  cleanupDatabase,
  createProject,
  createTodo,
  registerAndLogin
} from "../helpers/api-test-helpers.js";
```

再把 `beforeEach` 改成：

```ts
beforeEach(async () => {
  await cleanupDatabase();
});
```

注意：这张任务先只改 `todos.test.ts`，不要一口气改所有测试。

---

## Step 3: 跑 todos 集成测试

运行：

```bash
npm run test -w @learn/api -- tests/integration/todos.test.ts
```

你要看到：

```text
tests/integration/todos.test.ts passed
```

如果 import 路径错了，优先检查：

```text
../helpers/api-test-helpers.js
```

因为 `todos.test.ts` 在：

```text
apps/api/tests/integration/
```

helper 在：

```text
apps/api/tests/helpers/
```

所以相对路径是：

```text
../helpers/api-test-helpers.js
```

---

## Step 4: 完成后的口令

完成后告诉我：

```text
API 测试 helper 抽取完成了
```

我会帮你：

1. 跑 todos 集成测试。
2. 跑类型检查、格式检查、构建和完整测试。
3. 看 helper 抽象有没有过度。
4. 给 helper 补详细中文注释。
5. 再决定是否继续抽 `projects.test.ts` 和 `plans.test.ts`。
