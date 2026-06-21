import request from "supertest";
import type { createApp } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import type { ErrorCode } from "../../src/errors/error-code.js";

type TestApp = ReturnType<typeof createApp>;

// TestAuth 是集成测试里最常用的“登录后身份”。
//
// token 用来设置 Authorization header。
//
// 注意：登录接口现在返回的字段叫 accessToken。
// 测试 helper 继续把它命名为 token，是为了让业务测试保持简洁：
// 这些测试只关心“我有一个能访问受保护 API 的 token”，不需要关心登录响应字段名。
// user 用来断言资源是不是属于当前登录用户。
export type TestAuth = {
  token: string;
  user: {
    id: string;
    email: string;
  };
};

export async function cleanupDatabase() {
  // 清理顺序要从“依赖别人”的表到“被依赖”的表。
  //
  // ActivityLog 同时依赖 Project 和 User，Todo 依赖 Project，Project / Plan 依赖 User。
  // UserSession 也依赖 User。
  // 所以先清 ActivityLog / Todo，再清 Project / Plan，最后清 User。
  // 这样测试不会依赖数据库的级联删除行为，可读性也更稳定。
  await prisma.activityLog.deleteMany();
  await prisma.todo.deleteMany();
  await prisma.project.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.user.deleteMany();
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function registerAndLogin(
  app: TestApp,
  email: string,
  name = "Test User"
): Promise<TestAuth> {
  // 集成测试这里故意走真实注册和登录流程，而不是手写假 token。
  //
  // 这样能覆盖完整链路：
  // /auth/register -> /auth/login -> requireAuth -> 业务 API。
  await request(app).post("/auth/register").send({
    email,
    password: "password123",
    name
  });

  const loginResponse = await request(app).post("/auth/login").send({
    email,
    password: "password123"
  });

  return {
    token: loginResponse.body.data.accessToken as string,
    user: loginResponse.body.data.user as { id: string; email: string }
  };
}

export async function createProject(app: TestApp, token: string, name: string) {
  // 通过 API 创建 Project，而不是直接 prisma.project.create。
  //
  // 因为这是 integration helper，它应该帮助测试走真实 HTTP 行为。
  const response = await request(app).post("/projects").set(authHeader(token)).send({ name });

  return response.body.data as {
    id: string;
    name: string;
    userId: string;
  };
}

export async function createTodo(
  app: TestApp,
  token: string,
  projectId: string,
  title: string,
  input: { dueDate?: string } = {}
) {
  const response = await request(app)
    .post(`/projects/${projectId}/todos`)
    .set(authHeader(token))
    .send({ title, ...input });

  return response.body.data as {
    id: string;
    title: string;
    completed: boolean;
    projectId: string;
  };
}

export function expectApiError(
  response: { status: number; body: { error?: { code?: string } } },
  status: number,
  code: ErrorCode
) {
  // 这个 helper 只封装重复断言，不隐藏测试意图。
  //
  // 测试里仍然能清楚看到：
  // - 期望哪个 HTTP status
  // - 期望哪个业务错误码
  expect(response.status).toBe(status);
  expect(response.body.error?.code).toBe(code);
}
