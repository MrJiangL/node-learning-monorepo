# Task: Update Todo Title And Due Date

## 目标

现在 Todo 已经支持：

```text
POST /projects/:projectId/todos
GET /projects/:projectId/todos
PATCH /todos/:id
```

之前 `PATCH /todos/:id` 主要用来切换：

```json
{
  "completed": true
}
```

这一张任务让你把同一个 PATCH 接口练完整一点：

```json
{
  "title": "Write Prisma notes",
  "dueDate": "2026-06-01"
}
```

还要支持清空截止日期：

```json
{
  "dueDate": null
}
```

你要练的是：

- Zod schema 如何描述“可选字段”和 `null`。
- PATCH 局部更新：没传的字段保留原值。
- Prisma repository 如何把 `string | null | undefined` 转成数据库需要的 `Date | null | undefined`。
- service 如何继续保证：只能更新自己 Project 下的 Todo。
- repository / service / integration 测试如何覆盖更新行为。

---

## Step 1: 先读现有代码

先打开这几个文件，不急着写代码：

```text
apps/api/src/modules/todos/todos.schema.ts
apps/api/src/modules/todos/todos.service.ts
apps/api/src/modules/todos/todos.prisma-repository.ts
apps/api/tests/unit/todos.service.test.ts
apps/api/tests/unit/todos.prisma-repository.test.ts
apps/api/tests/integration/todos.test.ts
```

你会发现：

- route 已经有 `PATCH /todos/:id`。
- service 已经有 `updateTodo(id, input, currentUserId)`。
- Prisma repository 已经有 `update(id, input)`。
- 现在主要缺的是：把 title / dueDate 的行为测试清楚。

这张任务更像“补测试 + 理解现有实现”，不是大改功能。

---

## Step 2: 检查 updateTodoSchema

打开：

```text
apps/api/src/modules/todos/todos.schema.ts
```

确认 `updateTodoSchema` 至少长这样：

```ts
export const updateTodoSchema = z.object({
  // title 是可选字段：
  // - 没传：不更新 title
  // - 传了字符串：更新 title
  // - 传空字符串：应该被 Zod 拒绝
  title: z
    .string()
    .trim()
    .min(1, "Todo title is required")
    .max(100, "Todo title must be 100 characters or less")
    .optional(),

  // description 也是可选字段。
  //
  // 注意：这张任务先不要求你支持 description=null 清空描述。
  // 如果你想做，也可以告诉我，我们下一张可以单独整理“字段清空策略”。
  description: z
    .string()
    .trim()
    .max(1000, "Description must be 1000 characters or less")
    .optional(),

  // dueDate 比 title 多一个 null：
  // - undefined：请求里没传 dueDate，保持原值
  // - string：设置新的截止日期
  // - null：明确清空截止日期
  dueDate: z.string().nullable().optional(),

  // completed 继续保留之前的完成状态切换能力。
  completed: z.boolean().optional()
});
```

如果你现在代码已经是这样，就不用改。

---

## Step 3: 给 Prisma repository 补测试

打开：

```text
apps/api/tests/unit/todos.prisma-repository.test.ts
```

新增两个测试。

第一个：更新 title 和 dueDate。

```ts
it("更新 todo 的 title 和 dueDate", async () => {
  const repository = createPrismaTodoRepository();
  const owner = await createTestUser("todo-update-title-due-date@example.com");
  const project = await createTestProject(owner.id, "Update title dueDate project");

  const createdTodo = await repository.create(
    {
      title: "Old title",
      dueDate: "2026-05-01"
    },
    project.id
  );

  const updatedTodo = await repository.update(createdTodo.id, {
    title: "New title",
    dueDate: "2026-06-01"
  });

  expect(updatedTodo).toMatchObject({
    id: createdTodo.id,
    title: "New title",
    projectId: project.id
  });

  // dueDate 最终会从 Date 序列化成 ISO 字符串。
  // 所以这里不直接比较 "2026-06-01"，而是确认它确实落在 2026-06-01。
  expect(updatedTodo?.dueDate).toContain("2026-06-01");
});
```

第二个：清空 dueDate。

```ts
it("传入 dueDate 为 null 时清空 todo 截止日期", async () => {
  const repository = createPrismaTodoRepository();
  const owner = await createTestUser("todo-clear-due-date@example.com");
  const project = await createTestProject(owner.id, "Clear dueDate project");

  const createdTodo = await repository.create(
    {
      title: "Todo with dueDate",
      dueDate: "2026-05-01"
    },
    project.id
  );

  const updatedTodo = await repository.update(createdTodo.id, {
    dueDate: null
  });

  // null 的语义是“我明确要清空这个字段”。
  expect(updatedTodo?.dueDate).toBeNull();
});
```

