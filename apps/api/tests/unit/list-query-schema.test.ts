import { describe, expect, it } from "vitest";
import { paginationQuerySchema } from "../../src/http/pagination-query-schema.js";
import { listPlansQuerySchema } from "../../src/modules/plans/plans.schema.js";
import { listTodosQuerySchema } from "../../src/modules/todos/todos.schema.js";

describe("list query schemas", () => {
  it("plans 列表同时支持分页和 difficulty 过滤", () => {
    const result = listPlansQuerySchema.parse({
      page: "2",
      pageSize: "10",
      difficulty: "easy",
      sortBy: "createdAt",
      sortOrder: "asc"
    });

    expect(result).toEqual({
      page: 2,
      pageSize: 10,
      difficulty: "easy",
      sortBy: "createdAt",
      sortOrder: "asc"
    });
  });

  it("todos 列表复用分页默认值", () => {
    const result = listTodosQuerySchema.parse({});

    expect(result).toEqual({
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc"
    });
  });

  it("支持按创建时间倒序排序", () => {
    const result = paginationQuerySchema.parse({
      sortBy: "createdAt",
      sortOrder: "desc"
    });

    expect(result).toEqual({
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "desc"
    });
  });
});
