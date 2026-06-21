# Task: Redis 缓存入门：封装 get / set JSON helper

## 背景

上一张任务你完成了 Project 列表 cache key 和 TTL。

现在我们还不直接改 `/projects` API，而是继续补缓存基础设施：

```text
封装 Redis getJson / setJson helper。
```

为什么要先封装？

因为 Redis 原生存的是字符串。

后端业务里我们经常想缓存对象：

```ts
{ success: true, data: [...], meta: {...} }
```

所以需要统一处理：

```text
对象 -> JSON.stringify -> Redis
Redis -> JSON.parse -> 对象
```

这张任务会让你练：

```text
用 Redis client 保存 JSON，并用 TTL 控制缓存存活时间。
```

---

## 你会练到什么

- 为什么 Redis helper 要统一做 JSON 序列化
- `getJson<T>` 为什么需要泛型
- `setJson` 为什么需要 ttlSeconds
- Redis `SET` 的 TTL 参数怎么写
- 为什么这次可以写真实 Redis integration test
- 为什么测试结束要主动清理 key

---

## 任务 1：创建 JSON cache helper

创建：

```text
apps/api/src/cache/redis-json-cache.ts
```

写入：

```ts
import type { RedisClientType } from "redis";

// getJson 从 Redis 里读取字符串，再反序列化成对象。
//
// <T> 是 TypeScript 泛型：
// 调用方可以告诉 helper：“我期望这里读出来是什么类型”。
//
// 注意：JSON.parse 只能在运行时解析数据，
// 它不会真的校验 T 是否正确。
// 后面如果要更严格，可以结合 Zod 做缓存数据校验。
export const getJson = async <T>(client: RedisClientType, key: string): Promise<T | null> => {
  const cachedValue = await client.get(key);

  if (!cachedValue) {
    return null;
  }

  return JSON.parse(cachedValue) as T;
};

// setJson 把对象序列化成字符串，再写入 Redis。
//
// ttlSeconds 是缓存存活时间，单位是秒。
// redis@6 推荐使用 expiration: { type: "EX", value: 秒数 } 来设置 TTL。
export const setJson = async (
  client: RedisClientType,
  key: string,
  value: unknown,
  ttlSeconds: number
) => {
  await client.set(key, JSON.stringify(value), {
    expiration: {
      type: "EX",
      value: ttlSeconds
    }
  });
};
```

---

## 任务 2：创建 Redis JSON helper 测试

创建：

```text
apps/api/tests/integration/redis-json-cache.test.ts
```

写入：

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRedisClient } from "../../src/cache/redis-client.js";
import { getJson, setJson } from "../../src/cache/redis-json-cache.js";

type CachedProjectList = {
  data: Array<{ id: string; name: string }>;
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const client = createRedisClient();

describe("redis json cache helper", () => {
  beforeAll(async () => {
    await client.connect();
  });

  afterAll(async () => {
    await client.quit();
  });

  it("可以写入并读取 JSON 数据", async () => {
    const key = "test:redis-json-cache:project-list";

    // 测试前先删除 key，避免上一次测试留下的数据影响这次判断。
    await client.del(key);

    const value: CachedProjectList = {
      data: [{ id: "project-1", name: "Redis practice" }],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1
      }
    };

    await setJson(client, key, value, 60);

    const cachedValue = await getJson<CachedProjectList>(client, key);

    expect(cachedValue).toEqual(value);

    await client.del(key);
  });

  it("key 不存在时返回 null", async () => {
    const key = "test:redis-json-cache:missing";

    await client.del(key);

    const cachedValue = await getJson<CachedProjectList>(client, key);

    expect(cachedValue).toBeNull();
  });

  it("写入 JSON 数据时会设置 TTL", async () => {
    const key = "test:redis-json-cache:ttl";

    await client.del(key);

    await setJson(client, key, { ok: true }, 60);

    const ttl = await client.ttl(key);

    // TTL 会随着时间流逝减少，所以不要精确断言等于 60。
    // 这里确认它在一个合理范围内即可。
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);

    await client.del(key);
  });
});
```

---

## 任务 3：理解为什么这是 integration test

这个测试会真的连接 Redis。

所以它不是 unit test，而是 integration test。

原因是我们要验证：

```text
client.set 是否真的写入 Redis
client.get 是否真的读出 Redis
client.ttl 是否真的能看到过期时间
```

这类行为不能只靠纯函数单元测试证明。

---

## 任务 4：运行验证

先确认 Redis 还在：

```bash
npm run redis:ping -w @learn/api
```

再跑新增测试：

```bash
npm run test -w @learn/api -- tests/integration/redis-json-cache.test.ts
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

- [ ] 创建 `apps/api/src/cache/redis-json-cache.ts`
- [ ] 导出 `getJson<T>`
- [ ] 导出 `setJson`
- [ ] `getJson` 在 key 不存在时返回 `null`
- [ ] `setJson` 使用 `JSON.stringify`
- [ ] `setJson` 使用 `expiration: { type: "EX", value: ttlSeconds }`
- [ ] 创建 `apps/api/tests/integration/redis-json-cache.test.ts`
- [ ] 测试描述使用中文
- [ ] 测试覆盖写入并读取 JSON
- [ ] 测试覆盖 key 不存在返回 `null`
- [ ] 测试覆盖写入时设置 TTL
- [ ] `npm run redis:ping -w @learn/api` 输出 `Redis ping result: PONG`
- [ ] `npm run test -w @learn/api -- tests/integration/redis-json-cache.test.ts` 通过
- [ ] `npm run typecheck -w @learn/api` 通过
- [ ] `npm run build -w @learn/api` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
Redis JSON helper 完成了
```
