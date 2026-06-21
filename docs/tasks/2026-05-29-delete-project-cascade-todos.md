# Task: Delete Project And Cascade Todos

## 目标

现在 Project 已经支持：

```text
POST /projects
GET /projects
GET /projects/:id
POST /projects/with-todos
```

这一张任务新增删除接口：

```text
DELETE /projects/:id
```

删除 Project 时，要处理它下面的 Todos。

我们这张任务采用显式删除：

```text
先删 Todo，再删 Project。
```

你要练的是：

- service 权限边界：只能删除自己的 Project。
- Prisma transaction：删除 Project 和它的 Todos 要么一起成功，要么一起失败。
- repository 新增 `delete(id)`。
- API 返回 `204 No Content`。
- 补 repository / service / integration 测试。

---

## Step 1: 更新 ProjectRepository 接口

打开：

```text
apps/api/src/modules/projects/projects.repository.ts
```

给 `ProjectRepository` 增加：

```ts
// 删除 Project。
//
// repository 只负责按 id 删除，不判断这个 Project 属于谁。
// 权限判断放在 service 层。
delete(id: string): Promise<Project | null>;
```

说明：

```text
返回 Project | null 是为了和 update/findById 风格一致：
找不到时返回 null。
```

---

## Step 2: 实现 Prisma delete

打开：

```text
apps/api/src/modules/projects/projects.prisma-repository.ts
```

在 repository 对象里新增：

```ts
async delete(id: string): Promise<Project | null> {
  const project = await prisma.project.findUnique({ where: { id } });

  if (!project) {
    return null;
  }

  const deletedProject = await prisma.$transaction(async (tx) => {
    // Todo 依赖 Project。
    //
    // 如果数据库 schema 还没有配置 onDelete: Cascade，
    // 直接删 Project 可能会因为外键约束失败。
    // 所以这里先显式删除这个 Project 下的 Todos。
    await tx.todo.deleteMany({
      where: { projectId: id }
    });

    return tx.project.delete({
      where: { id }
    });
  });

  return mapPrismaProjectToProject(deletedProject);
}
```

学习重点：

```text
为什么用 transaction？
```

因为删除包含两个数据库动作：

```text
1. deleteMany todos
2. delete project
```

如果第 1 步成功、第 2 步失败，数据会进入尴尬状态：Todos 没了，Project 还在。

transaction 可以保证它们要么一起成功，要么一起回滚。

---

## Step 3: 更新 Project service

打开：

```text
apps/api/src/modules/projects/projects.service.ts
```

新增：

```ts
async deleteProject(id: string, currentUserId: string) {
  // 删除前先查一次 Project。
  //
  // 这一步不是为了删除，而是为了做权限判断：
  // 当前用户只能删除自己的 Project。
  const project = await projectRepository.findById(id);

  if (!project || project.userId !== currentUserId) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project was not found");
  }

  const deletedProject = await projectRepository.delete(id);

  if (!deletedProject) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project was not found");
  }

  return deletedProject;
}
```

注意：

```text
不属于当前用户时仍然返回 404。
```

这样不会泄露“这个 id 是否存在但属于别人”。

---

## Step 4: 更新 Project routes

打开：

```text
apps/api/src/modules/projects/projects.routes.ts
```

新增：

```ts
projectsRouter.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    await projectService.deleteProject(request.params.id as string, request.user!.id);

    response.status(204).send();
  })
);
```

学习重点：

```text
204 响应不应该有 JSON body。
```

所以这里用：

```ts
response.status(204).send();
```

而不是：

```ts
response.json({ success: true });
```

---

## Step 5: 补 repository 测试

打开：

```text
apps/api/tests/unit/projects.prisma-repository.test.ts
```

新增测试：

```ts
it("删除 Project 时同时删除它下面的 todos", async () => {
  const repository = createPrismaProjectRepository();
  const owner = await createTestUser("project-delete-owner@example.com");

  const result = await repository.createWithTodos(
    {
      name: "Delete project",
      todos: [{ title: "Todo A" }, { title: "Todo B" }]
    },
    owner.id
  );

  const deletedProject = await repository.delete(result.project.id);

  expect(deletedProject).toMatchObject({
    id: result.project.id,
    name: "Delete project"
  });

  const savedProject = await prisma.project.findUnique({
    where: { id: result.project.id }
  });
  const savedTodos = await prisma.todo.findMany({
    where: { projectId: result.project.id }
  });

  expect(savedProject).toBeNull();
  expect(savedTodos).toEqual([]);
});
```