学习重点：

```text
undefined 和 null 在 PATCH 里不是一回事。
```

- `undefined`：我没传这个字段，请保持原样。
- `null`：我传了这个字段，并且要把它清空。

---

## Step 4: 给 service 补测试

打开：

```text
apps/api/tests/unit/todos.service.test.ts
```

新增测试：

```ts
it("当前用户可以更新自己 todo 的 title 和 dueDate", async () => {
  const project = createTestProject({
    id: "project-1",
    userId: "user-1"
  });

  const todo = createTestTodo({
    id: "todo-1",
    projectId: "project-1",
    title: "Old service title",
    dueDate: "2026-05-01T00:00:00.000Z"
  });

  const projectRepository = createFakeProjectRepository([project]);
  const todoRepository = createFakeTodoRepository([todo]);
  const service = createTodoService(todoRepository, projectRepository);

  const updatedTodo = await service.updateTodo(
    "todo-1",
    {
      title: "New service title",
      dueDate: "2026-06-01"
    },
    "user-1"
  );

  expect(updatedTodo).toMatchObject({
    id: "todo-1",
    title: "New service title",
    dueDate: "2026-06-01",
    projectId: "project-1"
  });
  expect(todoRepository.updatedIds).toEqual(["todo-1"]);
});
```

这个测试不是为了测 Prisma，而是为了测 service 流程：

```text
先查 todo -> 再查 project -> 确认归属 -> 调 repository.update
```

---

## Step 5: 给 integration API 补测试

打开：

```text
apps/api/tests/integration/todos.test.ts
```

新增三个测试。

第一个：通过 API 更新 title 和 dueDate。

```ts
it("当前用户可以通过 API 更新 todo 的 title 和 dueDate", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "todo-api-update-title-due-date@example.com");
  const project = await createProject(app, auth.token, "Todo API update project");
  const todo = await createTodo(app, auth.token, project.id, "Old API title", {
    dueDate: "2026-05-01"
  });

  const response = await request(app).patch(`/todos/${todo.id}`).set(authHeader(auth.token)).send({
    title: "New API title",
    dueDate: "2026-06-01"
  });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data).toMatchObject({
    id: todo.id,
    title: "New API title",
    projectId: project.id
  });
  expect(response.body.data.dueDate).toContain("2026-06-01");
});
```

第二个：通过 API 清空 dueDate。

```ts
it("当前用户可以通过 API 清空 todo 的 dueDate", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "todo-api-clear-due-date@example.com");
  const project = await createProject(app, auth.token, "Todo API clear dueDate project");
  const todo = await createTodo(app, auth.token, project.id, "Clear API dueDate", {
    dueDate: "2026-05-01"
  });

  const response = await request(app).patch(`/todos/${todo.id}`).set(authHeader(auth.token)).send({
    dueDate: null
  });

  expect(response.status).toBe(200);
  expect(response.body.data.dueDate).toBeNull();
});
```

第三个：空 title 应该被拒绝。

```ts
it("拒绝把 todo title 更新为空字符串", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "todo-api-empty-title@example.com");
  const project = await createProject(app, auth.token, "Todo API invalid title project");
  const todo = await createTodo(app, auth.token, project.id, "Valid title");

  const response = await request(app).patch(`/todos/${todo.id}`).set(authHeader(auth.token)).send({
    title: "   "
  });

  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe("VALIDATION_ERROR");
});
```

---

## Step 6: 自己跑测试

你先跑这一组：

```bash
npm run test -w @learn/api -- tests/unit/todos.prisma-repository.test.ts tests/unit/todos.service.test.ts tests/integration/todos.test.ts
```

如果通过，再跑：

```bash
npm run typecheck
npm run format:check
```

如果你愿意，也可以最后跑完整测试：

```bash
npm run test
```

---

## 完成后你告诉我

你完成后直接发：

```text
Todo 更新 title / dueDate 完成了
```

我会帮你做这几件事：

- 看你写的测试和实现有没有问题。
- 补更详细的中文注释。
- 跑 focused tests / typecheck / format / build / smoke。
- 更新任务索引。
- 给你下一张任务卡。
