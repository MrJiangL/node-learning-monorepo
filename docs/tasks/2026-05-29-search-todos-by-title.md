# Task: Search Todos By Title

## 目标

现在 Todo 列表已经支持这些 query：

```text
GET /projects/:projectId/todos?page=1&pageSize=10
GET /projects/:projectId/todos?completed=true
GET /projects/:projectId/todos?dueAfter=2026-05-01&dueBefore=2026-06-01
```

这一张任务新增按标题关键字搜索：

```text
GET /projects/:projectId/todos?title=report
```

最终它应该可以和已有过滤条件一起使用：

```text
GET /projects/:projectId/todos?title=report&completed=false&dueBefore=2026-06-01
```

你要练的是：

- Zod 校验可选字符串 query。
- repository filter 继续扩展。
- Prisma `contains` 字符串查询。
- 多个过滤条件组合到同一个 `where`。
- 补 repository / service / integration 测试。

---

## Step 1: 扩展 Todo query schema

打开：

```text
apps/api/src/modules/todos/todos.schema.ts
```

在 `listTodosQuerySchema` 里新增：

```ts
// title 是可选搜索关键字。
//
// trim() 可以把 "  report  " 变成 "report"。
// min(1) 可以拒绝 title= 这种空搜索。
// max(100) 和 createTodoSchema 的 title 长度保持一致。
title: z.string().trim().min(1).max(100).optional();
```

完整位置大概是：

```ts
export const listTodosQuerySchema = paginationQuerySchema.extend({
  completed: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  dueAfter: dateStringSchema.optional(),
  dueBefore: dateStringSchema.optional(),
  title: z.string().trim().min(1).max(100).optional()
});
```

---

## Step 2: 扩展 ListTodosFilter

打开：

```text
apps/api/src/modules/todos/todos.repository.ts
```

给 `ListTodosFilter` 增加：

```ts
// title 是可选搜索关键字。
//
// undefined 表示不按标题搜索。
// 有值时，repository 会用 Prisma contains 做模糊匹配。
title?: string;
```

---

## Step 3: 更新 Prisma repository

打开：

```text
apps/api/src/modules/todos/todos.prisma-repository.ts
```

在 `where` 里加入 title 条件：

```ts
const where = {
  projectId: filter.projectId,
  ...(filter.completed !== undefined ? { completed: filter.completed } : {}),
  ...dueDateFilter,

  // title 有值时才追加搜索条件。
  //
  // contains 表示“标题中包含这个关键字”。
  ...(filter.title ? { title: { contains: filter.title } } : {})
};
```

注意：

```text
where 里的所有条件是 AND 关系。
```

也就是说：

```text
title=report&completed=false
```

表示：

```text
标题包含 report，并且 completed 是 false。
```

---

## Step 4: 更新 Todo service

打开：

```text
apps/api/src/modules/todos/todos.service.ts
```

把 `pagination` 参数加上：

```ts
title?: string;
```

然后传给 repository：

```ts
return todoRepository.findAll({
  projectId,
  page: pagination.page,
  pageSize: pagination.pageSize,
  sortBy: pagination.sortBy,
  sortOrder: pagination.sortOrder,
  completed: pagination.completed,
  dueAfter: pagination.dueAfter,
  dueBefore: pagination.dueBefore,
  title: pagination.title
});
```

---

## Step 5: 补 repository 测试

打开：

```text
apps/api/tests/unit/todos.prisma-repository.test.ts
```

新增：

```ts
it("按 title 关键字搜索 todos", async () => {
  const repository = createPrismaTodoRepository();
  const owner = await createTestUser("todo-title-search-owner@example.com");
  const project = await createTestProject(owner.id, "Title search project");

  const matchedTodo = await repository.create({ title: "Write weekly report" }, project.id);
  await repository.create({ title: "Buy milk" }, project.id);

  const result = await repository.findAll({
    projectId: project.id,
    page: 1,
    pageSize: 10,
    sortBy: "createdAt",
    sortOrder: "asc",
    title: "report"
  });

  expect(result.data.map((todo) => todo.id)).toEqual([matchedTodo.id]);
  expect(result.meta.total).toBe(1);
});
```

---

## Step 6: 补 service 测试

打开：

```text
apps/api/tests/unit/todos.service.test.ts
```

在 fake repository 的过滤条件里加：

```ts
const titleMatches = filter.title === undefined || todo.title.includes(filter.title);
```

然后把 `return (...)` 里加上：

```ts
titleMatches;
```

新增测试：

```ts
it("列表查询会把 title 搜索条件交给 repository", async () => {
  const project = createTestProject({ id: "project-1", userId: "user-1" });
  const matchedTodo = createTestTodo({
    id: "todo-report",
    title: "Write weekly report",
    projectId: "project-1"
  });
  const otherTodo = createTestTodo({
    id: "todo-milk",
    title: "Buy milk",
    projectId: "project-1"
  });

  const projectRepository = createFakeProjectRepository([project]);
  const todoRepository = createFakeTodoRepository([matchedTodo, otherTodo]);
  const service = createTodoService(todoRepository, projectRepository);

  const result = await service.listTodos(
    "project-1",
    {
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc",
      title: "report"
    },
    "user-1"
  );

  expect(result.data.map((todo) => todo.id)).toEqual(["todo-report"]);
  expect(result.meta.total).toBe(1);
});
```

---

## Step 7: 补 API 集成测试

打开：

```text
apps/api/tests/integration/todos.test.ts
```

新增：

```ts
it("按 title 关键字查询当前项目的 todos", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "todo-title-search-api@example.com");
  const project = await createProject(app, auth.token, "Todo title search API project");

  const matchedTodo = await createTodo(app, auth.token, project.id, "Write weekly report");
  await createTodo(app, auth.token, project.id, "Buy milk");

  const response = await request(app)
    .get(`/projects/${project.id}/todos?title=report`)
    .set(authHeader(auth.token));

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data.map((todo: { id: string }) => todo.id)).toEqual([matchedTodo.id]);
  expect(response.body.meta.total).toBe(1);
});
```

再补非法空 title：

```ts
it("拒绝空 title 查询参数", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "todo-title-empty-api@example.com");
  const project = await createProject(app, auth.token, "Invalid title search project");

  const response = await request(app)
    .get(`/projects/${project.id}/todos?title=   `)
    .set(authHeader(auth.token));

  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe("VALIDATION_ERROR");
});
```

---

## Step 8: 自己先跑这些命令

```bash
npm run typecheck
npm run test -w @learn/api -- tests/unit/todos.prisma-repository.test.ts tests/unit/todos.service.test.ts tests/integration/todos.test.ts
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
Todo title 搜索完成了
```

然后我会继续帮你：

- 看多个过滤条件组合有没有问题。
- 补详细中文注释。
- 跑类型检查、测试、格式检查、构建和 smoke。
- 更新任务索引。
- 给下一张任务卡。
