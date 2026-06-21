# Task: Add Sort Query To List APIs

## 目标

现在 plans 和 todos 的列表接口都有分页：

```text
GET /plans?page=1&pageSize=10
GET /projects/:projectId/todos?page=1&pageSize=10
```

但排序规则是写死在 repository 里的：

```ts
orderBy: {
  createdAt: "asc";
}
```

这一张任务给列表接口增加排序参数：

```text
GET /plans?sortBy=createdAt&sortOrder=desc
GET /projects/:projectId/todos?sortBy=createdAt&sortOrder=desc
```

你要练的是：

- query schema 继续复用和扩展。
- 把 HTTP query 传到 service，再传到 repository。
- Prisma `orderBy` 的动态写法。
- 用测试验证排序结果。
- 测试 `it(...)` 描述继续使用中文。

---

## Step 1: 更新共享 pagination query schema

打开：

```text
apps/api/src/http/pagination-query-schema.ts
```

新增排序字段：

```ts
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),

  // sortBy 表示按哪个字段排序。
  //
  // 这张任务先只允许 createdAt。
  // 这样可以先练通“排序参数传递”这条链路，不急着支持太多字段。
  sortBy: z.enum(["createdAt"]).default("createdAt"),

  // sortOrder 表示升序还是降序。
  //
  // asc：旧数据在前
  // desc：新数据在前
  sortOrder: z.enum(["asc", "desc"]).default("asc")
});
```

注意：

```text
这个改动会影响 plans 和 todos，因为它们都复用了 paginationQuerySchema。
```

---

## Step 2: 更新 shared 类型

打开：

```text
packages/shared/src/index.ts
```

在 `PaginationMeta` 附近新增：

```ts
export type SortOrder = "asc" | "desc";
export type ListSortBy = "createdAt";
```

学习点：

```text
schema 负责运行时校验，type 负责 TypeScript 编译期提示。
两者都写清楚，后面 route -> service -> repository 的参数就更稳定。
```

---

## Step 3: 更新 PlanRepository filter 类型

打开：

```text
apps/api/src/modules/plans/plans.repository.ts
```

把 shared import 加上：

```ts
(ListSortBy, SortOrder);
```

在 `ListPlansFilter` 里加：

```ts
sortBy: ListSortBy;
sortOrder: SortOrder;
```

并给这两个字段写中文注释：

```ts
// sortBy / sortOrder 来自 query schema。
//
// 当前只支持 createdAt，是为了先把排序链路练清楚。
// 后面如果要支持 title / difficulty，可以再扩展 schema 和 repository。
sortBy: ListSortBy;
sortOrder: SortOrder;
```

---

## Step 4: 更新 Prisma Plan repository

打开：

```text
apps/api/src/modules/plans/plans.prisma-repository.ts
```

把：

```ts
orderBy: {
  createdAt: "asc";
}
```

改成：

```ts
orderBy: {
  [filter.sortBy]: filter.sortOrder
}
```

学习点：

```text
对象里的 [filter.sortBy] 是动态 key。

如果 filter.sortBy 是 "createdAt"，
最终对象就等价于：

{
  createdAt: "desc"
}
```

---

## Step 5: 更新 TodoRepository filter 类型

打开：

```text
apps/api/src/modules/todos/todos.repository.ts
```

先检查 import。

如果这里有没用到的类型，例如 `CreateProjectWithTodosInput`、`ProjectWithTodos`，请删掉。

然后从 shared 加上：

```ts
(ListSortBy, SortOrder);
```

在 `ListTodosFilter` 里加：

```ts
sortBy: ListSortBy;
sortOrder: SortOrder;
```

---

## Step 6: 更新 Prisma Todo repository

打开：

```text
apps/api/src/modules/todos/todos.prisma-repository.ts
```

把：

```ts
orderBy: {
  createdAt: "asc";
}
```

改成：

```ts
orderBy: {
  [filter.sortBy]: filter.sortOrder
}
```

---

## Step 7: 更新 Todo service fake repository

打开：

```text
apps/api/tests/unit/todos.service.test.ts
```

你之前写的 fake repository 里有 `findAll(filter)`。

现在需要让内存数据也按 `createdAt` 排序：

```ts
async findAll(filter) {
  const filteredTodos = todos.filter((todo) => todo.projectId === filter.projectId);

  const sortedTodos = [...filteredTodos].sort((left, right) => {
    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();

    return filter.sortOrder === "asc" ? leftTime - rightTime : rightTime - leftTime;
  });

  const startIndex = (filter.page - 1) * filter.pageSize;
  const pageTodos = sortedTodos.slice(startIndex, startIndex + filter.pageSize);

  return {
    data: pageTodos,
    meta: {
      page: filter.page,
      pageSize: filter.pageSize,
      total: filteredTodos.length,
      totalPages: Math.ceil(filteredTodos.length / filter.pageSize)
    }
  };
}
```

注意：

