# Task: Project Create And List API

## 目标

上一张任务你已经完成了 Project repository：

```text
ProjectRepository -> Prisma -> MySQL
```

这一张任务把它接到 HTTP API 上：

```text
POST /projects
GET /projects
```

你要练的是：

- 用 Zod 校验创建 Project 的请求体。
- 写 Project service，把“当前用户 id”传给 repository。
- 写 Express router，并用 `requireAuth` 保护接口。
- 在 `app.ts` 里挂载 `/projects` 路由。
- 写最小 integration test，证明用户只能看到自己的项目。

---

## Step 1: 创建 Project schema

创建：

```text
apps/api/src/modules/projects/projects.schema.ts
```

写：

```ts
import { z } from "zod";

// 创建 Project 时，客户端只能提交 name / description。
//
// userId 不允许出现在 body 里，因为项目归属必须来自当前登录用户。
// 也就是说：谁带着 token 请求 POST /projects，这个项目就属于谁。
export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(100, "Project name must be 100 characters or less"),

  description: z.string().trim().max(1000, "Description must be 1000 characters or less").optional()
});
```

---

## Step 2: 创建 Project service

创建：

```text
apps/api/src/modules/projects/projects.service.ts
```

写：

```ts
import type { CreateProjectInput } from "@learn/shared";
import type { ProjectRepository } from "./projects.repository.js";

// Service 是业务逻辑层。
//
// 现在逻辑还不复杂，但我们仍然保留这一层：
// - route 负责 HTTP：读 request、写 response
// - service 负责业务：当前用户能做什么
// - repository 负责数据：怎么查 MySQL
export function createProjectService(projectRepository: ProjectRepository) {
  return {
    createProject(input: CreateProjectInput, currentUserId: string) {
      // currentUserId 来自 requireAuth。
      //
      // 注意这里不要从 input 里拿 userId。
      // input 是用户提交的内容，currentUserId 是服务端验证 token 后得到的身份。
      return projectRepository.create(input, currentUserId);
    },

    listProjects(currentUserId: string) {
      // 列表接口只返回当前用户自己的 Project。
      //
      // 这条规则不要交给前端控制：
      // 前端传什么 query 都不应该决定能看到谁的数据。
      return projectRepository.findAllByUserId(currentUserId);
    }
  };
}
```

---

## Step 3: 创建 Project router

创建：

```text
apps/api/src/modules/projects/projects.routes.ts
```

参考这个骨架实现：

```ts
import { Router } from "express";
import { ZodError } from "zod";
import { AppError } from "../../errors/app-error.js";
import { asyncHandler } from "../../http/async-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { createPrismaProjectRepository } from "./projects.prisma-repository.js";
import { createProjectSchema } from "./projects.schema.js";
import { createProjectService } from "./projects.service.js";

export function createProjectsRouter() {
  const projectsRouter = Router();
  const projectService = createProjectService(createPrismaProjectRepository());

  // /projects 是登录后才能访问的资源。
  //
  // 这里 use(requireAuth) 会保护下面所有子路由：
  // - GET /projects
  // - POST /projects
  projectsRouter.use(requireAuth);

  projectsRouter.get(
    "/",
    asyncHandler(async (request, response) => {
      // requireAuth 成功后，request.user 一定存在。
      // 这里用 request.user!.id，把当前用户 id 交给 service。
      const projects = await projectService.listProjects(request.user!.id);

      response.json({ success: true, data: projects });
    })
  );

  projectsRouter.post(
    "/",
    asyncHandler(async (request, response) => {
      try {
        // body 是外部输入，必须先过 Zod。
        // parse 成功后，input 才是我们愿意交给 service 的数据。
        const input = createProjectSchema.parse(request.body);

        const project = await projectService.createProject(input, request.user!.id);

        response.status(201).json({ success: true, data: project });
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

  return projectsRouter;
}
```

---

## Step 4: 在 app.ts 挂载路由

打开：

```text
apps/api/src/app.ts
```

导入：

```ts
import { createProjectsRouter } from "./modules/projects/projects.routes.js";
```

然后在 `/plans` 附近加：

```ts
app.use("/projects", createProjectsRouter());
```

建议放在：

```ts
app.use("/plans", createPlansRouter());
app.use("/projects", createProjectsRouter());
app.use("/auth", createAuthRouter());
```

---

## Step 5: 写 integration test

创建：

```text
apps/api/tests/integration/projects.test.ts
```

这次你先照着写，不用自己从零想。

```ts
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";

async function registerAndLogin(app: ReturnType<typeof createApp>, email: string) {
  // 这里走真实注册和登录流程，拿到真实 JWT。
  //
  // 这样 Project API 测试会覆盖完整路径：
  // auth/register -> auth/login -> requireAuth -> projects route
  await request(app).post("/auth/register").send({
    email,
    password: "password123",
    name: "Project Owner"
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

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe("projects API", () => {
  beforeEach(async () => {
    // 清理顺序仍然从子表到父表。
    //
    // 当前测试只创建 Project，但 Todo 以后会依赖 Project。
    // 这里先清 Todo，可以让这个测试在未来加 Todo 数据后仍然稳定。
    await prisma.todo.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
  });

  it("rejects listing projects without authentication", async () => {
    const app = createApp();

    const response = await request(app).get("/projects");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("creates and lists projects for the current user", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "projects-owner@example.com");

    const createResponse = await request(app).post("/projects").set(authHeader(auth.token)).send({
      name: "Node Learning Project",
      description: "Build project and todo APIs"
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data).toMatchObject({
      name: "Node Learning Project",
      description: "Build project and todo APIs",
      userId: auth.user.id
    });

    const listResponse = await request(app).get("/projects").set(authHeader(auth.token));

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data.map((project: { name: string }) => project.name)).toEqual([
      "Node Learning Project"
    ]);
  });

  it("does not list another user's projects", async () => {
    const app = createApp();
    const owner = await registerAndLogin(app, "project-owner-a@example.com");
    const anotherUser = await registerAndLogin(app, "project-owner-b@example.com");

    await request(app)
      .post("/projects")
      .set(authHeader(owner.token))
      .send({ name: "Owner project" });

    await request(app)
      .post("/projects")
      .set(authHeader(anotherUser.token))
      .send({ name: "Another user project" });

    const response = await request(app).get("/projects").set(authHeader(owner.token));

    expect(response.status).toBe(200);
    expect(response.body.data.map((project: { name: string }) => project.name)).toEqual([
      "Owner project"
    ]);
    expect(
      response.body.data.every((project: { userId: string }) => project.userId === owner.user.id)
    ).toBe(true);
  });

  it("rejects invalid project input for an authenticated user", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "project-invalid@example.com");

    const response = await request(app)
      .post("/projects")
      .set(authHeader(auth.token))
      .send({ name: "" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
```

---

## Step 6: 跑测试

先跑新的 integration test：

```bash
npm run test -w @learn/api -- tests/integration/projects.test.ts
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
Project API 完成了
```

我会帮你检查：

- `/projects` 是否必须登录。
- `POST /projects` 是否把项目归属到当前用户。
- `GET /projects` 是否只返回当前用户自己的项目。
- 测试是否真的覆盖了“不能看到别人的项目”。
- 是否需要补更细的中文注释。
