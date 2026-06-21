# Task: Delete Todo

## 目标

现在 Todo 已经支持：

```text
POST /projects/:projectId/todos
GET /projects/:projectId/todos
PATCH /todos/:id
```

这一张任务新增：

```text
DELETE /todos/:id
```

删除规则：

- 只能删除当前用户自己的 Todo。
- Todo 本身没有 `userId`，所以仍然要通过 `Todo -> Project -> User` 判断归属。
- 删除成功返回 `204 No Content`。
- 删除不存在或不属于当前用户的 Todo，都返回 `TODO_NOT_FOUND`。

---

## Step 1: 更新 TodoRepository 接口

打开：

```text
apps/api/src/modules/todos/todos.repository.ts
```

新增：

```ts
// 删除 Todo。
//
// repository 只负责按 id 删除，不判断这个 Todo 属于谁。
// 权限判断放在 service 层：先查 Todo，再查它所属 Project 的 userId。
delete(id: string): Promise<Todo | null>;
```

---

## Step 2: 实现 Prisma delete

打开：

```text
apps/api/src/modules/todos/todos.prisma-repository.ts
```

在 repository 对象里新增：

```ts
async delete(id: string): Promise<Todo | null> {
  // Prisma delete 找不到记录时会抛异常。
  //
  // 我们 repository 的约定是：
  // - 找得到：返回被删除的 Todo
  // - 找不到：返回 null
  //
  // 所以这里先 findUnique，再 delete。
  const todo = await prisma.todo.findUnique({ where: { id } });

  if (!todo) {
    return null;
  }

  const deletedTodo = await prisma.todo.delete({
    where: { id }
  });

  return mapPrismaTodoToTodo(deletedTodo);
}
```

---

## Step 3: 更新 Todo service

打开：

```text
apps/api/src/modules/todos/todos.service.ts
```

新增：

```ts
async deleteTodo(id: string, currentUserId: string) {
  // requireOwnedTodo 会做完整权限判断：
  // 1. 按 todoId 找 Todo
  // 2. 用 todo.projectId 找 Project
  // 3. 判断 project.userId 是否等于当前用户
  await requireOwnedTodo(id, currentUserId);

  const deletedTodo = await todoRepository.delete(id);

  if (!deletedTodo) {
    throw new AppError(404, "TODO_NOT_FOUND", "Todo was not found");
  }

  return deletedTodo;
}
```

---

## Step 4: 更新 Todo routes

打开：

```text
apps/api/src/modules/todos/todos.routes.ts
```

新增：

```ts
todoRouter.delete(
  "/todos/:id",
  requireAuth,
  asyncHandler(async (request, response) => {
    await todoService.deleteTodo(request.params.id as string, request.user!.id);

    // 删除成功后返回 204 No Content。
    //
    // 204 表示“请求成功，但响应体为空”。
    // 所以这里不要 response.json({ success: true })。
    response.status(204).send();
  })
);
```

---

## Step 5: 补 repository 测试

打开：

```text
apps/api/tests/unit/todos.prisma-repository.test.ts
```

新增：

```ts
it("删除 todo", async () => {
  const repository = createPrismaTodoRepository();
  const owner = await createTestUser("todo-delete-owner@example.com");
  const project = await createTestProject(owner.id, "Delete todo project");

  const createdTodo = await repository.create({ title: "Delete me" }, project.id);

  const deletedTodo = await repository.delete(createdTodo.id);

  expect(deletedTodo).toMatchObject({
    id: createdTodo.id,
    title: "Delete me",
    projectId: project.id
  });

  const savedTodo = await prisma.todo.findUnique({
    where: { id: createdTodo.id }
  });

  expect(savedTodo).toBeNull();
});
```

再补：

```ts
it("删除不存在的 todo 时返回 null", async () => {
  const repository = createPrismaTodoRepository();

  const result = await repository.delete("missing-todo-id");

  expect(result).toBeNull();
});
```

---

