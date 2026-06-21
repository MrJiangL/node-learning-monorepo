# Task: Redis 缓存入门：Project 列表 cache key 和 TTL

## 背景

你已经完成了 Redis 连接入门：

```text
Node API 能连接 Redis，并能执行 PING。
```

下一步不要急着把 Redis 接进真实 `/projects` API。

先练一个更基础、也更容易犯错的点：

```text
缓存 key 怎么设计？
```

如果缓存 key 设计错了，就可能出现：

```text
用户 A 看到用户 B 的项目列表
第 1 页缓存被第 2 页覆盖
升序缓存被倒序查询误用
```

所以这张任务先写一个纯函数：

```text
根据 Project 列表查询参数生成稳定的 cache key。
```

---

## 你会练到什么

- 为什么缓存 key 必须包含 userId
- 为什么分页参数也必须进入 cache key
- 为什么 sortBy / sortOrder 也属于 key 的一部分
- 什么是 TTL
- 为什么缓存 helper 适合先写 unit test
- 为什么这一步暂时不需要连接真实 Redis

---

## 任务 1：创建 cache key helper

创建：

```text
apps/api/src/cache/project-cache-key.ts
```

写入：

```ts
import type { ListSortBy, SortOrder } from "@learn/shared";

export type ProjectListCacheKeyInput = {
  userId: string;
  page: number;
  pageSize: number;
  sortBy: ListSortBy;
  sortOrder: SortOrder;
};

// Project 列表缓存的 TTL，单位是秒。
//
// TTL = time to live，也就是这份缓存最多存活多久。
// 这里先用 60 秒，是为了学习阶段容易观察：
// - 时间太短，看不出缓存效果
// - 时间太长，后面做缓存失效时容易困惑
export const PROJECT_LIST_CACHE_TTL_SECONDS = 60;

// 生成 Project 列表缓存 key。
//
// 一个缓存 key 必须能唯一描述“一次查询”。
// Project 列表跟当前用户、分页、排序都有关，所以这些参数都必须进入 key。
export const createProjectListCacheKey = (input: ProjectListCacheKeyInput) => {
  return [
    "projects",
    "list",
    `user:${input.userId}`,
    `page:${input.page}`,
    `pageSize:${input.pageSize}`,
    `sortBy:${input.sortBy}`,
    `sortOrder:${input.sortOrder}`
  ].join(":");
};
```

---

## 任务 2：创建单元测试

创建：

```text
apps/api/tests/unit/project-cache-key.test.ts
```

写入：

```ts
import { describe, expect, it } from "vitest";
import {
  createProjectListCacheKey,
  PROJECT_LIST_CACHE_TTL_SECONDS
} from "../../src/cache/project-cache-key.js";

describe("project list cache key", () => {
  it("生成包含用户、分页和排序参数的 Project 列表缓存 key", () => {
    const key = createProjectListCacheKey({
      userId: "user-1",
      page: 2,
      pageSize: 20,
      sortBy: "createdAt",
      sortOrder: "desc"
    });

    expect(key).toBe(
      "projects:list:user:user-1:page:2:pageSize:20:sortBy:createdAt:sortOrder:desc"
    );
  });

  it("不同用户会生成不同缓存 key", () => {
    const userOneKey = createProjectListCacheKey({
      userId: "user-1",
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc"
    });

    const userTwoKey = createProjectListCacheKey({
      userId: "user-2",
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc"
    });

    expect(userOneKey).not.toBe(userTwoKey);
  });

  it("不同分页会生成不同缓存 key", () => {
    const firstPageKey = createProjectListCacheKey({
      userId: "user-1",
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc"
    });

    const secondPageKey = createProjectListCacheKey({
      userId: "user-1",
      page: 2,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc"
    });

    expect(firstPageKey).not.toBe(secondPageKey);
  });

  it("Project 列表缓存 TTL 是 60 秒", () => {
    expect(PROJECT_LIST_CACHE_TTL_SECONDS).toBe(60);
  });
});
```

---

## 任务 3：理解为什么这一步不连 Redis

这张任务只写纯函数，不需要真实 Redis。

原因是：

```text
cache key 设计是纯逻辑。
```

纯逻辑应该优先用 unit test 验证。

如果一上来就连 Redis，你会同时面对：

- key 是否正确
- Redis 是否连接成功
- set / get 是否正确
- JSON 序列化是否正确
- TTL 是否生效

这样学习负担会一下子变大。

所以先把 key 设计单独练清楚。

---

## 任务 4：运行验证

先跑新增单元测试：

```bash
npm run test -w @learn/api -- tests/unit/project-cache-key.test.ts
```

再跑 Redis ping，确认 Redis 仍然可用：

```bash
npm run redis:ping -w @learn/api
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

- [ ] 创建 `apps/api/src/cache/project-cache-key.ts`
- [ ] 导出 `PROJECT_LIST_CACHE_TTL_SECONDS`
- [ ] 导出 `createProjectListCacheKey`
- [ ] cache key 包含 `userId`
- [ ] cache key 包含 `page`
- [ ] cache key 包含 `pageSize`
- [ ] cache key 包含 `sortBy`
- [ ] cache key 包含 `sortOrder`
- [ ] 创建 `apps/api/tests/unit/project-cache-key.test.ts`
- [ ] 测试描述使用中文
- [ ] `npm run test -w @learn/api -- tests/unit/project-cache-key.test.ts` 通过
- [ ] `npm run redis:ping -w @learn/api` 输出 `Redis ping result: PONG`
- [ ] `npm run typecheck -w @learn/api` 通过
- [ ] `npm run build -w @learn/api` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
Project 缓存 key 和 TTL 完成了
```
