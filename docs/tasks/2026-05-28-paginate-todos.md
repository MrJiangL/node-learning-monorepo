# Task: Paginate Todos

## 目标

现在 Todo 列表接口是：

```text
GET /projects/:projectId/todos
```

它会一次返回项目下所有 Todo。

这一张任务给 Todo 列表加分页，让它支持：

```text
GET /projects/:projectId/todos?page=1&pageSize=10
```

你要练的是：

- Zod 校验 query string。
- Repository 返回 `PaginatedResult<Todo>`。
- Prisma `skip` / `take` / `count`。
- Service 继续保留权限校验。
- Integration test 检查分页结果和 meta。

---

## Step 1: 更新 TodoRepository 接口

打开：

```text
apps/api/src/modules/todos/todos.repository.ts
```

新增类型：

```ts
import type { CreateTodoInput, PaginatedResult, Todo, UpdateTodoInput } from "@learn/shared";

export type ListTodosFilter = {
  projectId: string;
  page: number;
  pageSize: number;
};
```

把：

```ts
findAllByProjectId(projectId: string): Promise<Todo[]>;
```

改成：

```ts
findAll(filter: ListTodosFilter): Promise<PaginatedResult<Todo>>;
```

---

## Step 2: 更新 Prisma Todo Repository

打开：

```text
apps/api/src/modules/todos/todos.prisma-repository.ts
```

把 `findAllByProjectId` 改成 `findAll`。

参考：

```ts
async findAll(filter: ListTodosFilter): Promise<PaginatedResult<Todo>> {
  const where = {
    projectId: filter.projectId
  };

  const skip = (filter.page - 1) * filter.pageSize;

  const [todos, total] = await Promise.all([
    prisma.todo.findMany({
      where,
      skip,
      take: filter.pageSize,
      orderBy: { createdAt: "asc" }
    }),
    prisma.todo.count({ where })
  ]);

  return {
    data: todos.map(mapPrismaTodoToTodo),
    meta: {
      page: filter.page,
      pageSize: filter.pageSize,
      total,
      totalPages: Math.ceil(total / filter.pageSize)
    }
  };
}
```

注意：

```text
findMany 和 count 必须用同一个 where。
```

否则 data 是当前项目的 Todo，但 total 可能是全库 Todo 数量。

---

## Step 3: 更新 Todo Service

打开：

```text
apps/api/src/modules/todos/todos.service.ts
```

把：

```ts
async listTodos(projectId: string, currentUserId: string) {
  await requireOwnedProject(projectId, currentUserId);
  return todoRepository.findAllByProjectId(projectId);
}
```

改成：

```ts
async listTodos(
  projectId: string,
  pagination: { page: number; pageSize: number },
  currentUserId: string
) {
  await requireOwnedProject(projectId, currentUserId);

  return todoRepository.findAll({
    projectId,
    page: pagination.page,
    pageSize: pagination.pageSize
  });
}
```

学习点：

- service 仍然负责权限。
- repository 负责分页查询。
- route 负责解析 query。

---

## Step 4: 更新 Todo schema

打开：

```text
apps/api/src/modules/todos/todos.schema.ts
```

新增：

```ts
export const listTodosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10)
});
```

学习点：

```text
URL query 里的 page/pageSize 原始值都是字符串。
所以这里用 z.coerce.number() 把 "1" 转成 1。
```

---

## Step 5: 更新 Todo Router

打开：

```text
apps/api/src/modules/todos/todos.routes.ts
```

导入：

```ts
import { createTodoSchema, listTodosQuerySchema, updateTodoSchema } from "./todos.schema.js";
```

在 `GET /projects/:projectId/todos` 里解析 query：

```ts
try {
  const query = listTodosQuerySchema.parse(request.query);
  const result = await todoService.listTodos(
    request.params.projectId as string,
    query,
    request.user!.id
  );

  response.json({ success: true, data: result.data, meta: result.meta });
} catch (error) {
  if (error instanceof ZodError) {
    throw new AppError(400, "VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid query string");
  }

  throw error;
}
```

---

## Step 6: 更新测试

你需要改这些测试：

```text
apps/api/tests/unit/todos.prisma-repository.test.ts
apps/api/tests/unit/todos.service.test.ts
apps/api/tests/integration/todos.test.ts
```

重点新增一个 integration test：

```text
GET /projects/:projectId/todos?page=2&pageSize=2
准备 3 条 Todo
第二页应该只返回第 3 条
meta 应该是：
{
  page: 2,
  pageSize: 2,
  total: 3,
  totalPages: 2
}
```

---

## Step 7: 跑测试

先跑 Todo 相关测试：

```bash
npm run test -w @learn/api -- tests/unit/todos.prisma-repository.test.ts tests/unit/todos.service.test.ts tests/integration/todos.test.ts
```

再跑全量：

```bash
npm run test
npm run typecheck
npm run format:check
npm run build
npm run smoke:api -w @learn/api
```

---

## 验收标准

完成后告诉我：

```text
Todo 分页完成了
```

我会帮你：

- 检查 repository 分页是否正确。
- 检查 service 权限是否仍然存在。
- 检查 route 是否返回 `data + meta`。
- 补详细中文注释。
- 跑完整验证。
- 出下一张 Prisma transaction 任务卡。
