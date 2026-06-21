# Task: Filter Todos By Completed

## 目标

现在 Todo 列表已经支持分页和排序：

```text
GET /projects/:projectId/todos?page=1&pageSize=10&sortBy=createdAt&sortOrder=asc
```

这一张任务继续加一个常见查询条件：

```text
GET /projects/:projectId/todos?completed=true
GET /projects/:projectId/todos?completed=false
```

你要练的是：

- Zod 解析 query string 里的布尔值。
- 把 `completed` 从 route 传到 service，再传到 repository。
- Prisma `where` 条件按参数动态追加。
- 保持分页 `meta.total` 和当前过滤条件一致。
- 补 repository / service / integration 测试。

---

## 先理解一个坑

不要直接写：

```ts
completed: z.coerce.boolean().optional();
```

原因是 URL query 里的值是字符串。

在 JavaScript 里：

```ts
Boolean("false"); // true
```

所以 `z.coerce.boolean()` 很容易把 `"false"` 解析成 `true`。这不是你想要的。

这一题我们用更明确的写法：只接受 `"true"` 和 `"false"`。

---

## Step 1: 扩展 Todo query schema

打开：

```text
apps/api/src/modules/todos/todos.schema.ts
```

把：

```ts
export const listTodosQuerySchema = paginationQuerySchema;
```

改成类似这样：

```ts
export const listTodosQuerySchema = paginationQuerySchema.extend({
  // URL query 里没有真正的 boolean，只有字符串。
  //
  // 所以这里明确只允许：
  // - completed=true
  // - completed=false
  //
  // transform 负责把字符串变成真正的 boolean。
  completed: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()
});
```

你可以先只改 schema，然后跑：

```bash
npm run typecheck
```

这一步很可能会通过，因为还没有把类型接到 repository。

---

## Step 2: 扩展 ListTodosFilter

打开：

```text
apps/api/src/modules/todos/todos.repository.ts
```

给 `ListTodosFilter` 增加：

```ts
completed?: boolean;
```

参考注释：

```ts
// completed 是可选过滤条件。
//
// undefined 表示“不按完成状态过滤”，返回当前 Project 下的所有 Todo。
// true 表示只返回已完成 Todo。
// false 表示只返回未完成 Todo。
completed?: boolean;
```

这里要特别记住：

```text
false 是有效值，不等于没有传。
```

所以后面判断时不能写 `if (filter.completed)`。

---

## Step 3: 更新 Prisma repository

打开：

```text
apps/api/src/modules/todos/todos.prisma-repository.ts
```

在 `findAll(filter)` 里，把 `where` 从固定条件改成动态条件。

参考写法：

```ts
const where = {
  projectId: filter.projectId,

  // completed 是可选参数。
  //
  // 这里一定要判断 undefined，而不是判断真假。
  // 因为 completed=false 代表“只查未完成”，它是一个合法过滤条件。
  ...(filter.completed !== undefined ? { completed: filter.completed } : {})
};
```

其他 `findMany` 和 `count` 不用大改，只要继续共用同一个 `where`：

```ts
const [todos, total] = await Promise.all([
  prisma.todo.findMany({
    where,
    skip,
    take: filter.pageSize,
    orderBy: { [filter.sortBy]: filter.sortOrder }
  }),
  prisma.todo.count({ where })
]);
```

核心检查点：

```text
findMany 和 count 必须使用同一个 where。
```

否则你可能会看到：

```json
{
  "data": [{ "completed": true }],
  "meta": { "total": 10 }
}
```

这种 `data` 已过滤、`total` 没过滤的错位结果。

---

## Step 4: 更新 Todo service

打开：

```text
apps/api/src/modules/todos/todos.service.ts
```

现在 `listTodos` 的 `pagination` 参数只包含分页和排序：

```ts
pagination: {
  page: number;
  pageSize: number;
  sortBy: ListSortBy;
  sortOrder: SortOrder;
}
```

你可以把它扩成：

```ts
pagination: {
  page: number;
  pageSize: number;
  sortBy: ListSortBy;
  sortOrder: SortOrder;
  completed?: boolean;
}
```

然后传给 repository：

```ts
return todoRepository.findAll({
  projectId,
  page: pagination.page,
  pageSize: pagination.pageSize,
  sortBy: pagination.sortBy,
  sortOrder: pagination.sortOrder,
  completed: pagination.completed
});
```

学习重点：

```text
service 仍然不负责自己过滤数组。
```

service 这一层主要负责业务规则：

```text
当前用户必须拥有这个 Project。
```

真正的数据查询条件交给 repository。

---

## Step 5: 补 repository 测试

打开：

```text
apps/api/tests/unit/todos.prisma-repository.test.ts
```

