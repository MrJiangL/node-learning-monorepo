import { describe, expect, it } from "vitest";
import {
  createProjectListCacheKey,
  createProjectListCachePattern,
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

  it("不同排序方向会生成不同缓存 key", () => {
    const ascendingKey = createProjectListCacheKey({
      userId: "user-1",
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc"
    });

    const descendingKey = createProjectListCacheKey({
      userId: "user-1",
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "desc"
    });

    expect(ascendingKey).not.toBe(descendingKey);
  });

  it("Project 列表缓存 TTL 是 60 秒", () => {
    expect(PROJECT_LIST_CACHE_TTL_SECONDS).toBe(60);
  });

  it("生成用于删除某个用户所有 Project 列表缓存的 pattern", () => {
    const pattern = createProjectListCachePattern("user-1");

    expect(pattern).toBe("projects:list:user:user-1:*");
  });
});
