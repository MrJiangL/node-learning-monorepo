import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createRateLimiter } from "../../src/middleware/rate-limit.js";

function createTestApp() {
  const app = express();

  app.get(
    "/limited",
    createRateLimiter({
      windowMs: 60_000,
      max: 2
    }),
    (_request, response) => {
      response.json({ success: true });
    }
  );

  return app;
}

describe("rate limit middleware", () => {
  it("达到限制之前允许请求通过", async () => {
    const app = createTestApp();

    const firstResponse = await request(app).get("/limited");
    const secondResponse = await request(app).get("/limited");

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
  });

  it("超过限制后返回 429", async () => {
    const app = createTestApp();

    await request(app).get("/limited");
    await request(app).get("/limited");

    const blockedResponse = await request(app).get("/limited");

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.body).toEqual({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests, please try again later"
      }
    });
  });
});
