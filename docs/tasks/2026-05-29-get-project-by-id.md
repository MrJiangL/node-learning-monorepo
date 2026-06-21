# Task: Get Project By Id

## 目标

现在 Project 已经有：

```text
POST /projects
GET /projects
POST /projects/with-todos
```

这一张任务新增详情接口：

```text
GET /projects/:id
```

目标响应：

```json
{
  "success": true,
  "data": {
    "id": "project-id",
    "name": "Node Learning Project",
    "description": null,
    "userId": "current-user-id",
    "createdAt": "2026-05-29T00:00:00.000Z",
    "updatedAt": "2026-05-29T00:00:00.000Z"
  }
}
```

你要练的是：

- route path 参数：`request.params.id`
- service 权限边界：只能查看自己的 Project
- 复用 repository 已有的 `findById(id)`
- 找不到或不属于当前用户时返回 404
- 补 service 单元测试和 API 集成测试

---

## Step 1: 更新 Project service

打开：

```text
apps/api/src/modules/projects/projects.service.ts
```

先导入 `AppError`：

```ts
import { AppError } from "../../errors/app-error.js";
```

在 `createProjectService` 返回对象里新增方法：

```ts
async getProjectById(id: string, currentUserId: string) {
  // findById 只负责“按 id 找 Project”。
  //
  // 它不知道当前登录用户是谁，所以权限判断不能放在 repository。
  // service 拿到 Project 后，再判断 project.userId 是否属于 currentUserId。
  const project = await projectRepository.findById(id);

  if (!project || project.userId !== currentUserId) {
    // 这里故意返回 404，而不是 403。
    //
    // 对调用者来说，“不存在”和“不是你的”都统一表现为找不到。
    // 这样不会泄露别人的 projectId 是否真实存在。
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project was not found");
  }

  return project;
}
```

学习重点：

```text
repository 负责查数据，service 负责业务规则。
```

这里的业务规则是：

```text
当前用户只能查看自己的 Project。
```

---

## Step 2: 更新 Project routes

打开：

```text
apps/api/src/modules/projects/projects.routes.ts
```

新增：

```ts
projectsRouter.get(
  "/:id",
  asyncHandler(async (request, response) => {
    const project = await projectService.getProjectById(
      request.params.id as string,
      request.user!.id
    );

    response.json({ success: true, data: project });
  })
);
```

注意路由顺序。

当前文件里已经有：

```text
POST /projects/with-todos
```

这次新增的是：

```text
GET /projects/:id
```

因为 HTTP method 不同，`GET /:id` 不会抢走 `POST /with-todos`。

但以后如果你新增：

```text
GET /projects/stats
```

就要把 `/stats` 放在 `/:id` 前面。

原因是 Express 从上往下匹配路由，`/:id` 可以匹配很多字符串。

---

## Step 3: 补 service 单元测试

打开：

```text
apps/api/tests/unit/projects.service.test.ts
```

新增测试 1：

```ts
it("当前用户可以查看自己的 Project 详情", async () => {
  const repository = createFakeProjectRepository();
  const service = createProjectService(repository);

  const createdProject = await service.createProject({ name: "Owned project" }, "user-1");

  const project = await service.getProjectById(createdProject.id, "user-1");

  expect(project).toMatchObject({
    id: createdProject.id,
    name: "Owned project",
    userId: "user-1"
  });
});
```

新增测试 2：

```ts
it("不能查看别人的 Project 详情", async () => {
  const repository = createFakeProjectRepository();
  const service = createProjectService(repository);

  const createdProject = await service.createProject({ name: "Private project" }, "user-2");

  await expect(service.getProjectById(createdProject.id, "user-1")).rejects.toMatchObject({
    statusCode: 404,
    code: "PROJECT_NOT_FOUND"
  });
});
```

新增测试 3：

```ts
it("查看不存在的 Project 时返回 PROJECT_NOT_FOUND", async () => {
  const repository = createFakeProjectRepository();
  const service = createProjectService(repository);

  await expect(service.getProjectById("missing-project-id", "user-1")).rejects.toMatchObject({
    statusCode: 404,
    code: "PROJECT_NOT_FOUND"
  });
});
```

这些测试的重点不是 Prisma，而是 service 的权限规则。

---

## Step 4: 补 API 集成测试

打开：

```text
apps/api/tests/integration/projects.test.ts
```

新增测试 1：

```ts
it("当前用户可以查看自己的 Project 详情", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "project-detail-owner@example.com");

  const createResponse = await request(app).post("/projects").set(authHeader(auth.token)).send({
    name: "Project detail",
    description: "Read one project"
  });

  const projectId = createResponse.body.data.id as string;

  const response = await request(app).get(`/projects/${projectId}`).set(authHeader(auth.token));

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data).toMatchObject({
    id: projectId,
    name: "Project detail",
    description: "Read one project",
    userId: auth.user.id
  });
});
```

新增测试 2：

```ts
it("不能查看别人的 Project 详情", async () => {
  const app = createApp();
  const owner = await registerAndLogin(app, "project-detail-owner-a@example.com");
  const anotherUser = await registerAndLogin(app, "project-detail-owner-b@example.com");

  const createResponse = await request(app)
    .post("/projects")
    .set(authHeader(anotherUser.token))
    .send({ name: "Another user's private project" });

  const projectId = createResponse.body.data.id as string;

  const response = await request(app).get(`/projects/${projectId}`).set(authHeader(owner.token));

  expect(response.status).toBe(404);
  expect(response.body.error.code).toBe("PROJECT_NOT_FOUND");
});
```

新增测试 3：

```ts
it("查看不存在的 Project 详情时返回 404", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "project-detail-missing@example.com");

  const response = await request(app)
    .get("/projects/missing-project-id")
    .set(authHeader(auth.token));

  expect(response.status).toBe(404);
  expect(response.body.error.code).toBe("PROJECT_NOT_FOUND");
});
```

---

## Step 5: 自己先跑这些命令

先跑 Project 相关测试：

```bash
npm run typecheck
npm run test -w @learn/api -- tests/unit/projects.service.test.ts tests/integration/projects.test.ts
npm run format:check
```

如果都通过，再跑全量：

```bash
npm run test
npm run build
```

---

## 完成后告诉我

你完成后直接说：

```text
Project 详情接口完成了
```

然后我会帮你：

- 看权限边界有没有漏。
- 补详细中文注释。
- 跑类型检查、测试、格式检查、构建和 smoke。
- 更新任务索引。
- 给下一张任务卡。
