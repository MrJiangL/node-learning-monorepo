# Task: Prisma Query Relation Practice

## 目标

这一张进入：

```text
Prisma + Zod + 测试设计强化
```

里的第二块：**Prisma 查询专项**。

你这次先不改正式业务 API，而是继续用 `exercises/` 做一个小练习。

原因是：你现在已经会写一些 `findMany / create / update / delete`，但还需要真正理解 Prisma 查询里的三件事：

- `where`：过滤数据。
- `include`：把关联数据一起查出来。
- relation：理解 `Project -> Todo` 这种一对多关系怎么查。

这张任务会让你写一个函数：

```ts
findProjectTodoSummary(projectId, userId);
```

它要返回某个用户自己的 Project，以及这个 Project 下 Todo 的统计信息。

---

## Step 1: 新建 Prisma 查询练习文件

创建：

```text
apps/api/src/exercises/prisma-query-practice.ts
```

先写这个骨架：

```ts
import type { Project, Todo } from "@learn/shared";
import { prisma } from "../db/prisma.js";
import { mapPrismaProjectToProject } from "../modules/projects/projects.mapper.js";
import { mapPrismaTodoToTodo } from "../modules/todos/todos.mapper.js";

export type ProjectTodoSummary = {
  project: Project;

  // latestTodos 只返回最近创建的 3 条 Todo。
  //
  // 这里不是为了做完整业务，而是为了练 Prisma 的 relation include。
  latestTodos: Todo[];

  stats: {
    total: number;
    completed: number;
    active: number;
  };
};

export async function findProjectTodoSummary(
  projectId: string,
  userId: string
): Promise<ProjectTodoSummary | null> {
  // TODO: 第一步，查 Project。
  //
  // 要求：
  // - 只能查到 id 等于 projectId 的 Project
  // - 只能查到 userId 等于当前用户的 Project
  // - 同时 include 最近 3 条 Todo
  //
  // 提示：
  // prisma.project.findFirst({
  //   where: { id: projectId, userId },
  //   include: {
  //     todos: {
  //       orderBy: { createdAt: "desc" },
  //       take: 3
  //     }
  //   }
  // })
  const project = await prisma.project.findFirst({
    // 这里故意只按 id 查，少了 userId 权限边界。
    // 你要在实现时把 where 改成同时包含 id 和 userId。
    where: { id: projectId },

    // 这里故意把所有 todos 都 include 进来，少了 orderBy 和 take。
    // 你要在实现时改成“只取最近 3 条”。
    include: { todos: true }
  });

  if (!project) {
    return null;
  }

  // TODO: 第二步，统计这个 Project 下 Todo 总数。
  //
  // 提示：
  // prisma.todo.count({ where: { projectId } })
  const totalTodos = 0;

  // TODO: 第三步，统计已完成 Todo 数量。
  //
  // 提示：
  // prisma.todo.count({ where: { projectId, completed: true } })
  const completedTodos = 0;

  return {
    project: mapPrismaProjectToProject(project),
    latestTodos: project.todos.map(mapPrismaTodoToTodo),
    stats: {
      total: totalTodos,
      completed: completedTodos,
      active: totalTodos - completedTodos
    }
  };
}
```

这份骨架可以编译，但查询逻辑是故意不完整的。

你要用测试把这些点改对：

- `where` 里补上 `userId`，避免查到别人的 Project。
- `include.todos` 里补上 `orderBy` 和 `take`。
- `totalTodos / completedTodos` 用 `prisma.todo.count()` 真实统计。

---

## Step 2: 新建测试文件

创建：

```text
apps/api/tests/unit/prisma-query-practice.test.ts
```

写入：

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db/prisma.js";
import { findProjectTodoSummary } from "../../src/exercises/prisma-query-practice.js";

async function createTestUser(email: string) {
  return prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email,
      passwordHash: "temporary-test-user",
      name: "Prisma Query Practice User"
    }
  });
}

