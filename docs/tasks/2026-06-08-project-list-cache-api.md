# Task: Redis 缓存入门：把 Project 列表缓存接入 API

## 背景

你已经完成了三块缓存能力：

```text
1. Project list cache key
2. Redis JSON get / set helper
3. Project list cache read / invalidation helper
```

现在要把它们接进真实 API：

```text
GET /projects
```

这张任务先做两件事：

```text
1. GET /projects 优先读 Redis 缓存
2. POST /projects 创建成功后清理当前用户的列表缓存
```

先只接 `GET` 和 `POST`，不要一次性把 `PATCH / DELETE` 都接进去。

原因是学习阶段要把链路拆清楚：

```text
读缓存 -> 写数据库 -> 清缓存
```

---

## 你会练到什么

- API route 怎么使用缓存 helper
- 为什么 `GET /projects` 要把 `userId` 拼进 filter
- 为什么 `POST /projects` 创建成功后要删除列表缓存
- 为什么测试里要显式传入 Redis client
- 什么是简单的依赖注入
- 为什么不要让普通 API 测试都默认连接 Redis

---

## 核心理解：为什么要给 createApp 传 Redis client

现在大部分 API 测试都是这样：

```ts
const app = createApp();
```

如果我们在 `createApp()` 里默认连接 Redis，会让所有测试都依赖 Redis。

这会带来两个问题：

```text
1. 非缓存测试也必须启动 Redis
2. Redis client 如果不关闭，测试可能留下连接
```

所以这张任务用一个更可控的方式：

```ts
const app = createApp({ projectCacheClient: client });
```

意思是：

```text
只有这个测试明确传 Redis client 时，Project route 才启用缓存。
没传时，Project route 继续走原来的数据库查询。
```

这就是后端里很常见的“依赖注入”。

---

## 任务 1：让 createApp 支持传入 Project cache client

修改：

```text
apps/api/src/app.ts
```

新增 import：

```ts
import type { RedisClientType } from "redis";
```

在 `createApp` 上方新增类型：

```ts
export type CreateAppOptions = {
  projectCacheClient?: RedisClientType;
};
```

把：

```ts
export function createApp() {
```

改成：

```ts
export function createApp(options: CreateAppOptions = {}) {
```

把：

```ts
app.use("/projects", createProjectsRouter());
```

改成：

```ts
app.use(
  "/projects",
  createProjectsRouter({
    redisClient: options.projectCacheClient
  })
);
```

---

## 任务 2：让 Project router 支持 Redis client 选项

修改：

```text
apps/api/src/modules/projects/projects.routes.ts
```

新增 import：

```ts
import type { RedisClientType } from "redis";
import {
  deleteProjectListCacheByUserId,
  getCachedProjectList
} from "../../cache/project-list-cache.js";
```

在 `createProjectsRouter` 上方新增类型：

```ts
type CreateProjectsRouterOptions = {
  redisClient?: RedisClientType;
};
```

把：

```ts
export function createProjectsRouter() {
```

改成：

```ts
export function createProjectsRouter(options: CreateProjectsRouterOptions = {}) {
```

---

## 任务 3：GET /projects 接入缓存读取

继续修改：

```text
apps/api/src/modules/projects/projects.routes.ts
```

找到 `projectsRouter.get("/")` 里的这段：

```ts
const query = listProjectsQuerySchema.parse(request.query);
const result = await projectService.listProjects(query, request.user!.id);

response.json({ success: true, data: result.data, meta: result.meta });
```

替换成：

```ts
const query = listProjectsQuerySchema.parse(request.query);
const currentUserId = request.user!.id;

// GET /projects 是列表查询，适合读缓存。
//
// filter 里必须包含 currentUserId：
// - 缓存 key 需要 userId
// - 数据库查询也必须按当前用户过滤
//
// 如果没有传 redisClient，就保持原来的行为，直接查询数据库。
const result = options.redisClient
  ? await getCachedProjectList(options.redisClient, { ...query, userId: currentUserId }, () =>
      projectService.listProjects(query, currentUserId)
    )
  : await projectService.listProjects(query, currentUserId);

response.json({ success: true, data: result.data, meta: result.meta });
```

---

## 任务 4：POST /projects 创建成功后清理列表缓存

继续修改：

```text
apps/api/src/modules/projects/projects.routes.ts
```

找到 `projectsRouter.post("/")` 里的：

```ts
const project = await projectService.createProject(input, request.user!.id);
```

替换成：

```ts
const currentUserId = request.user!.id;
const project = await projectService.createProject(input, currentUserId);

// 创建 Project 后，当前用户的 Project 列表缓存都可能变旧。
//
// 例如第一页缓存里还没有刚创建的新 Project。
// 所以创建成功后要清理当前用户的列表缓存。
if (options.redisClient) {
  await deleteProjectListCacheByUserId(options.redisClient, currentUserId);
}
```

