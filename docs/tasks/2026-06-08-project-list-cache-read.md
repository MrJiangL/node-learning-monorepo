# Task: Redis 缓存入门：Project 列表缓存读取

## 背景

你已经完成了两个缓存基础能力：

```text
1. Project 列表 cache key 和 TTL
2. Redis getJson / setJson helper
```

现在进入真正的缓存读取流程：

```text
查 Project 列表时，先查 Redis。
如果 Redis 有缓存，直接返回缓存。
如果 Redis 没缓存，再调用真实数据源，然后把结果写入 Redis。
```

这张任务先不改 `/projects` API。

原因是我们要先把“缓存读取的编排逻辑”单独练清楚。

等这个 helper 写稳了，下一步再把它接到真实 route / service 里。

---

## 你会练到什么

- 什么叫 cache hit：缓存命中，Redis 有数据
- 什么叫 cache miss：缓存未命中，Redis 没数据
- 为什么缓存 helper 要接收一个 `loadProjects` 函数
- 为什么缓存层不应该直接依赖 Prisma
- 为什么第一次查询会调用数据源，第二次查询不应该再调用
- 怎么用测试证明“缓存真的挡住了一次重复查询”

---

## 核心理解：loadProjects 是什么

你可以先把它理解成：

```ts
const loadProjects = async () => {
  return await projectRepository.findAll(filter);
};
```

也就是说：

```text
loadProjects = 当缓存没有数据时，真正去拿数据的函数。
```

在真实业务里，它可能调用 Prisma repository。

在测试里，我们会写一个假的 loader：

```ts
const loadProjects = async () => {
  loadCount += 1;
  return projectList;
};
```

这样测试就能判断：

```text
第一次：Redis 没缓存，所以 loadCount 变成 1
第二次：Redis 有缓存，所以 loadCount 不应该再增加
```

这就是缓存测试最重要的断言。

---

## 任务 1：创建 Project list cache helper

创建：

```text
apps/api/src/cache/project-list-cache.ts
```

写入：

```ts
import type { PaginatedResult, Project } from "@learn/shared";
import type { RedisClientType } from "redis";
import type { ListProjectsFilter } from "../modules/projects/projects.repository.js";
import { createProjectListCacheKey, PROJECT_LIST_CACHE_TTL_SECONDS } from "./project-cache-key.js";
import { getJson, setJson } from "./redis-json-cache.js";

// loadProjects 表示“缓存没有命中时，真正去加载 Project 列表的函数”。
//
// 这里故意不直接 import Prisma repository：
// - cache helper 只负责缓存流程
// - repository 只负责数据库查询
// - 两者通过 loadProjects 这个函数连接起来
//
// 这种写法的好处是：
// - 测试时可以传 fake loader，不需要真的查数据库
// - 未来如果数据源从 Prisma 换成别的实现，缓存 helper 不需要改
export type LoadProjectList = () => Promise<PaginatedResult<Project>>;

// getCachedProjectList 负责 Project 列表的缓存读取流程。
//
// 流程是：
// 1. 根据 filter 生成稳定的 Redis key
// 2. 先从 Redis 读取缓存
// 3. 如果缓存存在，直接返回缓存结果
// 4. 如果缓存不存在，调用 loadProjects 获取新数据
// 5. 把新数据写入 Redis，并设置 TTL
// 6. 返回新数据
export const getCachedProjectList = async (
  client: RedisClientType,
  filter: ListProjectsFilter,
  loadProjects: LoadProjectList
): Promise<PaginatedResult<Project>> => {
  const cacheKey = createProjectListCacheKey(filter);

  const cachedResult = await getJson<PaginatedResult<Project>>(client, cacheKey);

  if (cachedResult) {
    return cachedResult;
  }

  const freshResult = await loadProjects();

  await setJson(client, cacheKey, freshResult, PROJECT_LIST_CACHE_TTL_SECONDS);

  return freshResult;
};
```

---

## 任务 2：创建缓存读取 integration test

创建：

```text
apps/api/tests/integration/project-list-cache.test.ts
```

写入：