describe("Prisma 查询关系练习", () => {
  beforeEach(async () => {
    // 清理顺序从子表到父表。
    //
    // Todo 依赖 Project，Project 依赖 User。
    // 如果先删 User，数据库外键可能会影响测试可读性。
    await prisma.todo.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
  });

  it("只返回当前用户自己的 project 和 todo 统计", async () => {
    const owner = await createTestUser("query-owner@example.com");
    const anotherUser = await createTestUser("query-other@example.com");

    const project = await prisma.project.create({
      data: {
        id: crypto.randomUUID(),
        name: "Owner Project",
        description: "Used by Prisma query practice",
        userId: owner.id
      }
    });

    await prisma.project.create({
      data: {
        id: crypto.randomUUID(),
        name: "Other Project",
        description: "Should not be returned",
        userId: anotherUser.id
      }
    });

    await prisma.todo.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          title: "Old done todo",
          completed: true,
          projectId: project.id,
          createdAt: new Date("2026-01-01T00:00:00.000Z")
        },
        {
          id: crypto.randomUUID(),
          title: "Middle active todo",
          completed: false,
          projectId: project.id,
          createdAt: new Date("2026-01-02T00:00:00.000Z")
        },
        {
          id: crypto.randomUUID(),
          title: "Latest active todo",
          completed: false,
          projectId: project.id,
          createdAt: new Date("2026-01-03T00:00:00.000Z")
        }
      ]
    });

    const result = await findProjectTodoSummary(project.id, owner.id);

    expect(result?.project).toMatchObject({
      id: project.id,
      name: "Owner Project",
      userId: owner.id
    });
    expect(result?.stats).toEqual({
      total: 3,
      completed: 1,
      active: 2
    });
    expect(result?.latestTodos.map((todo) => todo.title)).toEqual([
      "Latest active todo",
      "Middle active todo",
      "Old done todo"
    ]);
  });

  it("查询别人的 project 时返回 null", async () => {
    const owner = await createTestUser("query-owner-null@example.com");
    const anotherUser = await createTestUser("query-other-null@example.com");

    const project = await prisma.project.create({
      data: {
        id: crypto.randomUUID(),
        name: "Private Project",
        userId: owner.id
      }
    });

    const result = await findProjectTodoSummary(project.id, anotherUser.id);

    expect(result).toBeNull();
  });
});
```

---

## Step 3: 先跑测试，看失败

运行：

```bash
npm run test -w @learn/api -- tests/unit/prisma-query-practice.test.ts
```

第一次失败是正常的。

这次你要重点看失败信息：

- 如果 `project` 是 `null`，说明第一步查询还没写对。
- 如果 `stats` 是 `0`，说明 count 查询还没写对。
- 如果 `latestTodos` 顺序不对，说明 `include.todos.orderBy` 没写对。

---

## Step 4: 自己实现 Prisma 查询

### 你要用到的 Prisma 查询点

#### 1. `findFirst`

这里不用 `findUnique`，因为我们要同时按两个条件过滤：

```ts
where: {
  id: (projectId, userId);
}
```

`id` 是唯一字段，但 `id + userId` 是权限边界。

这里的意思是：

```text
只允许查“这个 id 且属于当前用户”的 Project。
```

#### 2. `include`

`Project` 和 `Todo` 在 Prisma schema 里有关系：

```prisma
model Project {
  todos Todo[]
}
```

所以可以：

```ts
include: {
  todos: {
    orderBy: { createdAt: "desc" },
    take: 3
  }
}
```

这表示查 Project 的同时，把最近创建的 3 条 Todo 一起查出来。

#### 3. `count`

统计总数：

```ts
prisma.todo.count({
  where: { projectId }
});
```

统计已完成：

```ts
prisma.todo.count({
  where: {
    projectId,
    completed: true
  }
});
```

---

## Step 5: 你完成后的口令

完成后告诉我：

```text
Prisma 查询关系练习完成了
```

我会帮你：

1. 跑这张任务的测试。
2. 跑类型检查和格式检查。
3. 看你的 Prisma 查询是否符合权限边界。
4. 补详细中文注释。
5. 给下一张 transaction 强化任务卡。
