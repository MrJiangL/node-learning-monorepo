import { describe, expect, it } from "vitest";
import { buildTodoListQuery } from "../../src/exercises/todo-list-query-policy.js";

describe("Todo 列表查询策略", () => {
  it("不传参数时使用默认分页和默认排序", () => {
    const result = buildTodoListQuery({});

    expect(result).toEqual({
      page: 1,
      pageSize: 10,
      skip: 0,
      take: 10,
      where: {},
      orderBy: {
        createdAt: "asc"
      }
    });
  });

  it("会把 page 和 pageSize 转成 skip 和 take", () => {
    const result = buildTodoListQuery({
      page: 3,
      pageSize: 20
    });

    expect(result).toMatchObject({
      page: 3,
      pageSize: 20,
      skip: 40,
      take: 20
    });
  });

  it("completed=false 是有效过滤条件", () => {
    const result = buildTodoListQuery({
      completed: false
    });

    expect(result.where).toEqual({
      completed: false
    });
  });

  it("title 会 trim 后生成 contains 搜索条件", () => {
    const result = buildTodoListQuery({
      title: "  report  "
    });

    expect(result.where).toEqual({
      title: {
        contains: "report"
      }
    });
  });

  it("空 title 不生成搜索条件", () => {
    const result = buildTodoListQuery({
      title: "   "
    });

    expect(result.where).toEqual({});
  });
});
