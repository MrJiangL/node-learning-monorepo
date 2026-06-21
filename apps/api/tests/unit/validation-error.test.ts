import { z } from "zod";
import { describe, expect, it } from "vitest";
import { AppError } from "../../src/errors/app-error.js";
import { mapZodErrorToAppError } from "../../src/http/validation-error.js";

describe("validation error helper", () => {
  it("把 Zod body 错误转换成 AppError", () => {
    const schema = z.object({
      title: z.string().min(1, "Title is required")
    });

    const result = schema.safeParse({
      title: ""
    });

    if (result.success) {
      throw new Error("这个测试需要 safeParse 失败");
    }

    expect(() => mapZodErrorToAppError(result.error, "body")).toThrow(AppError);

    try {
      mapZodErrorToAppError(result.error, "body");
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Title is required"
      });
    }
  });

  it("把 Zod query 错误转换成 AppError", () => {
    const schema = z.object({
      page: z.coerce.number().int().min(1, "Page must be at least 1")
    });

    const result = schema.safeParse({
      page: "0"
    });

    if (result.success) {
      throw new Error("这个测试需要 safeParse 失败");
    }

    try {
      mapZodErrorToAppError(result.error, "query");
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Page must be at least 1"
      });
    }
  });

  it("非 ZodError 会继续抛出原错误", () => {
    const originalError = new Error("Database failed");

    expect(() => mapZodErrorToAppError(originalError, "body")).toThrow(originalError);
  });
});
