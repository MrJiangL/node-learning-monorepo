import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import { authHeader, cleanupDatabase, registerAndLogin } from "../helpers/api-test-helpers.js";

describe("plans API", () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  it("rejects listing plans without authentication", async () => {
    const app = createApp();

    const response = await request(app).get("/plans");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("rejects creating a plan without authentication", async () => {
    const app = createApp();

    // Act：不带 Authorization header，直接请求受保护接口。
    //
    // 这里不是忘了 set(authHeader(...))，
    // 而是故意不传 token，用来证明未登录用户不能创建计划。
    const response = await request(app).post("/plans").send({
      title: "Should not be created"
    });

    // Assert：requireAuth 应该在 route 处理创建逻辑之前拦截请求。
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");

    // Assert：为了证明没有副作用，再查一次数据库。
    //
    // 权限测试很重要的一点：
    // 不能只看响应状态码，还要确认数据真的没有被写进去。
    const count = await prisma.plan.count();
    expect(count).toBe(0);
  });

  it("creates and lists learning plans for the current user", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "owner@example.com");

    const createResponse = await request(app)
      .post("/plans")
      .set(authHeader(auth.token))
      .send({ title: "30 days of Node", description: "Rebuild backend basics" });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data).toMatchObject({
      title: "30 days of Node",
      description: "Rebuild backend basics",
      status: "active",
      userId: auth.user.id
    });

    const listResponse = await request(app).get("/plans").set(authHeader(auth.token));

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0].title).toBe("30 days of Node");
  });

  it("rejects invalid plan input for an authenticated user", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "invalid-input@example.com");

    const response = await request(app)
      .post("/plans")
      .set(authHeader(auth.token))
      .send({ title: "" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("gets a learning plan by id for its owner", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "get-owner@example.com");

    const createResponse = await request(app)
      .post("/plans")
      .set(authHeader(auth.token))
      .send({ title: "Learn route params", difficulty: "easy" });

    const planId = createResponse.body.data.id;

    const getResponse = await request(app).get(`/plans/${planId}`).set(authHeader(auth.token));

    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toMatchObject({
      success: true,
      data: {
        id: planId,
        title: "Learn route params",
        difficulty: "easy",
        userId: auth.user.id
      }
    });
  });

  it("returns 404 when a learning plan does not exist for the current user", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "missing-owner@example.com");

    const response = await request(app).get("/plans/missing-plan-id").set(authHeader(auth.token));

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PLAN_NOT_FOUND");
  });

  it("updates a learning plan by id for its owner", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "update-owner@example.com");

    const createResponse = await request(app)
      .post("/plans")
      .set(authHeader(auth.token))
      .send({ title: "Original title", description: "Before update", difficulty: "medium" });

    const planId = createResponse.body.data.id;

    const updateResponse = await request(app)
      .patch(`/plans/${planId}`)
      .set(authHeader(auth.token))
      .send({ title: "Updated title", difficulty: "hard" });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toMatchObject({
      success: true,
      data: {
        id: planId,
        title: "Updated title",
        description: "Before update",
        difficulty: "hard",
        status: "active",
        userId: auth.user.id
      }
    });
  });

  it("returns 404 when updating a missing learning plan", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "missing-update@example.com");

    const response = await request(app)
      .patch("/plans/missing-plan-id")
      .set(authHeader(auth.token))
      .send({ title: "This should not exist" });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PLAN_NOT_FOUND");
  });

  it("deletes a learning plan by id for its owner", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "delete-owner@example.com");

    const createResponse = await request(app)
      .post("/plans")
      .set(authHeader(auth.token))
      .send({ title: "Plan to delete", difficulty: "easy" });

    const planId = createResponse.body.data.id;

    const deleteResponse = await request(app)
      .delete(`/plans/${planId}`)
      .set(authHeader(auth.token));

    expect(deleteResponse.status).toBe(204);
    expect(deleteResponse.text).toBe("");

    const getResponse = await request(app).get(`/plans/${planId}`).set(authHeader(auth.token));

    expect(getResponse.status).toBe(404);
    expect(getResponse.body.error.code).toBe("PLAN_NOT_FOUND");
  });

  it("returns 404 when deleting a missing learning plan", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "missing-delete@example.com");

    const response = await request(app)
      .delete("/plans/missing-plan-id")
      .set(authHeader(auth.token));

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PLAN_NOT_FOUND");
  });

  it("filters current user's learning plans by difficulty", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "filter-owner@example.com");

    await request(app)
      .post("/plans")
      .set(authHeader(auth.token))
      .send({ title: "Easy plan", difficulty: "easy" });
    await request(app)
      .post("/plans")
      .set(authHeader(auth.token))
      .send({ title: "Hard plan", difficulty: "hard" });
    await request(app)
      .post("/plans")
      .set(authHeader(auth.token))
      .send({ title: "Another easy plan", difficulty: "easy" });

    const response = await request(app).get("/plans?difficulty=easy").set(authHeader(auth.token));

    expect(response.status).toBe(200);
    expect(response.body.data.map((plan: { title: string }) => plan.title)).toEqual([
      "Easy plan",
      "Another easy plan"
    ]);
    expect(
      response.body.data.every((plan: { difficulty: string }) => plan.difficulty === "easy")
    ).toBe(true);
  });

  it("rejects invalid difficulty filters for an authenticated user", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "bad-filter@example.com");

    const response = await request(app)
      .get("/plans?difficulty=impossible")
      .set(authHeader(auth.token));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("paginates current user's learning plans", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "page-owner@example.com");

    await request(app).post("/plans").set(authHeader(auth.token)).send({ title: "Plan 1" });
    await request(app).post("/plans").set(authHeader(auth.token)).send({ title: "Plan 2" });
    await request(app).post("/plans").set(authHeader(auth.token)).send({ title: "Plan 3" });

    const response = await request(app).get("/plans?page=1&pageSize=2").set(authHeader(auth.token));

    expect(response.status).toBe(200);
    expect(response.body.data.map((plan: { title: string }) => plan.title)).toEqual([
      "Plan 1",
      "Plan 2"
    ]);
    expect(response.body.meta).toEqual({
      page: 1,
      pageSize: 2,
      total: 3,
      totalPages: 2
    });
  });

  it("returns the requested page of current user's learning plans", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "page-two-owner@example.com");

    await request(app).post("/plans").set(authHeader(auth.token)).send({ title: "Plan 1" });
    await request(app).post("/plans").set(authHeader(auth.token)).send({ title: "Plan 2" });
    await request(app).post("/plans").set(authHeader(auth.token)).send({ title: "Plan 3" });

    const response = await request(app).get("/plans?page=2&pageSize=2").set(authHeader(auth.token));

    expect(response.status).toBe(200);
    expect(response.body.data.map((plan: { title: string }) => plan.title)).toEqual(["Plan 3"]);
    expect(response.body.meta).toEqual({
      page: 2,
      pageSize: 2,
      total: 3,
      totalPages: 2
    });
  });

  it("按创建时间倒序返回当前用户的 plans", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "plans-sort@example.com");

    const olderResponse = await request(app)
      .post("/plans")
      .set(authHeader(auth.token))
      .send({ title: "Older plan" });
    const newerResponse = await request(app)
      .post("/plans")
      .set(authHeader(auth.token))
      .send({ title: "Newer plan" });

    // 直接设置 createdAt，让排序测试不依赖数据库写入速度。
    // 否则两条数据创建太快时，时间戳可能非常接近，排序断言会变得不稳定。
    await prisma.plan.update({
      where: { id: olderResponse.body.data.id },
      data: { createdAt: new Date("2026-01-01T00:00:00.000Z") }
    });
    await prisma.plan.update({
      where: { id: newerResponse.body.data.id },
      data: { createdAt: new Date("2026-01-02T00:00:00.000Z") }
    });

    const response = await request(app)
      .get("/plans?sortBy=createdAt&sortOrder=desc")
      .set(authHeader(auth.token));

    expect(response.status).toBe(200);
    expect(response.body.data.map((plan: { title: string }) => plan.title)).toEqual([
      "Newer plan",
      "Older plan"
    ]);
  });

  it("rejects invalid pagination query for an authenticated user", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "bad-pagination@example.com");

    const response = await request(app)
      .get("/plans?page=0&pageSize=200")
      .set(authHeader(auth.token));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("only lists plans owned by the current user", async () => {
    const app = createApp();
    const ownerA = await registerAndLogin(app, "owner-a@example.com");
    const ownerB = await registerAndLogin(app, "owner-b@example.com");

    await request(app)
      .post("/plans")
      .set(authHeader(ownerA.token))
      .send({ title: "Owner A plan", difficulty: "easy" });

    await request(app)
      .post("/plans")
      .set(authHeader(ownerB.token))
      .send({ title: "Owner B plan", difficulty: "hard" });

    const response = await request(app).get("/plans").set(authHeader(ownerA.token));

    expect(response.status).toBe(200);
    expect(response.body.data.map((plan: { title: string }) => plan.title)).toEqual([
      "Owner A plan"
    ]);
  });

  it("returns 404 when reading another user's plan", async () => {
    const app = createApp();
    const ownerA = await registerAndLogin(app, "reader-a@example.com");
    const ownerB = await registerAndLogin(app, "reader-b@example.com");

    const createResponse = await request(app)
      .post("/plans")
      .set(authHeader(ownerB.token))
      .send({ title: "Owner B private plan" });

    const planId = createResponse.body.data.id;

    const response = await request(app).get(`/plans/${planId}`).set(authHeader(ownerA.token));

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PLAN_NOT_FOUND");
  });

  it("does not update another user's plan", async () => {
    const app = createApp();
    const ownerA = await registerAndLogin(app, "writer-a@example.com");
    const ownerB = await registerAndLogin(app, "writer-b@example.com");

    const createResponse = await request(app)
      .post("/plans")
      .set(authHeader(ownerB.token))
      .send({ title: "Original private plan" });

    const planId = createResponse.body.data.id;

    const response = await request(app)
      .patch(`/plans/${planId}`)
      .set(authHeader(ownerA.token))
      .send({ title: "Hacked title" });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PLAN_NOT_FOUND");

    const ownerBReadResponse = await request(app)
      .get(`/plans/${planId}`)
      .set(authHeader(ownerB.token));

    expect(ownerBReadResponse.body.data.title).toBe("Original private plan");
  });

  it("does not delete another user's plan", async () => {
    const app = createApp();
    const ownerA = await registerAndLogin(app, "deleter-a@example.com");
    const ownerB = await registerAndLogin(app, "deleter-b@example.com");

    const createResponse = await request(app)
      .post("/plans")
      .set(authHeader(ownerB.token))
      .send({ title: "Owner B protected plan" });

    const planId = createResponse.body.data.id;

    const response = await request(app).delete(`/plans/${planId}`).set(authHeader(ownerA.token));

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PLAN_NOT_FOUND");

    const ownerBReadResponse = await request(app)
      .get(`/plans/${planId}`)
      .set(authHeader(ownerB.token));

    expect(ownerBReadResponse.status).toBe(200);
    expect(ownerBReadResponse.body.data.title).toBe("Owner B protected plan");
  });

  it("ignores userId from request body when creating a plan", async () => {
    const app = createApp();

    // Arrange：准备两个用户。
    //
    // ownerA 是真正发请求的人。
    // ownerB 是攻击者试图伪造的目标用户。
    const ownerA = await registerAndLogin(app, "body-owner-a@example.com");
    const ownerB = await registerAndLogin(app, "body-owner-b@example.com");

    // Act：ownerA 带自己的 token 发请求，
    // 但在 body 里偷偷传 ownerB.user.id。
    //
    // 正确的后端必须忽略这个 body.userId。
    // 因为客户端传来的 userId 不可信。
    const response = await request(app).post("/plans").set(authHeader(ownerA.token)).send({
      title: "Created by owner A",

      // 这行是故意传的“坏数据”。
      // 如果后端相信它，计划就会被错误地挂到 ownerB 名下。
      userId: ownerB.user.id
    });

    // Assert：请求本身应该成功，因为 ownerA 是已登录用户。
    expect(response.status).toBe(201);

    // Assert：真正保存下来的 userId 必须是 ownerA.user.id。
    // 这证明 userId 来自 token，而不是 request body。
    expect(response.body.data.userId).toBe(ownerA.user.id);
    expect(response.body.data.userId).not.toBe(ownerB.user.id);

    // 再查数据库做一次“落库结果”确认。
    //
    // response 是 API 返回给用户看的结果；
    // 数据库才是真正保存下来的状态。
    // 权限边界测试最好两边都看，避免接口返回正确但保存错误。
    const savedPlan = await prisma.plan.findUniqueOrThrow({
      where: { id: response.body.data.id as string }
    });

    expect(savedPlan.userId).toBe(ownerA.user.id);
  });

  it("ignores userId from query string when listing plans", async () => {
    const app = createApp();
    const ownerA = await registerAndLogin(app, "query-owner-a@example.com");
    const ownerB = await registerAndLogin(app, "query-owner-b@example.com");

    // Arrange：两个用户各自创建一条计划。
    await request(app).post("/plans").set(authHeader(ownerA.token)).send({ title: "Owner A plan" });

    await request(app).post("/plans").set(authHeader(ownerB.token)).send({ title: "Owner B plan" });

    // Act：ownerA 查询列表，但故意在 query 里传 ownerB 的 userId。
    //
    // 正确行为：
    // service 应该用 request.user.id 覆盖任何外部传入的 userId。
    const response = await request(app)
      .get(`/plans?userId=${ownerB.user.id}`)
      .set(authHeader(ownerA.token));

    // Assert：ownerA 只能看到自己的计划。
    expect(response.status).toBe(200);
    expect(response.body.data.map((plan: { title: string }) => plan.title)).toEqual([
      "Owner A plan"
    ]);
  });
});
