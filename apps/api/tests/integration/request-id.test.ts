import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

describe("request id middleware", () => {
  it("没有传 x-request-id 时会生成 X-Request-Id 响应头", async () => {
    const app = createApp();

    const response = await request(app).get("/health");
    const responseRequestId = response.headers["x-request-id"];

    expect(response.status).toBe(200);
    expect(responseRequestId).toEqual(expect.any(String));
    expect(responseRequestId?.length).toBeGreaterThan(0);
  });

  it("传入 x-request-id 时会沿用传入值", async () => {
    const app = createApp();

    const response = await request(app).get("/health").set("x-request-id", "test-request-id");

    expect(response.status).toBe(200);
    expect(response.headers["x-request-id"]).toBe("test-request-id");
  });
});