```text
用 [...filteredTodos].sort(...)，不要直接 filteredTodos.sort(...)。
```

这是为了保持不可变习惯：排序会修改数组本身，所以先复制一份再排序。

---

## Step 8: 更新 schema 单元测试

打开：

```text
apps/api/tests/unit/pagination-query-schema.test.ts
```

默认值断言要改成：

```ts
expect(result).toEqual({
  page: 1,
  pageSize: 10,
  sortBy: "createdAt",
  sortOrder: "asc"
});
```

新增测试：

```ts
it("支持按创建时间倒序排序", () => {
  const result = paginationQuerySchema.parse({
    sortBy: "createdAt",
    sortOrder: "desc"
  });

  expect(result).toEqual({
    page: 1,
    pageSize: 10,
    sortBy: "createdAt",
    sortOrder: "desc"
  });
});
```

打开：

```text
apps/api/tests/unit/list-query-schema.test.ts
```

把 plans/todos 的断言也补上 `sortBy` 和 `sortOrder`。

---

## Step 9: 更新 repository 单元测试

打开：

```text
apps/api/tests/unit/plans.prisma-repository.test.ts
apps/api/tests/unit/todos.prisma-repository.test.ts
```

找所有 `repository.findAll({ ... })`。

每个 filter 都要补：

```ts
sortBy: "createdAt",
sortOrder: "asc"
```

再各新增一个排序测试。

plans 示例：

```ts
it("按创建时间倒序返回 plans", async () => {
  const repository = createPrismaPlanRepository();
  const owner = await createTestUser("plans-sort-owner@example.com");

  await repository.create({ title: "Older plan" }, owner.id);
  await repository.create({ title: "Newer plan" }, owner.id);

  const result = await repository.findAll({
    userId: owner.id,
    page: 1,
    pageSize: 10,
    sortBy: "createdAt",
    sortOrder: "desc"
  });

  expect(result.data.map((plan) => plan.title)).toEqual(["Newer plan", "Older plan"]);
});
```

todos 示例：

```ts
it("按创建时间倒序返回 todos", async () => {
  const repository = createPrismaTodoRepository();
  const owner = await createTestUser("todo-sort-owner@example.com");
  const project = await createTestProject(owner.id, "Todo sort project");

  await repository.create({ title: "Older todo" }, project.id);
  await repository.create({ title: "Newer todo" }, project.id);

  const result = await repository.findAll({
    projectId: project.id,
    page: 1,
    pageSize: 10,
    sortBy: "createdAt",
    sortOrder: "desc"
  });

  expect(result.data.map((todo) => todo.title)).toEqual(["Newer todo", "Older todo"]);
});
```

---

## Step 10: 更新 integration tests

打开：

```text
apps/api/tests/integration/plans.test.ts
apps/api/tests/integration/todos.test.ts
```

各新增一个测试：

plans：

```ts
it("按创建时间倒序返回当前用户的 plans", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "plans-sort@example.com");

  await request(app).post("/plans").set(authHeader(auth.token)).send({ title: "Older plan" });
  await request(app).post("/plans").set(authHeader(auth.token)).send({ title: "Newer plan" });

  const response = await request(app)
    .get("/plans?sortBy=createdAt&sortOrder=desc")
    .set(authHeader(auth.token));

  expect(response.status).toBe(200);
  expect(response.body.data.map((plan: { title: string }) => plan.title)).toEqual([
    "Newer plan",
    "Older plan"
  ]);
});
```

todos：

```ts
it("按创建时间倒序返回当前项目的 todos", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "todos-sort@example.com");
  const project = await createProject(app, auth.token, "Todo sort project");

  await createTodo(app, auth.token, project.id, "Older todo");
  await createTodo(app, auth.token, project.id, "Newer todo");

  const response = await request(app)
    .get(`/projects/${project.id}/todos?sortBy=createdAt&sortOrder=desc`)
    .set(authHeader(auth.token));

  expect(response.status).toBe(200);
  expect(response.body.data.map((todo: { title: string }) => todo.title)).toEqual([
    "Newer todo",
    "Older todo"
  ]);
});
```

---

## Step 11: 跑测试

先跑本任务相关测试：

```bash
npm run test -w @learn/api -- tests/unit/pagination-query-schema.test.ts tests/unit/list-query-schema.test.ts tests/unit/plans.prisma-repository.test.ts tests/unit/todos.prisma-repository.test.ts tests/unit/todos.service.test.ts tests/integration/plans.test.ts tests/integration/todos.test.ts
```

再跑类型检查：

```bash
npm run typecheck
```

如果都过，再跑全量：

```bash
npm run test
npm run format:check
npm run build
```

完成后告诉我：

```text
列表排序完成了
```

然后我会继续帮你：

- 跑完整验证。
- 检查排序参数有没有从 query 传到 repository。
- 补更细的中文注释。
- 更新任务索引。
- 给下一张任务卡。
