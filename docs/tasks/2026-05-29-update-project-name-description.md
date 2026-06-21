# Task: Update Project Name And Description

## 目标

现在 Project 已经支持：

```text
POST /projects
GET /projects
GET /projects/:id
DELETE /projects/:id
```

这一张任务新增：

```text
PATCH /projects/:id
```

用来更新当前用户自己的 Project：

```json
{
  "name": "Backend Deep Dive",
  "description": "Prisma, auth, tests"
}
```

你要练的是：

- 给 shared package 增加 `UpdateProjectInput`。
- 给 Project 增加 PATCH 专用 Zod schema。
- repository 新增 `update(id, input)`。
- service 继续做权限判断：只能更新自己的 Project。
- route 返回统一响应：`{ success: true, data: project }`。
- 补 repository / service / integration 测试。

---

## Step 1: 更新 shared 类型

打开：

```text
packages/shared/src/index.ts
```

在 `CreateProjectInput` 后面新增：

```ts
// UpdateProjectInput 表示“更新 Project 时客户端可以传什么”。
//
// PATCH 是局部更新：
// - 只传 name：只更新项目名
// - 只传 description：只更新描述
// - 没传的字段保持原值
//
// id / userId / createdAt / updatedAt 仍然由服务端控制，不允许客户端传。
export type UpdateProjectInput = {
  name?: string;
  description?: string;
};
```

---

## Step 2: 更新 Project schema

打开：

```text
apps/api/src/modules/projects/projects.schema.ts
```

新增：

```ts
export const updateProjectSchema = z.object({
  // name 是可选字段，但只要传了，就不能是空字符串。
  //
  // .trim() 会把 "  New name  " 变成 "New name"。
  // .min(1) 会拒绝 "   " 这种只有空格的输入。
  name: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(100, "Project name must be 100 characters or less")
    .optional(),

  // 这张任务先保持 description 和 createProjectSchema 一致：
  // - 不传：保持原值
  // - 传字符串：更新描述
  //
  // 暂时不支持 description=null 清空描述。
  description: z.string().trim().max(1000, "Description must be 1000 characters or less").optional()
});
```

---

## Step 3: 更新 ProjectRepository 接口

打开：

```text
apps/api/src/modules/projects/projects.repository.ts
```

先把类型 import 加上 `UpdateProjectInput`：

```ts
import type {
  CreateProjectInput,
  CreateProjectWithTodosInput,
  ListSortBy,
  PaginatedResult,
  Project,
  ProjectWithTodos,
  SortOrder,
  UpdateProjectInput
} from "@learn/shared";
```

然后在 `ProjectRepository` 里新增：

```ts
// 更新 Project。
//
// repository 只负责按 id 更新数据。
// “这个 Project 是否属于当前用户”的权限判断仍然放在 service 层。
update(id: string, input: UpdateProjectInput): Promise<Project | null>;
```

---

## Step 4: 实现 Prisma update

打开：

```text
apps/api/src/modules/projects/projects.prisma-repository.ts
```

先把类型 import 加上 `UpdateProjectInput`。

然后在 repository 对象里新增：

```ts
async update(id: string, input: UpdateProjectInput): Promise<Project | null> {
  // Prisma update 在找不到记录时会抛异常。
  //
  // 我们当前 repository 约定是：
  // - 找得到：返回 Project
  // - 找不到：返回 null
  //
  // 所以这里先 findUnique，再 update。
  const project = await prisma.project.findUnique({ where: { id } });

  if (!project) {
    return null;
  }

  const updatedProject = await prisma.project.update({
    where: { id },
    data: input
  });

  return mapPrismaProjectToProject(updatedProject);
}
```

---

## Step 5: 更新 Project service

打开：

```text
apps/api/src/modules/projects/projects.service.ts
```

先把类型 import 加上 `UpdateProjectInput`。

然后新增：

```ts
async updateProject(id: string, input: UpdateProjectInput, currentUserId: string) {
  // 更新前先查 Project，是为了做权限判断。
  //
  // repository 不知道当前登录用户是谁，所以不能把归属校验放在 repository。
  const project = await projectRepository.findById(id);

  if (!project || project.userId !== currentUserId) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project was not found");
  }

  const updatedProject = await projectRepository.update(id, input);

  if (!updatedProject) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project was not found");
  }

  return updatedProject;
}
```

这里仍然用 404，而不是 403：

```text
不存在的 Project 和不属于你的 Project，都返回 PROJECT_NOT_FOUND。
```

这样不会泄露“这个 id 是否真实存在”。

---

## Step 6: 更新 Project routes

打开：

```text
apps/api/src/modules/projects/projects.routes.ts
```

先把 schema import 加上 `updateProjectSchema`。

然后在 `GET /:id` 和 `DELETE /:id` 附近新增：

```ts
projectsRouter.patch(
  "/:id",
  asyncHandler(async (request, response) => {
    try {
      const input = updateProjectSchema.parse(request.body);
      const project = await projectService.updateProject(
        request.params.id as string,
        input,
        request.user!.id
      );

      response.json({ success: true, data: project });
    } catch (error) {
      mapZodErrorToAppError(error, "body");
    }
  })
);
```

