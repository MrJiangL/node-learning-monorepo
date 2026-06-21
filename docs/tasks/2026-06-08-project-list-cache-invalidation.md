# Task: Redis 缓存入门：Project 列表缓存失效

## 背景

你已经完成了 Project 列表缓存读取：

```text
Redis 有缓存：直接返回缓存
Redis 没缓存：调用 loader，然后写入缓存
```

但是现在还有一个关键问题：

```text
如果用户创建、更新、删除了 Project，旧的列表缓存怎么办？
```

如果不清理缓存，用户可能看到旧数据。

例如：

```text
1. 用户打开 Project 列表，Redis 缓存了第一页
2. 用户创建了一个新 Project
3. 用户再次打开 Project 列表
4. 如果缓存没删，用户可能看不到刚创建的 Project
```

所以这张任务要练：

```text
按 userId 删除这个用户的 Project 列表缓存。
```

---

## 你会练到什么

- 为什么缓存读取之后必须学习缓存失效
- 为什么创建 / 更新 / 删除 Project 后要清理列表缓存
- 为什么失效时只删除当前用户的缓存
- 为什么缓存 pattern 只包含 `userId`，不包含 page / sort
- 为什么真实项目里更推荐 `SCAN`，而不是直接用 `KEYS`

---

## 核心理解：为什么只传 userId

Project 列表缓存 key 长这样：

```text
projects:list:user:user-1:page:1:pageSize:10:sortBy:createdAt:sortOrder:desc
projects:list:user:user-1:page:2:pageSize:10:sortBy:createdAt:sortOrder:desc
projects:list:user:user-1:page:1:pageSize:20:sortBy:createdAt:sortOrder:asc
```

当用户创建、更新、删除 Project 时，我们通常不知道哪些分页和排序缓存受影响。

所以失效时不要只删某一页，而是删：

```text
当前用户的所有 Project list 缓存
```

pattern 就是：

```text
projects:list:user:user-1:*
```

这样不会删到其他用户：

```text
projects:list:user:user-2:*
```

---

## 任务 1：给 cache key helper 增加 pattern helper

修改：

```text
apps/api/src/cache/project-cache-key.ts
```

在 `createProjectListCacheKey` 后面新增：

```ts
// 生成某个用户的 Project 列表缓存匹配模式。
//
// 这个 pattern 用在缓存失效时：
// - createProject 后，当前用户的列表缓存都可能过期
// - updateProject 后，列表里的项目名称 / 描述可能变旧
// - deleteProject 后，列表里可能还残留已删除的项目
//
// 注意这里故意只包含 userId，不包含 page / pageSize / sortBy / sortOrder。
// 因为一次写操作可能影响这个用户的所有列表查询结果。
export const createProjectListCachePattern = (userId: string) => {
  return ["projects", "list", `user:${userId}`, "*"].join(":");
};
```

---

## 任务 2：补充 cache key 单元测试

修改：

```text
apps/api/tests/unit/project-cache-key.test.ts
```

把 import 改成包含 `createProjectListCachePattern`：

```ts
import {
  createProjectListCacheKey,
  createProjectListCachePattern,
  PROJECT_LIST_CACHE_TTL_SECONDS
} from "../../src/cache/project-cache-key.js";
```

在现有测试后面新增：

```ts
it("生成用于删除某个用户所有 Project 列表缓存的 pattern", () => {
  const pattern = createProjectListCachePattern("user-1");

  expect(pattern).toBe("projects:list:user:user-1:*");
});
```

---

## 任务 3：在 Project list cache helper 里增加删除函数

修改：

```text
apps/api/src/cache/project-list-cache.ts
```

把 import 改成包含 `createProjectListCachePattern`：

```ts
import {
  createProjectListCacheKey,
  createProjectListCachePattern,
  PROJECT_LIST_CACHE_TTL_SECONDS
} from "./project-cache-key.js";
```

在 `getCachedProjectList` 后面新增：

```ts
// deleteProjectListCacheByUserId 删除某个用户的所有 Project 列表缓存。
//
// 这里用 scanIterator，而不是 client.keys(pattern)。
//
// 原因：
// - KEYS 会一次性扫描整个 Redis keyspace
// - 数据量大时，KEYS 可能阻塞 Redis
// - SCAN 是渐进式扫描，更适合真实服务
//
// 返回 deletedCount 是为了测试和观察：
// 调用方可以知道这次到底删了多少个缓存 key。
export const deleteProjectListCacheByUserId = async (
  client: RedisClientType,
  userId: string
): Promise<number> => {
  const pattern = createProjectListCachePattern(userId);
  let deletedCount = 0;

  for await (const keys of client.scanIterator({
    MATCH: pattern,
    COUNT: 100
  })) {
    if (keys.length === 0) {
      continue;
    }

    deletedCount += await client.del(keys);
  }

  return deletedCount;
};
```

