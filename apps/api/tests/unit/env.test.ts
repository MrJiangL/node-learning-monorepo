import { describe, expect, it } from "vitest";
import { parseEnv } from "../../src/config/env.js";

describe("env config", () => {
  it("parses valid environment variables", () => {
    const env = parseEnv({
      PORT: "4000",
      JWT_SECRET: "local-test-secret-123",
      NODE_ENV: "test"
    });

    // PORT 从 process.env 进来时是字符串。
    // parseEnv 后应该变成 number。
    expect(env.PORT).toBe(4000);
    expect(env.JWT_SECRET).toBe("local-test-secret-123");
    expect(env.NODE_ENV).toBe("test");
  });

  it("uses default port when PORT is missing", () => {
    const env = parseEnv({
      JWT_SECRET: "local-test-secret-123"
    });

    expect(env.PORT).toBe(3001);
  });

  it("uses development as the default environment", () => {
    const env = parseEnv({
      JWT_SECRET: "local-test-secret-123"
    });

    expect(env.NODE_ENV).toBe("development");
  });

  it("rejects a short JWT secret", () => {
    // 配置错误应该在启动阶段尽早暴露。
    //
    // 这里用很短的 secret，证明 parseEnv 会拒绝它。
    expect(() =>
      parseEnv({
        PORT: "3001",
        JWT_SECRET: "short"
      })
    ).toThrow("JWT_SECRET must be at least 16 characters");
  });

  it("rejects an invalid port", () => {
    expect(() =>
      parseEnv({
        PORT: "not-a-number",
        JWT_SECRET: "local-test-secret-123"
      })
    ).toThrow();
  });

  it("可以从环境变量解析 worker 配置", () => {
    const env = parseEnv({
      JWT_SECRET: "local-test-secret-123",
      JOB_WORKER_ENABLED: "true",
      JOB_WORKER_INTERVAL_MS: "500"
    });

    expect(env.JOB_WORKER_ENABLED).toBe(true);
    expect(env.JOB_WORKER_INTERVAL_MS).toBe(500);
  });

  it("worker 配置缺失时使用安全默认值", () => {
    const env = parseEnv({
      JWT_SECRET: "local-test-secret-123"
    });

    expect(env.JOB_WORKER_ENABLED).toBe(false);
    expect(env.JOB_WORKER_INTERVAL_MS).toBe(1000);
  });
});