---

## Step 7: 补 repository 测试

打开：

```text
apps/api/tests/unit/projects.prisma-repository.test.ts
```

新增：

```ts
it("更新 project 的 name 和 description", async () => {
  const repository = createPrismaProjectRepository();
  const owner = await createTestUser("project-update-owner@example.com");

  const createdProject = await repository.create(
    {
      name: "Old project",
      description: "Old description"
    },
    owner.id
  );

  const updatedProject = await repository.update(createdProject.id, {
    name: "New project",
    description: "New description"
  });

  expect(updatedProject).toMatchObject({
    id: createdProject.id,
    name: "New project",
    description: "New description",
    userId: owner.id
  });
});
```

再补：

```ts
it("更新不存在的 project 时返回 null", async () => {
  const repository = createPrismaProjectRepository();

  const result = await repository.update("missing-project-id", {
    name: "Should not exist"
  });

  expect(result).toBeNull();
});
```

---

## Step 8: 补 service 测试

打开：

```text
apps/api/tests/unit/projects.service.test.ts
```

你的 fake repository 也要补 `update` 方法。

可以参考：

```ts
async update(id, input) {
  const project = projects.find((item) => item.id === id);

  if (!project) {
    return null;
  }

  const updatedProject: Project = {
    ...project,
    name: input.name ?? project.name,
    description: input.description ?? project.description,
    updatedAt: new Date().toISOString()
  };

  projects = projects.map((item) => (item.id === id ? updatedProject : item));

  return updatedProject;
}
```

新增测试：

```ts
it("当前用户可以更新自己的 Project", async () => {
  const repository = createFakeProjectRepository();
  const service = createProjectService(repository);

  const createdProject = await service.createProject({ name: "Old project" }, "user-1");

  const updatedProject = await service.updateProject(
    createdProject.id,
    {
      name: "New project",
      description: "New description"
    },
    "user-1"
  );

  expect(updatedProject).toMatchObject({
    id: createdProject.id,
    name: "New project",
    description: "New description",
    userId: "user-1"
  });
});
```

再补一个权限测试：

```ts
it("不能更新别人的 Project", async () => {
  const repository = createFakeProjectRepository();
  const service = createProjectService(repository);

  const createdProject = await service.createProject({ name: "Private project" }, "user-2");

  await expect(
    service.updateProject(
      createdProject.id,
      {
        name: "Hacked project"
      },
      "user-1"
    )
  ).rejects.toMatchObject({
    statusCode: 404,
    code: "PROJECT_NOT_FOUND"
  });
});
```

---

## Step 9: 补 integration API 测试

打开：

```text
apps/api/tests/integration/projects.test.ts
```

新增：

```ts
it("当前用户可以通过 API 更新自己的 Project", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "project-api-update-owner@example.com");
  const project = await createProject(app, auth.token, "Old API project");

  const response = await request(app)
    .patch(`/projects/${project.id}`)
    .set(authHeader(auth.token))
    .send({
      name: "New API project",
      description: "Updated from integration test"
    });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data).toMatchObject({
    id: project.id,
    name: "New API project",
    description: "Updated from integration test",
    userId: auth.user.id
  });
});
```

再补：

```ts
it("拒绝把 project name 更新为空字符串", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "project-api-empty-name@example.com");
  const project = await createProject(app, auth.token, "Valid project");

  const response = await request(app)
    .patch(`/projects/${project.id}`)
    .set(authHeader(auth.token))
    .send({
      name: "   "
    });

  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe("VALIDATION_ERROR");
});
```

再补一个权限测试：

```ts
it("不能通过 API 更新别人的 Project", async () => {
  const app = createApp();
  const owner = await registerAndLogin(app, "project-api-update-owner-a@example.com");
  const anotherUser = await registerAndLogin(app, "project-api-update-owner-b@example.com");
  const anotherProject = await createProject(app, anotherUser.token, "Private API project");

  const response = await request(app)
    .patch(`/projects/${anotherProject.id}`)
    .set(authHeader(owner.token))
    .send({
      name: "Should not update"
    });

  expect(response.status).toBe(404);
  expect(response.body.error.code).toBe("PROJECT_NOT_FOUND");

  const savedProject = await prisma.project.findUnique({
    where: { id: anotherProject.id }
  });

  expect(savedProject?.name).toBe("Private API project");
});
```

---

## Step 10: 自己跑测试

先跑这组：

```bash
npm run test -w @learn/api -- tests/unit/projects.prisma-repository.test.ts tests/unit/projects.service.test.ts tests/integration/projects.test.ts
```

再跑：

```bash
npm run typecheck
npm run format:check
```

如果都通过，再跑完整测试：

```bash
npm run test
```

---

## 完成后你告诉我

你完成后直接发：

```text
Project 更新完成了
```

我会帮你：

- 看实现有没有权限边界问题。
- 补更详细的中文注释。
- 跑 focused tests / typecheck / format / build / smoke。
- 更新任务索引。
- 给你下一张任务卡。
