# Task: Prisma Transaction Rollback Practice

## 目标

这一张继续：

```text
Prisma + Zod + 测试设计强化
```

里的第三块：**Prisma transaction 强化**。

你之前已经写过：

```ts
prisma.$transaction(async (tx) => {
  // create project
  // create todos
});
```

但 transaction 最重要的不是“把代码包起来”，而是理解：

```text
多步写入要么全部成功，要么全部失败。
```

这张任务会让你写一个练习函数：

```ts
createProjectWithTodosOrRollback(input, userId);
```

它会：

1. 创建 Project。
2. 创建多个 Todo。
3. 如果某个 Todo 的 title 是 `"ROLLBACK"`，主动抛错。
4. 测试要证明：抛错后 Project 和前面已经创建的 Todo 都不会留在数据库里。

这不是正式业务需求，是为了让你亲手看到 transaction 的回滚效果。

---

## Step 1: 新建 transaction 练习文件

创建：

```text
apps/api/src/exercises/prisma-transaction-practice.ts
```

写入这个骨架：

```ts
import type { ProjectWithTodos } from "@learn/shared";
import { prisma } from "../db/prisma.js";
import { mapPrismaProjectToProject } from "../modules/projects/projects.mapper.js";
import { mapPrismaTodoToTodo } from "../modules/todos/todos.mapper.js";

export type TransactionTodoInput = {
  title: string;
};

export type TransactionProjectInput = {
  name: string;
  todos: TransactionTodoInput[];
};

export async function createProjectWithTodosOrRollback(
  input: TransactionProjectInput,
  userId: string
): Promise<ProjectWithTodos> {
  const result = await prisma.$transaction(async (tx) => {
    // TODO: 第一步，使用 tx.project.create 创建 Project。
    //
    // 注意：
    // - 必须使用 tx.project.create
    // - 不要使用 prisma.project.create
    //
    // 原因：
    // tx 是这次 transaction 里的 Prisma client。
    // 只有使用 tx 发出的数据库写入，才属于同一个 transaction。
    const project = null;

    // TODO: 第二步，遍历 input.todos，创建 Todo。
    //
    // 要求：
    // - 如果 todo.title === "ROLLBACK"，抛出 Error。
    // - 否则使用 tx.todo.create 创建 Todo。
    // - 每个 Todo 都要关联到 project.id。
    //
    // 这一步故意使用 for...of，先不要用 Promise.all。
    // 这样你更容易看懂“第几个写入成功，第几个写入失败，然后整体回滚”。
    const todos = [];

    return { project, todos };
  });

  return {
    project: mapPrismaProjectToProject(result.project),
    todos: result.todos.map(mapPrismaTodoToTodo)
  };
}
```

这个骨架会有 TypeScript 错误，这是正常的。

你的任务是把 `project = null` 和 `todos = []` 修成真实 transaction 逻辑。

---

## Step 2: 新建测试文件

创建：

```text
apps/api/tests/unit/prisma-transaction-practice.test.ts
```

写入：

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db/prisma.js";
import { createProjectWithTodosOrRollback } from "../../src/exercises/prisma-transaction-practice.js";

async function createTestUser(email: string) {
  return prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email,
      passwordHash: "temporary-test-user",
      name: "Prisma Transaction Practice User"
    }
  });
}

describe("Prisma transaction 回滚练习", () => {
  beforeEach(async () => {
    await prisma.todo.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
  });

  it("所有写入成功时会创建 project 和 todos", async () => {
    const owner = await createTestUser("transaction-success@example.com");

    const result = await createProjectWithTodosOrRollback(
      {
        name: "Transaction success project",
        todos: [{ title: "Todo A" }, { title: "Todo B" }]
      },
      owner.id
    );

    expect(result.project).toMatchObject({
      name: "Transaction success project",
      userId: owner.id
    });
    expect(result.todos.map((todo) => todo.title)).toEqual(["Todo A", "Todo B"]);

    const savedProjects = await prisma.project.findMany({
      where: { userId: owner.id }
    });
    const savedTodos = await prisma.todo.findMany({
      where: { projectId: result.project.id },
      orderBy: { createdAt: "asc" }
    });

    expect(savedProjects).toHaveLength(1);
    expect(savedTodos.map((todo) => todo.title)).toEqual(["Todo A", "Todo B"]);
  });

  it("中途抛错时会回滚 project 和已经创建的 todos", async () => {
    const owner = await createTestUser("transaction-rollback@example.com");

    await expect(
      createProjectWithTodosOrRollback(
        {
          name: "Should rollback project",
          todos: [{ title: "Todo before failure" }, { title: "ROLLBACK" }]
        },
        owner.id
      )
    ).rejects.toThrow("触发 transaction 回滚");

    const savedProjects = await prisma.project.findMany({
      where: { userId: owner.id }
    });
    const savedTodos = await prisma.todo.findMany();

    expect(savedProjects).toEqual([]);
    expect(savedTodos).toEqual([]);
  });
});
```

---

## Step 3: 先跑测试，看失败

运行：

```bash
npm run test -w @learn/api -- tests/unit/prisma-transaction-practice.test.ts
```

第一次失败是正常的。

你要重点看两种失败：

- TypeScript 编译失败：说明骨架还没实现。
- 回滚测试失败：说明你可能用了外层 `prisma`，或者错误没有发生在 `$transaction` 内部。

---

## Step 4: 实现 transaction

你要实现的核心结构大概是这样：

```ts
const result = await prisma.$transaction(async (tx) => {
  const project = await tx.project.create({
    data: {
      id: crypto.randomUUID(),
      name: input.name,
      userId
    }
  });

  const todos = [];

  for (const todo of input.todos) {
    if (todo.title === "ROLLBACK") {
      throw new Error("触发 transaction 回滚");
    }

    const createdTodo = await tx.todo.create({
      data: {
        id: crypto.randomUUID(),
        title: todo.title,
        projectId: project.id
      }
    });

    todos.push(createdTodo);
  }

  return { project, todos };
});
```

### 你要特别注意

transaction 里面必须用：

```ts
tx.project.create();
tx.todo.create();
```

不要用：

```ts
prisma.project.create();
prisma.todo.create();
```

因为外层 `prisma` 不属于当前 transaction。

---

## Step 5: 你完成后的口令

完成后告诉我：

```text
Prisma transaction 回滚练习完成了
```

我会帮你：

1. 跑这张任务的测试。
2. 跑类型检查、格式检查、构建和完整测试。
3. 看你有没有把所有写入都放进 `tx`。
4. 补详细中文注释。
5. 继续带你进入测试设计专项。