再补：

```ts
it("删除不存在的 Project 时返回 null", async () => {
  const repository = createPrismaProjectRepository();

  const result = await repository.delete("missing-project-id");

  expect(result).toBeNull();
});
```

---

## Step 6: 补 service 测试

打开：

```text
apps/api/tests/unit/projects.service.test.ts
```

fake repository 里要新增 `delete(id)`。

可以这样写：

```ts
async delete(id) {
  const project = projects.find((item) => item.id === id);

  if (!project) {
    return null;
  }

  projects = projects.filter((item) => item.id !== id);
  return project;
}
```

注意：你现在 fake 里的 `projects` 可能是 `const`，如果要重新赋值，需要改成：

```ts
let projects: Project[] = [];
```

新增测试：

```ts
it("当前用户可以删除自己的 Project", async () => {
  const repository = createFakeProjectRepository();
  const service = createProjectService(repository);

  const createdProject = await service.createProject({ name: "Delete me" }, "user-1");

  const deletedProject = await service.deleteProject(createdProject.id, "user-1");

  expect(deletedProject.id).toBe(createdProject.id);

  await expect(service.getProjectById(createdProject.id, "user-1")).rejects.toMatchObject({
    statusCode: 404,
    code: "PROJECT_NOT_FOUND"
  });
});
```

新增权限测试：

```ts
it("不能删除别人的 Project", async () => {
  const repository = createFakeProjectRepository();
  const service = createProjectService(repository);

  const createdProject = await service.createProject({ name: "Private project" }, "user-2");

  await expect(service.deleteProject(createdProject.id, "user-1")).rejects.toMatchObject({
    statusCode: 404,
    code: "PROJECT_NOT_FOUND"
  });
});
```

---

## Step 7: 补 API 集成测试

打开：

```text
apps/api/tests/integration/projects.test.ts
```

新增：

```ts
it("当前用户可以删除自己的 Project，并删除下面的 todos", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "project-delete-owner@example.com");

  const createResponse = await request(app)
    .post("/projects/with-todos")
    .set(authHeader(auth.token))
    .send({
      name: "Project to delete",
      todos: [{ title: "Todo A" }, { title: "Todo B" }]
    });

  const projectId = createResponse.body.data.project.id as string;

  const response = await request(app).delete(`/projects/${projectId}`).set(authHeader(auth.token));

  expect(response.status).toBe(204);
  expect(response.text).toBe("");

  const savedProject = await prisma.project.findUnique({ where: { id: projectId } });
  const savedTodos = await prisma.todo.findMany({ where: { projectId } });

  expect(savedProject).toBeNull();
  expect(savedTodos).toEqual([]);
});
```

新增：

```ts
it("不能删除别人的 Project", async () => {
  const app = createApp();
  const owner = await registerAndLogin(app, "project-delete-owner-a@example.com");
  const anotherUser = await registerAndLogin(app, "project-delete-owner-b@example.com");

  const createResponse = await request(app)
    .post("/projects")
    .set(authHeader(anotherUser.token))
    .send({ name: "Another user's project" });

  const projectId = createResponse.body.data.id as string;

  const response = await request(app).delete(`/projects/${projectId}`).set(authHeader(owner.token));

  expect(response.status).toBe(404);
  expect(response.body.error.code).toBe("PROJECT_NOT_FOUND");

  const savedProject = await prisma.project.findUnique({ where: { id: projectId } });
  expect(savedProject).not.toBeNull();
});
```

---

## Step 8: 自己先跑这些命令

```bash
npm run typecheck
npm run test -w @learn/api -- tests/unit/projects.prisma-repository.test.ts tests/unit/projects.service.test.ts tests/integration/projects.test.ts
npm run format:check
```

如果都通过，再跑：

```bash
npm run test
npm run build
```

---

## 完成后告诉我

你完成后直接说：

```text
Project 删除完成了
```

然后我会继续帮你：

- 看 transaction 和权限边界有没有问题。
- 补详细中文注释。
- 跑类型检查、测试、格式检查、构建和 smoke。
- 更新任务索引。
- 给下一张任务卡。
