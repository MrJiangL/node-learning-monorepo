# Task: Filter Todos By Due Date

## 目标

现在 Todo 列表已经支持：

```text
GET /projects/:projectId/todos?page=1&pageSize=10&completed=true
```

这一张任务新增按截止日期过滤：

```text
GET /projects/:projectId/todos?dueBefore=2026-06-01
GET /projects/:projectId/todos?dueAfter=2026-05-01
GET /projects/:projectId/todos?dueAfter=2026-05-01&dueBefore=2026-06-01
```

你要练的是：

- Zod 校验日期字符串。
- query string 里日期仍然是字符串，不要直接信任。
- Prisma `where` 里使用范围条件：`gte` / `lte`。
- 保持分页 `meta.total` 和 dueDate 过滤条件一致。
- 同时兼容已有的 `completed` / 分页 / 排序。

---

## 先理解日期过滤

Todo 的 `dueDate` 在 shared/API 层是字符串：

```ts
dueDate: "2026-06-01";
```

但 Prisma 写数据库和查数据库时需要 `Date`：

```ts
new Date("2026-06-01");
```

这一张任务里：

- `dueAfter` 表示只查截止日期大于等于这个时间的 Todo。
- `dueBefore` 表示只查截止日期小于等于这个时间的 Todo。

对应 Prisma 条件：

```ts
dueDate: {
  gte: new Date(filter.dueAfter),
  lte: new Date(filter.dueBefore)
}
```

---

## Step 1: 扩展 Todo query schema

打开：

```text
apps/api/src/modules/todos/todos.schema.ts
```

先写一个小 helper：

```ts
const dateStringSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Invalid date"
});
```

然后扩展 `listTodosQuerySchema`：

```ts
export const listTodosQuerySchema = paginationQuerySchema.extend({
  completed: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),

  // dueAfter / dueBefore 来自 URL query，所以一开始都是字符串。
  //
  // 这里先只校验“它能不能被 Date.parse 解析”，不要在 schema 里转成 Date。
  // 保持 service/repository 的 filter 类型更容易理解：外层传字符串，repository 再转 Date。
  dueAfter: dateStringSchema.optional(),
  dueBefore: dateStringSchema.optional()
});
```

学习重点：

```text
Zod 负责守住 HTTP 边界。
```

也就是说，非法日期应该在 route parse query 时就变成 `VALIDATION_ERROR`。

---

## Step 2: 扩展 ListTodosFilter

打开：

```text
apps/api/src/modules/todos/todos.repository.ts
```

给 `ListTodosFilter` 增加：

```ts
// dueAfter / dueBefore 是可选日期范围过滤。
//
// 它们来自 query string，通过 Zod 校验后仍然保持 string。
// repository 会在真正拼 Prisma where 时转成 Date。
dueAfter?: string;
dueBefore?: string;
```

---

## Step 3: 更新 Prisma repository

打开：

```text
apps/api/src/modules/todos/todos.prisma-repository.ts
```

在 `findAll(filter)` 里，先算 dueDate 条件：

```ts
const dueDateFilter =
  filter.dueAfter || filter.dueBefore
    ? {
        dueDate: {
          ...(filter.dueAfter ? { gte: new Date(filter.dueAfter) } : {}),
          ...(filter.dueBefore ? { lte: new Date(filter.dueBefore) } : {})
        }
      }
    : {};
```

然后把它合进 `where`：

```ts
const where = {
  projectId: filter.projectId,
  ...(filter.completed !== undefined ? { completed: filter.completed } : {}),
  ...dueDateFilter
};
```

注意：

```text
findMany 和 count 必须继续共用同一个 where。
```

---

## Step 4: 更新 Todo service

打开：

```text
apps/api/src/modules/todos/todos.service.ts
```

把 `listTodos` 的 `pagination` 参数扩展：

```ts
pagination: {
  page: number;
  pageSize: number;
  sortBy: ListSortBy;
  sortOrder: SortOrder;
  completed?: boolean;
  dueAfter?: string;
  dueBefore?: string;
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
  completed: pagination.completed,
  dueAfter: pagination.dueAfter,
  dueBefore: pagination.dueBefore
});
```

service 仍然不要自己过滤数组。

service 负责：

```text
当前用户是否拥有这个 Project。
```

repository 负责：

```text
按 projectId / completed / dueDate / page / sort 查询数据库。
```

---

## Step 5: 补 repository 测试

打开：

```text
apps/api/tests/unit/todos.prisma-repository.test.ts
```

新增测试：

