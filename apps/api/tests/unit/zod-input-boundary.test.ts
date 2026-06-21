import { describe, expect, it } from "vitest";
import { listQuerySchema, updateProfileSchema } from "../../src/exercises/zod-input-boundary.js";

describe("Zod 输入边界练习", () => {
  it("updateProfileSchema 会 trim 可选 name", () => {
    const result = updateProfileSchema.parse({
      name: " Lin "
    });

    expect(result).toEqual({
      name: "Lin"
    });
  });

  it("updateProfileSchema 允许不传 name", () => {
    const result = updateProfileSchema.parse({});

    expect(result.name).toBeUndefined();
  });

  it("updateProfileSchema 拒绝空 name", () => {
    expect(() => updateProfileSchema.parse({ name: " " })).toThrow();
  });

  it("bio 支持 null 表示清空", () => {
    const result = updateProfileSchema.parse({
      bio: null
    });

    expect(result.bio).toBeNull();
  });

  it("website 会把空字符串转换成 null", () => {
    const result = updateProfileSchema.parse({
      website: "   "
    });

    expect(result.website).toBeNull();
  });

  it("website 会 trim 非空字符串", () => {
    const result = updateProfileSchema.parse({
      website: "  https://example.com  "
    });

    expect(result.website).toBe("https://example.com");
  });

  it("listQuerySchema 会把 page 和 pageSize 转成数字并填默认值", () => {
    const result = listQuerySchema.parse({});

    expect(result).toEqual({
      page: 1,
      pageSize: 10
    });
  });

  it("listQuerySchema 会解析 completed=true", () => {
    const result = listQuerySchema.parse({
      completed: "true"
    });

    expect(result.completed).toBe(true);
  });

  it("listQuerySchema 会解析 completed=false", () => {
    const result = listQuerySchema.parse({
      completed: "false"
    });

    expect(result.completed).toBe(false);
  });

  it("listQuerySchema 拒绝非法 completed", () => {
    expect(() =>
      listQuerySchema.parse({
        completed: "yes"
      })
    ).toThrow();
  });
});
