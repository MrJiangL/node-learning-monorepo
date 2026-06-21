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
