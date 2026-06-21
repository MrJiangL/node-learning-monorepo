import { describe, expect, it } from "vitest";
import { paginationQuerySchema } from "../../src/http/pagination-query-schema.js";

describe("pagination query schema", () => {
  it("不传分页参数时使用默认值", () => {
    const result = paginationQuerySchema.parse({});

    expect(result).toEqual({
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc"
    });
  });

  it("把字符串分页参数转换成数字", () => {
    const result = paginationQuerySchema.parse({
      page: "2",
      pageSize: "20"
    });

    expect(result).toEqual({
      page: 2,
      pageSize: 20,
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

  it("拒绝小于 1 的页码", () => {
    const result = paginationQuerySchema.safeParse({
      page: "0",
      pageSize: "10"
    });

    expect(result.success).toBe(false);
  });

  it("拒绝过大的每页数量", () => {
    const result = paginationQuerySchema.safeParse({
      page: "1",
      pageSize: "51"
    });

    expect(result.success).toBe(false);
  });
});