新增一个测试，描述用中文：

```ts
it("按 completed 过滤 todos", async () => {
  const repository = createPrismaTodoRepository();
  const owner = await createTestUser("todo-completed-filter-owner@example.com");
  const project = await createTestProject(owner.id, "Completed filter project");

  const openTodo = await repository.create({ title: "Open todo" }, project.id);
  const doneTodo = await repository.create({ title: "Done todo" }, project.id);

  await repository.update(doneTodo.id, { completed: true });

  const result = await repository.findAll({
    projectId: project.id,
    page: 1,
    pageSize: 10,
    sortBy: "createdAt",
    sortOrder: "asc",
    completed: true
  });

  expect(result.data.map((todo) => todo.id)).toEqual([doneTodo.id]);
  expect(result.data.some((todo) => todo.id === openTodo.id)).toBe(false);
  expect(result.meta).toEqual({
    page: 1,
    pageSize: 10,
    total: 1,
    totalPages: 1
  });
});
```

这个测试要证明两件事：

- `data` 只返回 completed=true 的 Todo。
- `meta.total` 也只统计 completed=true 的 Todo。

---

## Step 6: 补 service 测试

打开：

```text
apps/api/tests/unit/todos.service.test.ts
```

你的 fake repository 里 `findAll(filter)` 已经能按 `projectId` 分页。

现在可以继续让它支持 `completed`：

```ts
const filteredTodos = todos.filter(
  (todo) =>
    todo.projectId === filter.projectId &&
    (filter.completed === undefined || todo.completed === filter.completed)
);
```

这里还是那个重点：

```text
filter.completed === undefined
```

不要写：

```ts
!filter.completed;
```

因为 `false` 也是你要支持的查询值。

然后新增中文测试：

```ts
it("列表查询会把 completed 过滤条件交给 repository", async () => {
  const project = createTestProject({ id: "project-1", userId: "user-1" });
  const openTodo = createTestTodo({
    id: "todo-open",
    title: "Open todo",
    completed: false,
    projectId: "project-1"
  });
  const doneTodo = createTestTodo({
    id: "todo-done",
    title: "Done todo",
    completed: true,
    projectId: "project-1"
  });

  const projectRepository = createFakeProjectRepository([project]);
  const todoRepository = createFakeTodoRepository([openTodo, doneTodo]);
  const service = createTodoService(todoRepository, projectRepository);

  const result = await service.listTodos(
    "project-1",
    {
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc",
      completed: false
    },
    "user-1"
  );

  expect(result.data.map((todo) => todo.id)).toEqual(["todo-open"]);
  expect(result.meta.total).toBe(1);
});
```

---

## Step 7: 补 integration 测试

打开：

```text
apps/api/tests/integration/todos.test.ts
```

新增中文测试：

```ts
it("按 completed 查询当前项目的 todos", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "todo-completed-api@example.com");
  const project = await createProject(app, auth.token, "Todo completed API project");

  const openTodo = await createTodo(app, auth.token, project.id, "Open API todo");
  const doneTodo = await createTodo(app, auth.token, project.id, "Done API todo");

  await request(app)
    .patch(`/todos/${doneTodo.id}`)
    .set(authHeader(auth.token))
    .send({ completed: true });

  const response = await request(app)
    .get(`/projects/${project.id}/todos?completed=true`)
    .set(authHeader(auth.token));

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data.map((todo: { id: string }) => todo.id)).toEqual([doneTodo.id]);
  expect(response.body.data.some((todo: { id: string }) => todo.id === openTodo.id)).toBe(false);
  expect(response.body.meta.total).toBe(1);
});
```

再补一个非法参数测试：

```ts
it("拒绝非法 completed 查询参数", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "todo-completed-invalid@example.com");
  const project = await createProject(app, auth.token, "Invalid completed project");

  const response = await request(app)
    .get(`/projects/${project.id}/todos?completed=yes`)
    .set(authHeader(auth.token));

  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe("VALIDATION_ERROR");
});
```

---

## Step 8: 自己先跑这些命令

你完成后先跑：

```bash
npm run typecheck
npm run test -w @learn/api -- tests/unit/todos.prisma-repository.test.ts tests/unit/todos.service.test.ts tests/integration/todos.test.ts
npm run format:check
```

如果都过了，再跑全量：

```bash
npm run test
npm run build
```

---

## 完成后告诉我

你完成后直接说：

```text
Todo completed 过滤完成了
```

然后我会帮你：

- 看代码有没有边界问题。
- 补更详细的中文注释。
- 跑类型检查、测试、格式检查、构建和 smoke。
- 更新任务索引。
- 给你下一张任务卡。