注意：

```text
先成功创建 Project，再清理缓存。
```

不要反过来。

原因是如果数据库创建失败，我们不需要清缓存。

---

## 任务 5：创建 API 缓存测试

创建：

```text
apps/api/tests/integration/projects-cache-api.test.ts
```

写入：

```ts
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { createProjectListCacheKey } from "../../src/cache/project-cache-key.js";
import { createRedisClient } from "../../src/cache/redis-client.js";
import { setJson } from "../../src/cache/redis-json-cache.js";
import { prisma } from "../../src/db/prisma.js";
import { authHeader, cleanupDatabase, registerAndLogin } from "../helpers/api-test-helpers.js";

const client = createRedisClient();

describe("projects API cache", () => {
  beforeAll(async () => {
    await client.connect();
  });

  beforeEach(async () => {
    await cleanupDatabase();
    await client.flushDb();
  });

  afterAll(async () => {
    await client.quit();
  });

  it("GET /projects 优先返回 Redis 缓存里的列表数据", async () => {
    const app = createApp({ projectCacheClient: client });
    const auth = await registerAndLogin(app, "project-cache-api-read@example.com");

    await prisma.project.create({
      data: {
        name: "Database project",
        userId: auth.user.id
      }
    });

    const cacheKey = createProjectListCacheKey({
      userId: auth.user.id,
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc"
    });

    await setJson(
      client,
      cacheKey,
      {
        data: [
          {
            id: "cached-project-1",
            name: "Cached project",
            description: "来自 Redis 缓存",
            createdAt: "2026-06-08T00:00:00.000Z",
            updatedAt: "2026-06-08T00:00:00.000Z",
            userId: auth.user.id
          }
        ],
        meta: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1
        }
      },
      60
    );

    const response = await request(app).get("/projects").set(authHeader(auth.token));

    expect(response.status).toBe(200);
    expect(response.body.data.map((project: { name: string }) => project.name)).toEqual([
      "Cached project"
    ]);
  });

  it("POST /projects 创建成功后会清理当前用户的 Project 列表缓存", async () => {
    const app = createApp({ projectCacheClient: client });
    const auth = await registerAndLogin(app, "project-cache-api-create@example.com");

    const cacheKey = createProjectListCacheKey({
      userId: auth.user.id,
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc"
    });

    await setJson(
      client,
      cacheKey,
      { data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } },
      60
    );

    const response = await request(app)
      .post("/projects")
      .set(authHeader(auth.token))
      .send({ name: "Project created after cached list" });

    expect(response.status).toBe(201);
    expect(await client.get(cacheKey)).toBeNull();
  });
});
```

---

## 任务 6：格式化测试里的长行

上面这行会比较长：

```ts
await setJson(
  client,
  cacheKey,
  { data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } },
  60
);
```

你可以先照着写，然后直接跑：

```bash
npm run format
```

Prettier 会帮你整理成项目统一格式。

---

## 任务 7：运行验证

先确认 Redis 还活着：

```bash
npm run redis:ping -w @learn/api
```

再跑新增 API 缓存测试：

```bash
npm run test -w @learn/api -- tests/integration/projects-cache-api.test.ts
```

再跑原本的 Project API 测试，确认没有破坏旧行为：

```bash
npm run test -w @learn/api -- tests/integration/projects.test.ts
```

再跑类型检查：

```bash
npm run typecheck -w @learn/api
```

再跑构建：

```bash
npm run build -w @learn/api
```

最后跑格式检查：

```bash
npm run format:check
```

如果格式检查不通过：

```bash
npm run format
npm run format:check
```

---

## 完成标准

- [ ] `createApp` 支持 `projectCacheClient`
- [ ] `createProjectsRouter` 支持可选 `redisClient`
- [ ] 没传 `redisClient` 时，`GET /projects` 保持原来的数据库查询行为
- [ ] 传了 `redisClient` 时，`GET /projects` 使用 `getCachedProjectList`
- [ ] `GET /projects` 的缓存 filter 包含当前登录用户 `userId`
- [ ] `POST /projects` 创建成功后调用 `deleteProjectListCacheByUserId`
- [ ] 新增 `projects-cache-api.test.ts`
- [ ] 测试描述使用中文
- [ ] 测试覆盖 `GET /projects` 优先返回 Redis 缓存
- [ ] 测试覆盖 `POST /projects` 创建成功后清理缓存
- [ ] `npm run redis:ping -w @learn/api` 输出 `Redis ping result: PONG`
- [ ] `npm run test -w @learn/api -- tests/integration/projects-cache-api.test.ts` 通过
- [ ] `npm run test -w @learn/api -- tests/integration/projects.test.ts` 通过
- [ ] `npm run typecheck -w @learn/api` 通过
- [ ] `npm run build -w @learn/api` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
Project 列表缓存接入 API 完成了
```
