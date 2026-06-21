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

  it("Redis 读取失败时会降级调用 loader 返回数据库结果", async () => {
    let loadCount = 0;

    const failingClient = {
      get: async () => {
        throw new Error("Redis read failed");
      },
      set: async () => "OK"
    };

    const result = await getCachedProjectList(failingClient as never, filter, async () => {
      loadCount += 1;
      return projectList;
    });

    expect(result).toEqual(projectList);
    expect(loadCount).toBe(1);
  });

  it("Redis 写入失败时仍然返回 loader 查询结果", async () => {
    let loadCount = 0;

    const failingClient = {
      get: async () => null,
      set: async () => {
        throw new Error("Redis write failed");
      }
    };

    const result = await getCachedProjectList(failingClient as never, filter, async () => {
      loadCount += 1;
      return projectList;
    });

    expect(result).toEqual(projectList);
    expect(loadCount).toBe(1);
  });

  it("loader 查询失败时不会被缓存降级逻辑吞掉", async () => {
    const fakeClient = {
      get: async () => null,
      set: async () => "OK"
    };

    await expect(
      getCachedProjectList(fakeClient as never, filter, async () => {
        throw new Error("Database failed");
      })
    ).rejects.toThrow("Database failed");
  });
});
