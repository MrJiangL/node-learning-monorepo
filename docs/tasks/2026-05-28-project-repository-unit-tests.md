# Task: Project Repository And Unit Tests

## 目标

上一张任务已经把数据库模型准备好了：

```text
User -> Project -> Todo
```

这一张任务先不写 HTTP API，只写 `Project` 的数据访问层，也就是 repository。

你要练的是：

- 如何给新模型补共享类型。
- 如何把 Prisma 查询包进 repository。
- 如何用测试数据验证 `Project.userId` 真的生效。
- 如何写“只查当前用户项目”的单元测试。

这张任务完成后，下一步才会写：

```text
POST /projects
GET /projects
```

---

## Step 1: 在 shared 包里补 Project 类型

打开：

```text
packages/shared/src/index.ts
```

在 `Plan` 相关类型附近补：

```ts
// Project 表示系统返回给客户端的一条项目数据。
//
// 这里的 userId 是必填 string，因为 Project 在数据库设计上必须属于某个用户。
// 这和 Plan.userId 不一样：
// - Plan.userId 现在是 string | null，是为了兼容前面学习阶段的历史数据
// - Project.userId 是 string，因为这是新模块，可以从一开始就设计成强归属
export type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
};

// CreateProjectInput 表示“创建项目时客户端可以传什么”。
//
// 不要让客户端传 id / userId / createdAt / updatedAt：
// - id 由服务端生成
// - userId 来自当前登录用户
// - createdAt / updatedAt 由数据库生成
export type CreateProjectInput = {
  name: string;
  description?: string;
};
```

注意：这一步先不加 `UpdateProjectInput`。我们当前只做创建、列表、按 id 查询，少加一点范围，你会更稳。

---

## Step 2: 创建 projects 模块目录

创建目录：

```text
apps/api/src/modules/projects
```

然后创建 3 个文件：

```text
apps/api/src/modules/projects/projects.repository.ts
apps/api/src/modules/projects/projects.mapper.ts
apps/api/src/modules/projects/projects.prisma-repository.ts
```

---

## Step 3: 定义 ProjectRepository 接口

在：

```text
apps/api/src/modules/projects/projects.repository.ts
```

写：

```ts
import type { CreateProjectInput, Project } from "@learn/shared";

// Repository 是“数据访问层”的接口。
//
// 上层 service 只依赖这个接口，不直接依赖 Prisma。
// 好处是：以后如果数据库实现要换，service 不需要大改。
export type ProjectRepository = {
  // 创建项目时必须传 userId。
  //
  // 这个 userId 后面会来自 requireAuth 解析出的当前登录用户，
  // 不能来自 request.body，否则用户可以伪造“给别人创建项目”。
  create(input: CreateProjectInput, userId: string): Promise<Project>;

  // 查询某个用户自己的全部项目。
  //
  // 这里故意把 userId 设计成必填参数，因为 Project 是强归属资源。
  // 未来 GET /projects 只应该返回当前登录用户自己的项目。
  findAllByUserId(userId: string): Promise<Project[]>;

  // 按项目 id 查询一条项目。
  //
  // 这一层先只负责“按 id 找数据”。
  // 至于“这个项目是不是属于当前用户”，下一张 service/API 任务再处理。
  findById(id: string): Promise<Project | null>;
};
```

---

## Step 4: 写 Prisma 到共享类型的 mapper

在：

```text
apps/api/src/modules/projects/projects.mapper.ts
```

写一个函数：

```ts
import type { Project } from "@learn/shared";
import type { PrismaProject } from "./projects.prisma-repository.js";

// Prisma 从数据库拿出来的 Date 是 Date 对象。
// 但 HTTP API 返回 JSON 时，Date 会变成字符串。
//
// 所以 repository 在返回 shared 类型前，统一把 Date 转成 ISO string。
// 这样 route/service/test 看到的 Project 形状会更稳定。
export function mapPrismaProjectToProject(project: PrismaProject): Project {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    userId: project.userId
  };
}
```

这里用了一个 `PrismaProject` 类型，下一步你会在 Prisma repository 文件里导出它。

---

## Step 5: 写 Prisma Project Repository

在：

```text
apps/api/src/modules/projects/projects.prisma-repository.ts
```

先写结构：

