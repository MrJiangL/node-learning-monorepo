import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import { ERROR_CODE } from "../../src/errors/error-code.js";
import { expectApiError } from "../helpers/api-test-helpers.js";

describe("auth API", () => {
  beforeEach(async () => {
    // 清理顺序要从“依赖别人”的表到“被依赖”的表。
    //
    // UserSession / Plan 都依赖 User，所以先清它们，再清 User。
    // 这样每个注册测试都从干净数据库开始，重复邮箱测试也不会受前一个测试影响。
    await prisma.userSession.deleteMany();
    await prisma.plan.deleteMany();
    await prisma.user.deleteMany();
  });

  it("registers a user without returning passwordHash", async () => {
    const app = createApp();

    const response = await request(app).post("/auth/register").send({
      email: "learner@example.com",
      password: "password123",
      name: "Learning User"
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      email: "learner@example.com",
      name: "Learning User"
    });

    // password 是用户提交的明文，passwordHash 是数据库内部字段。
    // 这两个都不应该出现在 API 响应里。
    expect(response.body.data.password).toBeUndefined();
    expect(response.body.data.passwordHash).toBeUndefined();
  });

  it("stores a password hash instead of the plain password", async () => {
    const app = createApp();

    await request(app).post("/auth/register").send({
      email: "hash@example.com",
      password: "password123"
    });

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: "hash@example.com" }
    });

    expect(user.passwordHash).not.toBe("password123");
    expect(user.passwordHash).toContain(":");
  });

  it("rejects duplicate email registration", async () => {
    const app = createApp();

    await request(app).post("/auth/register").send({
      email: "duplicate@example.com",
      password: "password123"
    });

    const response = await request(app).post("/auth/register").send({
      email: "duplicate@example.com",
      password: "password123"
    });

    expectApiError(response, 409, ERROR_CODE.USER_EMAIL_EXISTS);
  });

  it("登录已注册用户后会返回 accessToken 和 refreshToken", async () => {
    const app = createApp();

    // 先注册一个用户。
    // 登录测试不直接往数据库插数据，而是走真实注册接口，
    // 这样可以同时保证 passwordHash 的生成逻辑也参与进来。
    await request(app).post("/auth/register").send({
      email: "login@example.com",
      password: "password123",
      name: "Login User"
    });

    // 再用同一个 email/password 登录。
    const response = await request(app).post("/auth/login").send({
      email: "login@example.com",
      password: "password123"
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe("login@example.com");

    // JWT 一般由三段组成：header.payload.signature。
    // 这里不解析 accessToken，只先验证它是一个形状正确的字符串。
    expect(typeof response.body.data.accessToken).toBe("string");
    expect(response.body.data.accessToken.split(".")).toHaveLength(3);

    // refreshToken 不是 JWT，它是一段随机字符串。
    // 它的用途是换新的 accessToken，所以响应里也必须返回给客户端。
    expect(typeof response.body.data.refreshToken).toBe("string");
    expect(response.body.data.refreshToken.length).toBeGreaterThan(20);

    // 登录响应同样不能泄露 passwordHash。
    expect(response.body.data.user.passwordHash).toBeUndefined();
  });

  it("登录成功后会创建 session，且数据库不保存 refreshToken 明文", async () => {
    const app = createApp();

    await request(app).post("/auth/register").send({
      email: "session@example.com",
      password: "password123"
    });

    const response = await request(app).post("/auth/login").send({
      email: "session@example.com",
      password: "password123"
    });

    const refreshToken = response.body.data.refreshToken as string;

    const sessions = await prisma.userSession.findMany();

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.refreshTokenHash).not.toBe(refreshToken);
    expect(sessions[0]?.refreshTokenHash).toHaveLength(64);
    expect(sessions[0]?.revokedAt).toBeNull();
    expect(sessions[0]?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects login with a wrong password", async () => {
    const app = createApp();

    await request(app).post("/auth/register").send({
      email: "wrong-password@example.com",
      password: "password123"
    });

    const response = await request(app).post("/auth/login").send({
      email: "wrong-password@example.com",
      password: "bad-password"
    });

    expectApiError(response, 401, ERROR_CODE.INVALID_CREDENTIALS);
  });

  it("returns the current user with a valid token", async () => {
    const app = createApp();

    // 先注册用户。
    await request(app).post("/auth/register").send({
      email: "me@example.com",
      password: "password123",
      name: "Me User"
    });

    // 再登录拿 accessToken。
    const loginResponse = await request(app).post("/auth/login").send({
      email: "me@example.com",
      password: "password123"
    });

    const token = loginResponse.body.data.accessToken;

    // 调用受保护接口时，把 token 放在 Authorization header。
    // 格式必须是 Bearer + 空格 + token。
    const response = await request(app).get("/auth/me").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe("me@example.com");
    expect(response.body.data.passwordHash).toBeUndefined();
  });

  it("使用有效 refreshToken 可以换新的 accessToken", async () => {
    const app = createApp();

    await request(app).post("/auth/register").send({
      email: "refresh@example.com",
      password: "password123",
      name: "Refresh User"
    });

    const loginResponse = await request(app).post("/auth/login").send({
      email: "refresh@example.com",
      password: "password123"
    });

    const response = await request(app).post("/auth/refresh").send({
      refreshToken: loginResponse.body.data.refreshToken
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe("refresh@example.com");
    expect(typeof response.body.data.accessToken).toBe("string");
    expect(response.body.data.accessToken.split(".")).toHaveLength(3);
    expect(response.body.data.refreshToken).not.toBe(loginResponse.body.data.refreshToken);
    expect(response.body.data.user.passwordHash).toBeUndefined();
  });

  it("使用无效 refreshToken 会返回 401", async () => {
    const app = createApp();

    const response = await request(app).post("/auth/refresh").send({
      refreshToken: "not-a-real-refresh-token"
    });

    expectApiError(response, 401, ERROR_CODE.INVALID_REFRESH_TOKEN);
  });

  it("logout 后同一个 refreshToken 不能再刷新 accessToken", async () => {
    const app = createApp();

    await request(app).post("/auth/register").send({
      email: "logout@example.com",
      password: "password123"
    });

    const loginResponse = await request(app).post("/auth/login").send({
      email: "logout@example.com",
      password: "password123"
    });

    const refreshToken = loginResponse.body.data.refreshToken as string;

    const logoutResponse = await request(app).post("/auth/logout").send({
      refreshToken
    });

    expect(logoutResponse.status).toBe(204);
    expect(logoutResponse.text).toBe("");

    const refreshResponse = await request(app).post("/auth/refresh").send({
      refreshToken
    });

    expectApiError(refreshResponse, 401, ERROR_CODE.INVALID_REFRESH_TOKEN);
  });

  it("过期的 refreshToken 不能刷新 accessToken", async () => {
    const app = createApp();

    await request(app).post("/auth/register").send({
      email: "expired-refresh@example.com",
      password: "password123"
    });

    const loginResponse = await request(app).post("/auth/login").send({
      email: "expired-refresh@example.com",
      password: "password123"
    });

    const refreshToken = loginResponse.body.data.refreshToken as string;

    // 这里不是在测试 Prisma 的 updateMany 能不能工作。
    //
    // 我们是故意把刚创建的 session 改成“已经过期”，
    // 用来模拟真实业务里 refresh token 过期后的状态。
    await prisma.userSession.updateMany({
      data: {
        expiresAt: new Date(Date.now() - 1000)
      }
    });

    const response = await request(app).post("/auth/refresh").send({
      refreshToken
    });

    expectApiError(response, 401, ERROR_CODE.INVALID_REFRESH_TOKEN);
  });

  it("rejects auth/me without a token", async () => {
    const app = createApp();

    const response = await request(app).get("/auth/me");

    expectApiError(response, 401, ERROR_CODE.AUTH_REQUIRED);
  });

  it("rejects auth/me with an invalid token", async () => {
    const app = createApp();

    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", "Bearer not-a-real-token");

    expectApiError(response, 401, ERROR_CODE.INVALID_TOKEN);
  });

  it("重复登录失败会被限流", async () => {
    const app = createApp();

    for (let index = 0; index < 5; index += 1) {
      const response = await request(app).post("/auth/login").send({
        email: "missing-user@example.com",
        password: "wrong-password"
      });

      // 前 5 次请求还没触发 limiter。
      //
      // 因为用户不存在，authService 会返回登录失败相关错误；
      // 这个测试不关心具体是 400 还是 401，只关心它不是 429。
      expect(response.status).not.toBe(429);
    }

    const blockedResponse = await request(app).post("/auth/login").send({
      email: "missing-user@example.com",
      password: "wrong-password"
    });

    expectApiError(blockedResponse, 429, ERROR_CODE.RATE_LIMITED);
  });

  it("refresh 成功后会轮换 refreshToken，并让旧 refreshToken 失效", async () => {
    const app = createApp();

    await request(app).post("/auth/register").send({
      email: "rotate-refresh@example.com",
      password: "password123"
    });

    const loginResponse = await request(app).post("/auth/login").send({
      email: "rotate-refresh@example.com",
      password: "password123"
    });

    const oldRefreshToken = loginResponse.body.data.refreshToken as string;

    const refreshResponse = await request(app).post("/auth/refresh").send({
      refreshToken: oldRefreshToken
    });

    expect(refreshResponse.status).toBe(200);

    const newRefreshToken = refreshResponse.body.data.refreshToken as string;

    expect(newRefreshToken).not.toBe(oldRefreshToken);
    expect(typeof refreshResponse.body.data.accessToken).toBe("string");

    const oldTokenResponse = await request(app).post("/auth/refresh").send({
      refreshToken: oldRefreshToken
    });

    expectApiError(oldTokenResponse, 401, ERROR_CODE.INVALID_REFRESH_TOKEN);

    const newTokenResponse = await request(app).post("/auth/refresh").send({
      refreshToken: newRefreshToken
    });

    expect(newTokenResponse.status).toBe(200);
  });
});
