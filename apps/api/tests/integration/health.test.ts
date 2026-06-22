import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import { createRequestLogger } from "../../src/middleware/request-logger.js";

describe("GET /health", () => {
  it("does not log requests in test environment", async () => {
    const app = createApp();

    // app.ts 会根据 env.NODE_ENV 决定是否启用请求日志。
    //
    // Vitest 运行时 NODE_ENV 通常是 test，
    // 所以这里期望 GET /health 不会触发 console.log。
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await request(app).get("/health").expect(200);

      expect(logSpy).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
    }
  });

  it("logs requests when request logger is enabled", async () => {
    // 这里不用 createApp()，而是手动组装一个最小 Express app。
    //
    // 原因：createApp() 会根据 env.NODE_ENV 自动关闭测试环境日志。
    // 这个测试想单独验证 requestLogger 的 enabled=true 分支，
    // 所以直接把 createRequestLogger({ enabled: true }) 挂到最小 app 上。
    const app = express();
    app.use(createRequestLogger({ enabled: true }));
    app.get("/health", (_request, response) => {
      response.status(200).json({ success: true });
    });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await request(app).get("/health").expect(200);

      expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^GET \/health 200 \d+ms$/));
    } finally {
      logSpy.mockRestore();
    }
  });

  it("returns API status", async () => {
    const app = createApp();

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        status: "ok",
        service: "node-learning-api"
      }
    });
  });

  it("returns ready status when the database readiness check succeeds", async () => {
    const app = createApp({
      readinessCheck: async () => {
        // 这里模拟数据库检查成功。
        //
        // 真正生产环境里，readinessCheck 会执行一个轻量数据库查询。
      }
    });

    const response = await request(app).get("/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        status: "ready",
        service: "node-learning-api",
        dependencies: {
          database: "ok"
        }
      }
    });
  });

  it("returns 503 without leaking database details when the readiness check fails", async () => {
    const app = createApp({
      readinessCheck: async () => {
        throw new Error("mysql://root:secret@db.example.com:3306/node_learning failed");
      }
    });

    const response = await request(app).get("/ready");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Service is not ready"
      }
    });
    expect(JSON.stringify(response.body)).not.toContain("secret");
    expect(JSON.stringify(response.body)).not.toContain("db.example.com");
  });

  it("returns a JSON 404 for unknown routes", async () => {
    const app = createApp();

    const response = await request(app).get("/missing");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Route GET /missing was not found"
      }
    });
  });
});