```ts
import type { Project as PrismaProjectModel } from "@prisma/client";
import type { CreateProjectInput, Project } from "@learn/shared";
import { prisma } from "../../db/prisma.js";
import { mapPrismaProjectToProject } from "./projects.mapper.js";
import type { ProjectRepository } from "./projects.repository.js";

// 给 mapper 使用的 Prisma Project 类型。
//
// 这里先直接等于 @prisma/client 生成的 Project model 类型。
// 单独 export 一个别名，是为了以后如果 include 了额外关系，
// 只需要改这里，不用到处改 mapper 的参数类型。
export type PrismaProject = PrismaProjectModel;

export function createPrismaProjectRepository(): ProjectRepository {
  return {
    async create(input: CreateProjectInput, userId: string): Promise<Project> {
      // TODO: 用 prisma.project.create 创建项目。
      //
      // 提示：
      // - id 用 crypto.randomUUID()
      // - name 来自 input.name
      // - description 没传时存 null
      // - userId 使用参数 userId，不要从 input 里取
      //
      // const project = await prisma.project.create({ ... });
      // return mapPrismaProjectToProject(project);
    },

    async findAllByUserId(userId: string): Promise<Project[]> {
      // TODO: 用 prisma.project.findMany 查询当前用户的项目。
      //
      // 提示：
      // - where: { userId }
      // - orderBy: { createdAt: "asc" }
      // - 最后用 .map(mapPrismaProjectToProject)
    },

    async findById(id: string): Promise<Project | null> {
      // TODO: 用 prisma.project.findUnique 按 id 查询。
      //
      // 找不到时返回 null。
      // 找到时通过 mapper 转成 shared Project 类型。
    }
  };
}
```

你要把 TODO 全部补完。

---

## Step 6: 写 repository 单元测试

创建：

```text
apps/api/tests/unit/projects.prisma-repository.test.ts
```

测试文件可以先写这个骨架：

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db/prisma.js";
import { createPrismaProjectRepository } from "../../src/modules/projects/projects.prisma-repository.js";

async function createTestUser(email: string) {
  // repository 单元测试不走 /auth/register。
  //
  // 我们直接用 Prisma 创建用户，是为了让测试聚焦在 ProjectRepository，
  // 不被 auth 路由、密码哈希、JWT 这些其他模块影响。
  return prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email,
      passwordHash: "temporary-test-user",
      name: "Project Repository Test User"
    }
  });
}

describe("prisma project repository", () => {
  beforeEach(async () => {
    // 清理顺序要从“子表”到“父表”。
    //
    // Todo 依赖 Project，Project 依赖 User。
    // 所以如果将来测试里创建了 Todo，先删 Todo 会更安全。
    await prisma.todo.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
  });

  it("creates a project for the provided user", async () => {
    const repository = createPrismaProjectRepository();
    const owner = await createTestUser("project-owner@example.com");

    // TODO: 调用 repository.create() 创建项目。
    //
    // 然后用 prisma.project.findUnique({ include: { user: true } })
    // 验证这个项目真的关联到了 owner。
  });

  it("lists only projects owned by the provided user", async () => {
    const repository = createPrismaProjectRepository();
    const owner = await createTestUser("project-list-owner@example.com");
    const anotherUser = await createTestUser("project-list-other@example.com");

    // TODO: 给 owner 创建一个项目。
    // TODO: 给 anotherUser 创建一个项目。
    //
    // 调用 repository.findAllByUserId(owner.id)。
    // 断言结果里只有 owner 的项目，没有 anotherUser 的项目。
  });

  it("finds a project by id", async () => {
    const repository = createPrismaProjectRepository();
    const owner = await createTestUser("project-find-owner@example.com");

    // TODO: 先创建项目，再用 findById(createdProject.id) 查询。
    //
    // 断言 foundProject 至少包含：
    // - id
    // - name
    // - userId
  });

  it("returns null when finding a missing project", async () => {
    const repository = createPrismaProjectRepository();

    // TODO: 调用 findById("missing-project-id")。
    // 断言结果是 null。
  });
});
```

---

## Step 7: 运行测试

先只跑你新增的测试：

```bash
npm run test -w @learn/api -- tests/unit/projects.prisma-repository.test.ts
```

如果通过，再跑全量：

```bash
npm run test
npm run typecheck
npm run format:check
npm run build
```

---

## 验收标准

你完成后告诉我：

```text
Project repository 完成了
```

我会帮你做：

- 检查 repository 是否真的按 `userId` 查询。
- 检查测试有没有覆盖“不能看到别人的项目”。
- 跑测试、类型检查、格式检查、构建。
- 必要时补更详细的中文注释。
- 更新任务索引。
- 给你下一张 `Project API：创建和列表` 任务卡。
