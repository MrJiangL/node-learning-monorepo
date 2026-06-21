# Task: Paginate Projects

## 目标

现在 Project 列表接口是：

```text
GET /projects
```

它目前返回当前用户的所有 Project 数组。

这一张任务把它改成和 plans / todos 一样的分页响应：

```text
GET /projects?page=1&pageSize=10&sortBy=createdAt&sortOrder=desc
```

响应格式改成：

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "total": 0,
    "totalPages": 0
  }
}
```

你要练的是：

- 把 `ProjectRepository.findAllByUserId(userId)` 升级成 `findAll(filter)`。
- 复用 `paginationQuerySchema`。
- Prisma `skip/take/count/orderBy` 再练一遍。
- 更新 service / route / tests。
- `it(...)` 描述继续用中文。

---

## Step 1: 更新 ProjectRepository 接口

打开：

```text
apps/api/src/modules/projects/projects.repository.ts
```

把 shared import 改成包含：

```ts
(ListSortBy, PaginatedResult, SortOrder);
```

新增 filter 类型：

```ts
export type ListProjectsFilter = {
  userId: string;
  page: number;
  pageSize: number;
  sortBy: ListSortBy;
  sortOrder: SortOrder;
};
```

把：

```ts
findAllByUserId(userId: string): Promise<Project[]>;
```

改成：

```ts
findAll(filter: ListProjectsFilter): Promise<PaginatedResult<Project>>;
```

中文注释参考：

```ts
// 查询当前用户自己的 Project 列表。
//
// Project 是强归属资源，所以 userId 必须在 filter 里。
// route 不允许客户端传 userId；service 会从当前登录用户里补进去。
findAll(filter: ListProjectsFilter): Promise<PaginatedResult<Project>>;
```

---

## Step 2: 更新 Prisma Project repository

打开：

```text
apps/api/src/modules/projects/projects.prisma-repository.ts
```

导入 `ListProjectsFilter`：

```ts
import type { ListProjectsFilter, ProjectRepository } from "./projects.repository.js";
```

把 `findAllByUserId` 改成：

```ts
async findAll(filter: ListProjectsFilter): Promise<PaginatedResult<Project>> {
  const where = {
    userId: filter.userId
  };

  const skip = (filter.page - 1) * filter.pageSize;

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: filter.pageSize,
      orderBy: {
        [filter.sortBy]: filter.sortOrder
      }
    }),
    prisma.project.count({ where })
  ]);

  return {
    data: projects.map(mapPrismaProjectToProject),
    meta: {
      page: filter.page,
      pageSize: filter.pageSize,
      total,
      totalPages: Math.ceil(total / filter.pageSize)
    }
  };
},
```

注意：

```text
findMany 和 count 必须使用同一个 where。
```

---

## Step 3: 更新 Project service

打开：

```text
apps/api/src/modules/projects/projects.service.ts
```

导入类型：

```ts
import type {
  CreateProjectInput,
  CreateProjectWithTodosInput,
  ListSortBy,
  SortOrder
} from "@learn/shared";
```

把：

```ts
listProjects(currentUserId: string) {
  return projectRepository.findAllByUserId(currentUserId);
}
```

改成：

```ts
listProjects(
  pagination: { page: number; pageSize: number; sortBy: ListSortBy; sortOrder: SortOrder },
  currentUserId: string
) {
  // Project 列表和 Plan 列表一样，userId 必须来自当前登录用户。
  //
  // 客户端只能控制分页和排序，不能控制“查谁的项目”。
  return projectRepository.findAll({
    userId: currentUserId,
    page: pagination.page,
    pageSize: pagination.pageSize,
    sortBy: pagination.sortBy,
    sortOrder: pagination.sortOrder
  });
}
```

---

## Step 4: 更新 Project schema

打开：

```text
apps/api/src/modules/projects/projects.schema.ts
```

导入：

```ts
import { paginationQuerySchema } from "../../http/pagination-query-schema.js";
```

新增：

```ts
// GET /projects 的 query schema。
//
// Project 列表目前只需要分页和排序参数，所以直接复用 paginationQuerySchema。
export const listProjectsQuerySchema = paginationQuerySchema;
```

---

## Step 5: 更新 Project routes

打开：

```text
apps/api/src/modules/projects/projects.routes.ts
```

把 schema import 改成：

```ts
import {
  createProjectSchema,
  createProjectWithTodosSchema,
  listProjectsQuerySchema
} from "./projects.schema.js";
```

把 GET `/projects` 改成：

```ts
projectsRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    try {
      const query = listProjectsQuerySchema.parse(request.query);
      const result = await projectService.listProjects(query, request.user!.id);

      response.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      mapZodErrorToAppError(error, "query");
    }
  })
);
```

---

## Step 6: 更新 Project service 单元测试

打开：

```text
apps/api/tests/unit/projects.service.test.ts
```

fake repository 里把：

```ts
async findAllByUserId(userId) {
  return projects.filter((project) => project.userId === userId);
}
```

改成：

```ts
async findAll(filter) {
  const filteredProjects = projects.filter((project) => project.userId === filter.userId);
  const sortedProjects = [...filteredProjects].sort((left, right) => {
    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();

    return filter.sortOrder === "asc" ? leftTime - rightTime : rightTime - leftTime;
  });

  const startIndex = (filter.page - 1) * filter.pageSize;
  const pageProjects = sortedProjects.slice(startIndex, startIndex + filter.pageSize);

  return {
    data: pageProjects,
    meta: {
      page: filter.page,
      pageSize: filter.pageSize,
      total: filteredProjects.length,
      totalPages: Math.ceil(filteredProjects.length / filter.pageSize)
    }
  };
}
```

把 service 调用从：

```ts
const result = await service.listProjects("user-1");
```

改成：

```ts
const result = await service.listProjects(
  {
    page: 1,
    pageSize: 10,
    sortBy: "createdAt",
    sortOrder: "asc"
  },
  "user-1"
);
```

断言从：

```ts
expect(result.map((project) => project.name)).toEqual(["User 1 project"]);
```

改成：

```ts
expect(result.data.map((project) => project.name)).toEqual(["User 1 project"]);
expect(result.meta.total).toBe(1);
```

---

## Step 7: 更新 Project repository 单元测试

打开：

```text
apps/api/tests/unit/projects.prisma-repository.test.ts
```

把 `repository.findAllByUserId(owner.id)` 改成：

```ts
const result = await repository.findAll({
  userId: owner.id,
  page: 1,
  pageSize: 10,
  sortBy: "createdAt",
  sortOrder: "asc"
});
```

断言从：

```ts
expect(result.map((project) => project.name)).toEqual(["Owner project 1", "Owner project 2"]);
expect(result.every((project) => project.userId === owner.id)).toBe(true);
```

改成：

```ts
expect(result.data.map((project) => project.name)).toEqual(["Owner project 1", "Owner project 2"]);
expect(result.data.every((project) => project.userId === owner.id)).toBe(true);
expect(result.meta).toEqual({
  page: 1,
  pageSize: 10,
  total: 2,
  totalPages: 1
});
```

新增分页测试：

```ts
it("分页返回当前用户的 projects", async () => {
  const repository = createPrismaProjectRepository();
  const owner = await createTestUser("project-page-owner@example.com");

  await repository.create({ name: "Project 1" }, owner.id);
  await repository.create({ name: "Project 2" }, owner.id);
  await repository.create({ name: "Project 3" }, owner.id);

  const result = await repository.findAll({
    userId: owner.id,
    page: 2,
    pageSize: 2,
    sortBy: "createdAt",
    sortOrder: "asc"
  });

  expect(result.data.map((project) => project.name)).toEqual(["Project 3"]);
  expect(result.meta).toEqual({
    page: 2,
    pageSize: 2,
    total: 3,
    totalPages: 2
  });
});
```

---

## Step 8: 更新 Project API integration test

打开：

```text
apps/api/tests/integration/projects.test.ts
```

已有列表测试需要从数组响应改成 `data + meta`。

把：

```ts
expect(listResponse.body.data.map((project: { name: string }) => project.name)).toEqual([
  "Node Learning Project"
]);
```

保留，并新增：

```ts
expect(listResponse.body.meta).toEqual({
  page: 1,
  pageSize: 10,
  total: 1,
  totalPages: 1
});
```

新增分页测试：

```ts
it("分页返回当前用户的 projects", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "project-page@example.com");

  await request(app).post("/projects").set(authHeader(auth.token)).send({ name: "Project 1" });
  await request(app).post("/projects").set(authHeader(auth.token)).send({ name: "Project 2" });
  await request(app).post("/projects").set(authHeader(auth.token)).send({ name: "Project 3" });

  const response = await request(app)
    .get("/projects?page=2&pageSize=2")
    .set(authHeader(auth.token));

  expect(response.status).toBe(200);
  expect(response.body.data.map((project: { name: string }) => project.name)).toEqual([
    "Project 3"
  ]);
  expect(response.body.meta).toEqual({
    page: 2,
    pageSize: 2,
    total: 3,
    totalPages: 2
  });
});
```

新增非法 query 测试：

```ts
it("拒绝非法 project 分页参数", async () => {
  const app = createApp();
  const auth = await registerAndLogin(app, "project-bad-page@example.com");

  const response = await request(app).get("/projects?page=0").set(authHeader(auth.token));

  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe("VALIDATION_ERROR");
});
```

---

## Step 9: 更新 smoke 脚本

打开：

```text
apps/api/src/scripts/api-smoke.ts
```

如果脚本里有：

```ts
const projects = listProjectsResponse.data;
```

或类似“直接把响应当数组”的逻辑，要改成读取：

```ts
const projects = listProjectsResponse.data;
```

注意：

```text
这里要看脚本里的 API response helper 怎么封装。
```

目标是：

```text
Project count visible to current user: 1
```

继续能正常输出。

---

## Step 10: 跑测试

先跑本任务相关测试：

```bash
npm run test -w @learn/api -- tests/unit/projects.prisma-repository.test.ts tests/unit/projects.service.test.ts tests/integration/projects.test.ts
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
npm run smoke:api -w @learn/api
```

完成后告诉我：

```text
Project 分页完成了
```

然后我会继续帮你：

- 跑完整验证。
- 检查 Project 列表响应是否和 plans/todos 风格一致。
- 补更细的中文注释。
- 更新任务索引。
- 给下一张任务卡。