```ts
it("按 dueDate 范围过滤 todos", async () => {
  const repository = createPrismaTodoRepository();
  const owner = await createTestUser("todo-due-date-filter-owner@example.com");
  const project = await createTestProject(owner.id, "Due date filter project");

  await repository.create({ title: "Old todo", dueDate: "2026-05-01" }, project.id);
  const inRangeTodo = await repository.create(
    { title: "In range todo", dueDate: "2026-05-15" },
    project.id
  );
  await repository.create({ title: "Future todo", dueDate: "2026-06-01" }, project.id);

  const result = await repository.findAll({
    projectId: project.id,
    page: 1,
    pageSize: 10,
    sortBy: "createdAt",
    sortOrder: "asc",
    dueAfter: "2026-05-10",
    dueBefore: "2026-05-20"
  });

  expect(result.data.map((todo) => todo.id)).toEqual([inRangeTodo.id]);
  expect(result.meta.total).toBe(1);
});
```

---

## Step 6: 补 service 测试

打开：

```text
apps/api/tests/unit/todos.service.test.ts
```

你的 fake repository 现在会按 `projectId` 和 `completed` 过滤。

这次要让它也能按 dueDate 过滤。

可以在 `findAll(filter)` 的 `.filter(...)` 里继续加条件：

```ts
const dueDateTime = todo.dueDate ? new Date(todo.dueDate).getTime() : null;
const dueAfterTime = filter.dueAfter ? new Date(filter.dueAfter).getTime() : null;
const dueBeforeTime = filter.dueBefore ? new Date(filter.dueBefore).getTime() : null;

return (
  todo.projectId === filter.projectId &&
  (filter.completed === undefined || todo.completed === filter.completed) &&
  (dueAfterTime === null || (dueDateTime !== null && dueDateTime >= dueAfterTime)) &&
  (dueBeforeTime === null || (dueDateTime !== null && dueDateTime <= dueBeforeTime))
);
```

然后新增测试：

```ts
it("列表查询会把 dueDate 范围过滤条件交给 repository", async () => {
  const project = createTestProject({ id: "project-1", userId: "user-1" });
  const oldTodo = createTestTodo({
    id: "todo-old",
    title: "Old todo",
    dueDate: "2026-05-01",
    projectId: "project-1"
  });
  const inRangeTodo = createTestTodo({
    id: "todo-in-range",
    title: "In range todo",
    dueDate: "2026-05-15",
    projectId: "project-1"
  });

  const projectRepository = createFakeProjectRepository([project]);
  const todoRepository = createFakeTodoRepository([oldTodo, inRangeTodo]);
  const service = createTodoService(todoRepository, projectRepository);

  const result = await service.listTodos(
    "project-1",
    {
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc",
      dueAfter: "2026-05-10",
      dueBefore: "2026-05-20"
    },
    "user-1"
  );

  expect(result.data.map((todo) => todo.id)).toEqual(["todo-in-range"]);
  expect(result.meta.total).toBe(1);
});
```

---

## Step 7: 补 API 集成测试

打开：

```text
apps/api/tests/integration/todos.test.ts
```

你现在的 `createTodo(...)` helper 只收 `title`。

可以把它扩展成：

```ts
async function createTodo(
  app: ReturnType<typeof createApp>,
  token: string,
  projectId: string,
  title: string,
  input: { dueDate?: string } = {}
) {
  const response = await request(app)
    .post(`/projects/${projectId}/todos`)
    .set(authHeader(token))
    .send({ title, ...input });

  return response.body.data as {
    id: string;
    title: string;
    completed: boolean;
    projectId: string;
  };
}
```

新增测试：

```ts
it("按 dueDate 范围查询当前项目的 todos", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "todo-due-date-api@example.com");
  const project = await createProject(app, auth.token, "Todo dueDate API project");

  await createTodo(app, auth.token, project.id, "Old API todo", { dueDate: "2026-05-01" });
  const inRangeTodo = await createTodo(app, auth.token, project.id, "In range API todo", {
    dueDate: "2026-05-15"
  });
  await createTodo(app, auth.token, project.id, "Future API todo", { dueDate: "2026-06-01" });

  const response = await request(app)
    .get(`/projects/${project.id}/todos?dueAfter=2026-05-10&dueBefore=2026-05-20`)
    .set(authHeader(auth.token));

  expect(response.status).toBe(200);
  expect(response.body.data.map((todo: { id: string }) => todo.id)).toEqual([inRangeTodo.id]);
  expect(response.body.meta.total).toBe(1);
});
```

再补非法日期：

```ts
it("拒绝非法 dueDate 查询参数", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "todo-due-date-invalid@example.com");
  const project = await createProject(app, auth.token, "Invalid dueDate project");

  const response = await request(app)
    .get(`/projects/${project.id}/todos?dueAfter=not-a-date`)
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
Todo dueDate 过滤完成了
```

然后我会继续帮你：

- 看日期边界有没有问题。
- 补详细中文注释。
- 跑类型检查、测试、格式检查、构建和 smoke。
- 更新任务索引。
- 给下一张任务卡。
