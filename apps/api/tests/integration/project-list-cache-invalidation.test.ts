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