## Step 6: 补 service 测试

打开：

```text
apps/api/tests/unit/todos.service.test.ts
```

fake todo repository 也要补 `delete` 方法。

可以参考：

```ts
deletedIds: string[];
```

然后实现：

```ts
async delete(id) {
  deletedIds.push(id);

  const existingTodo = todos.find((todo) => todo.id === id);

  if (!existingTodo) {
    return null;
  }

  todos = todos.filter((todo) => todo.id !== id);

  return existingTodo;
}
```

新增测试：

```ts
it("当前用户可以删除自己 Project 下的 Todo", async () => {
  const project = createTestProject({
    id: "project-1",
    userId: "user-1"
  });
  const todo = createTestTodo({
    id: "todo-1",
    projectId: "project-1"
  });

  const projectRepository = createFakeProjectRepository([project]);
  const todoRepository = createFakeTodoRepository([todo]);
  const service = createTodoService(todoRepository, projectRepository);

  const deletedTodo = await service.deleteTodo("todo-1", "user-1");

  expect(deletedTodo.id).toBe("todo-1");
  expect(todoRepository.deletedIds).toEqual(["todo-1"]);
});
```

再补一个权限测试：

```ts
it("不能删除别人 Project 下的 Todo", async () => {
  const project = createTestProject({
    id: "project-1",
    userId: "user-2"
  });
  const todo = createTestTodo({
    id: "todo-1",
    projectId: "project-1"
  });

  const projectRepository = createFakeProjectRepository([project]);
  const todoRepository = createFakeTodoRepository([todo]);
  const service = createTodoService(todoRepository, projectRepository);

  await expect(service.deleteTodo("todo-1", "user-1")).rejects.toMatchObject({
    statusCode: 404,
    code: "PROJECT_NOT_FOUND"
  });

  expect(todoRepository.deletedIds).toEqual([]);
});
```

---

## Step 7: 补 integration API 测试

打开：

```text
apps/api/tests/integration/todos.test.ts
```

新增：

```ts
it("当前用户可以通过 API 删除自己的 todo", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "todo-api-delete-owner@example.com");
  const project = await createProject(app, auth.token, "Todo API delete project");
  const todo = await createTodo(app, auth.token, project.id, "Delete API todo");

  const response = await request(app).delete(`/todos/${todo.id}`).set(authHeader(auth.token));

  expect(response.status).toBe(204);
  expect(response.text).toBe("");

  const savedTodo = await prisma.todo.findUnique({
    where: { id: todo.id }
  });

  expect(savedTodo).toBeNull();
});
```

再补：

```ts
it("不能通过 API 删除别人的 todo", async () => {
  const app = createApp();
  const owner = await registerAndLogin(app, "todo-api-delete-owner-a@example.com");
  const anotherUser = await registerAndLogin(app, "todo-api-delete-owner-b@example.com");
  const anotherProject = await createProject(app, anotherUser.token, "Private todo project");
  const anotherTodo = await createTodo(app, anotherUser.token, anotherProject.id, "Private todo");

  const response = await request(app)
    .delete(`/todos/${anotherTodo.id}`)
    .set(authHeader(owner.token));

  expect(response.status).toBe(404);

  const savedTodo = await prisma.todo.findUnique({
    where: { id: anotherTodo.id }
  });

  expect(savedTodo).not.toBeNull();
});
```

---

## Step 8: 自己跑测试

先跑这组：

```bash
npm run test -w @learn/api -- tests/unit/todos.prisma-repository.test.ts tests/unit/todos.service.test.ts tests/integration/todos.test.ts
```

再跑：

```bash
npm run typecheck
npm run format:check
```

---

## 完成后你告诉我

你完成后直接发：

```text
Todo 删除完成了
```

我会帮你：

- 看实现有没有权限边界问题。
- 补更详细的中文注释。
- 跑 focused tests / typecheck / format / build / smoke。
- 更新任务索引。
- 给你下一张复盘任务卡。