```ts
import type { PaginatedResult, Project } from "@learn/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createProjectListCacheKey } from "../../src/cache/project-cache-key.js";
import { getCachedProjectList } from "../../src/cache/project-list-cache.js";
import { createRedisClient } from "../../src/cache/redis-client.js";
import type { ListProjectsFilter } from "../../src/modules/projects/projects.repository.js";

const client = createRedisClient();

const filter: ListProjectsFilter = {
  userId: "user-cache-read-1",
  page: 1,
  pageSize: 10,
  sortBy: "createdAt",
  sortOrder: "desc"
};

const projectList: PaginatedResult<Project> = {
  data: [
    {
      id: "project-cache-read-1",
      name: "Redis cache read practice",
      description: "练习 Project 列表缓存读取",
      createdAt: "2026-06-08T00:00:00.000Z",
      updatedAt: "2026-06-08T00:00:00.000Z",
      userId: filter.userId
    }
  ],
  meta: {
    page: 1,
    pageSize: 10,
    total: 1,
    totalPages: 1
  }
};

describe("project list cache", () => {
  beforeAll(async () => {
    await client.connect();
  });

  afterAll(async () => {
    await client.quit();
  });

  it("缓存未命中时会调用 loader 并把结果写入 Redis", async () => {
    const cacheKey = createProjectListCacheKey(filter);

    // 每个测试开始前先清理 key。
    // 这样可以保证这次测试看到的是“缓存未命中”的状态。
    await client.del(cacheKey);

    let loadCount = 0;

    const loadProjects = async () => {
      loadCount += 1;
      return projectList;
    };

    const result = await getCachedProjectList(client, filter, loadProjects);

    expect(result).toEqual(projectList);
    expect(loadCount).toBe(1);

    const cachedRawValue = await client.get(cacheKey);

    expect(cachedRawValue).not.toBeNull();

    await client.del(cacheKey);
  });

  it("缓存命中时直接返回 Redis 数据，不再调用 loader", async () => {
    const cacheKey = createProjectListCacheKey(filter);

    await client.del(cacheKey);

    // 这里先手动往 Redis 写入缓存。
    // 这样调用 getCachedProjectList 时，它一开始就能读到缓存。
    await client.set(cacheKey, JSON.stringify(projectList), {
      expiration: {
        type: "EX",
        value: 60
      }
    });

    let loadCount = 0;

    const loadProjects = async () => {
      loadCount += 1;
      return {
        data: [],
        meta: {
          page: 1,
          pageSize: 10,
          total: 0,
          totalPages: 0
        }
      };
    };

    const result = await getCachedProjectList(client, filter, loadProjects);

    expect(result).toEqual(projectList);
    expect(loadCount).toBe(0);

    await client.del(cacheKey);
  });
});
```

---

## 任务 3：理解这次为什么还是 integration test

这次测试会真的连 Redis。

原因是我们不是只测纯函数，而是在测：

```text
getJson -> Redis GET
setJson -> Redis SET EX
getCachedProjectList -> cache hit / cache miss 流程
```

所以它放在：

```text
apps/api/tests/integration/
```

这类测试比 unit test 慢一点，但它能证明真实 Redis 行为是通的。

---

## 任务 4：运行验证

先确认 Redis 还活着：

```bash
npm run redis:ping -w @learn/api
```

再跑这张任务的测试：

```bash
npm run test -w @learn/api -- tests/integration/project-list-cache.test.ts
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

- [ ] 创建 `apps/api/src/cache/project-list-cache.ts`
- [ ] 导出 `LoadProjectList`
- [ ] 导出 `getCachedProjectList`
- [ ] 使用 `createProjectListCacheKey(filter)` 生成缓存 key
- [ ] 先用 `getJson` 读取 Redis
- [ ] 缓存命中时直接返回缓存结果
- [ ] 缓存未命中时调用 `loadProjects`
- [ ] 缓存未命中后用 `setJson` 写入 Redis
- [ ] 创建 `apps/api/tests/integration/project-list-cache.test.ts`
- [ ] 测试描述使用中文
- [ ] 测试覆盖 cache miss：会调用 loader，并写入 Redis
- [ ] 测试覆盖 cache hit：不会调用 loader
- [ ] `npm run redis:ping -w @learn/api` 输出 `Redis ping result: PONG`
- [ ] `npm run test -w @learn/api -- tests/integration/project-list-cache.test.ts` 通过
- [ ] `npm run typecheck -w @learn/api` 通过
- [ ] `npm run build -w @learn/api` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
Project 列表缓存读取完成了
```