---

## 任务 4：创建缓存失效 integration test

创建：

```text
apps/api/tests/integration/project-list-cache-invalidation.test.ts
```

写入：

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createProjectListCacheKey,
  createProjectListCachePattern
} from "../../src/cache/project-cache-key.js";
import { deleteProjectListCacheByUserId } from "../../src/cache/project-list-cache.js";
import { createRedisClient } from "../../src/cache/redis-client.js";
import { setJson } from "../../src/cache/redis-json-cache.js";

const client = createRedisClient();

describe("project list cache invalidation", () => {
  beforeAll(async () => {
    await client.connect();
  });

  afterAll(async () => {
    await client.quit();
  });

  it("只删除当前用户的 Project 列表缓存", async () => {
    const currentUserId = "user-cache-invalidation-1";
    const otherUserId = "user-cache-invalidation-2";

    const firstPageKey = createProjectListCacheKey({
      userId: currentUserId,
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "desc"
    });

    const secondPageKey = createProjectListCacheKey({
      userId: currentUserId,
      page: 2,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "desc"
    });

    const otherUserKey = createProjectListCacheKey({
      userId: otherUserId,
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "desc"
    });

    // 先清理本测试可能用到的 key，避免之前运行残留影响结果。
    await client.del([firstPageKey, secondPageKey, otherUserKey]);

    await setJson(client, firstPageKey, { page: 1 }, 60);
    await setJson(client, secondPageKey, { page: 2 }, 60);
    await setJson(client, otherUserKey, { page: 1 }, 60);

    const deletedCount = await deleteProjectListCacheByUserId(client, currentUserId);

    expect(deletedCount).toBe(2);
    expect(await client.get(firstPageKey)).toBeNull();
    expect(await client.get(secondPageKey)).toBeNull();
    expect(await client.get(otherUserKey)).not.toBeNull();

    await client.del(otherUserKey);
  });

  it("用户没有 Project 列表缓存时返回 0", async () => {
    const userId = "user-cache-invalidation-empty";
    const pattern = createProjectListCachePattern(userId);

    for await (const keys of client.scanIterator({
      MATCH: pattern,
      COUNT: 100
    })) {
      if (keys.length > 0) {
        await client.del(keys);
      }
    }

    const deletedCount = await deleteProjectListCacheByUserId(client, userId);

    expect(deletedCount).toBe(0);
  });
});
```

---

## 任务 5：运行验证

先跑 cache key 单元测试：

```bash
npm run test -w @learn/api -- tests/unit/project-cache-key.test.ts
```

再确认 Redis 还活着：

```bash
npm run redis:ping -w @learn/api
```

再跑缓存失效测试：

```bash
npm run test -w @learn/api -- tests/integration/project-list-cache-invalidation.test.ts
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

- [ ] `project-cache-key.ts` 导出 `createProjectListCachePattern`
- [ ] pattern 格式是 `projects:list:user:${userId}:*`
- [ ] `project-cache-key.test.ts` 覆盖 pattern 生成
- [ ] `project-list-cache.ts` 导出 `deleteProjectListCacheByUserId`
- [ ] 删除函数使用 `client.scanIterator`
- [ ] 删除函数只删除当前用户的 Project 列表缓存
- [ ] 删除函数返回删除的 key 数量
- [ ] 创建 `project-list-cache-invalidation.test.ts`
- [ ] 测试描述使用中文
- [ ] 测试覆盖“只删除当前用户缓存”
- [ ] 测试覆盖“没有缓存时返回 0”
- [ ] `npm run test -w @learn/api -- tests/unit/project-cache-key.test.ts` 通过
- [ ] `npm run redis:ping -w @learn/api` 输出 `Redis ping result: PONG`
- [ ] `npm run test -w @learn/api -- tests/integration/project-list-cache-invalidation.test.ts` 通过
- [ ] `npm run typecheck -w @learn/api` 通过
- [ ] `npm run build -w @learn/api` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
Project 列表缓存失效完成了
```
