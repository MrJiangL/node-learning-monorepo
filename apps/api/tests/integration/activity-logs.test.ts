import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import {
  authHeader,
  cleanupDatabase,
  createProject,
  createTodo,
  registerAndLogin
} from "../helpers/api-test-helpers.js";

describe("activity logs API", () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  it("未登录不能查看 Project 活动记录", async () => {
    const app = createApp();

    const response = await request(app).get("/projects/project-1/activity-logs");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("未登录不能查看用户级活动记录", async () => {
    const app = createApp();

    const response = await request(app).get("/activity-logs");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("当前用户可以查看自己 Project 下的活动记录", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "activity-log-owner@example.com");

    const project = await createProject(app, auth.token, "Activity Log Project");
    const todo = await createTodo(app, auth.token, project.id, "Logged todo");

    await request(app)
      .patch(`/todos/${todo.id}`)
      .set(authHeader(auth.token))
      .send({ completed: true });

    const response = await request(app)
      .get(`/projects/${project.id}/activity-logs`)
      .set(authHeader(auth.token));

    const actions = response.body.data.map((log: { action: string }) => log.action);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(actions).toContain("project.created");
    expect(actions).toContain("todo.created");
    expect(actions).toContain("todo.completed");
    expect(response.body.meta.total).toBe(3);
  });

  it("当前用户可以查看自己跨 Project 的活动记录", async () => {
    const app = createApp();
    const owner = await registerAndLogin(app, "activity-log-user-feed-owner@example.com");
    const anotherUser = await registerAndLogin(app, "activity-log-user-feed-other@example.com");

    const firstProject = await createProject(app, owner.token, "First Feed Project");
    const secondProject = await createProject(app, owner.token, "Second Feed Project");
    const anotherProject = await createProject(app, anotherUser.token, "Other Feed Project");

    await createTodo(app, owner.token, firstProject.id, "Owner first todo");
    await createTodo(app, owner.token, secondProject.id, "Owner second todo");
    await createTodo(app, anotherUser.token, anotherProject.id, "Other todo");

    const response = await request(app).get("/activity-logs").set(authHeader(owner.token));
    const messages = response.body.data.map((log: { message: string }) => log.message);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(messages.some((message: string) => message.includes("First Feed Project"))).toBe(true);
    expect(messages.some((message: string) => message.includes("Second Feed Project"))).toBe(true);
    expect(messages.some((message: string) => message.includes("Other Feed Project"))).toBe(false);
    expect(
      response.body.data.every((log: { userId: string }) => log.userId === owner.user.id)
    ).toBe(true);
  });

  it("用户级活动记录支持分页和 action 过滤", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "activity-log-user-feed-filter@example.com");
    const firstProject = await createProject(app, auth.token, "Filtered Feed Project");
    const secondProject = await createProject(app, auth.token, "Filtered Feed Project 2");

    await createTodo(app, auth.token, firstProject.id, "First filtered todo");
    await createTodo(app, auth.token, secondProject.id, "Second filtered todo");

    const response = await request(app)
      .get("/activity-logs?action=todo.created&page=1&pageSize=1")
      .set(authHeader(auth.token));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].action).toBe("todo.created");
    expect(response.body.meta).toEqual({
      page: 1,
      pageSize: 1,
      total: 2,
      totalPages: 2
    });
  });

  it("用户级活动记录不会允许 query userId 越权查看别人日志", async () => {
    const app = createApp();
    const owner = await registerAndLogin(app, "activity-log-userid-owner@example.com");
    const anotherUser = await registerAndLogin(app, "activity-log-userid-other@example.com");
    const ownerProject = await createProject(app, owner.token, "Owner UserId Project");
    const anotherProject = await createProject(app, anotherUser.token, "Other UserId Project");

    await createTodo(app, owner.token, ownerProject.id, "Owner todo");
    await createTodo(app, anotherUser.token, anotherProject.id, "Other todo");

    const response = await request(app)
      .get(`/activity-logs?userId=${anotherUser.user.id}`)
      .set(authHeader(owner.token));

    const messages = response.body.data.map((log: { message: string }) => log.message);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(messages.some((message: string) => message.includes("Owner UserId Project"))).toBe(true);
    expect(messages.some((message: string) => message.includes("Other UserId Project"))).toBe(
      false
    );
    expect(
      response.body.data.every((log: { userId: string }) => log.userId === owner.user.id)
    ).toBe(true);
  });

  it("不能查看别人的 Project 活动记录", async () => {
    const app = createApp();
    const owner = await registerAndLogin(app, "activity-log-owner-a@example.com");
    const anotherUser = await registerAndLogin(app, "activity-log-owner-b@example.com");

    const project = await createProject(app, anotherUser.token, "Private Project");
    await createTodo(app, anotherUser.token, project.id, "Private Todo");

    const response = await request(app)
      .get(`/projects/${project.id}/activity-logs`)
      .set(authHeader(owner.token));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual([]);
    expect(response.body.meta.total).toBe(0);
  });

  it("活动记录支持分页 meta", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "activity-log-page@example.com");
    const project = await createProject(app, auth.token, "Paged Activity Project");

    await createTodo(app, auth.token, project.id, "Todo 1");
    await createTodo(app, auth.token, project.id, "Todo 2");
    await createTodo(app, auth.token, project.id, "Todo 3");

    const response = await request(app)
      .get(`/projects/${project.id}/activity-logs?page=1&pageSize=2`)
      .set(authHeader(auth.token));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta).toEqual({
      page: 1,
      pageSize: 2,
      total: 4,
      totalPages: 2
    });
  });

  it("Project 删除后仍然可以通过快照查询到 project.deleted 日志", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "activity-log-delete@example.com");
    const project = await createProject(app, auth.token, "Deleted Activity Project");

    const deleteResponse = await request(app)
      .delete(`/projects/${project.id}`)
      .set(authHeader(auth.token));

    const logsResponse = await request(app)
      .get(`/projects/${project.id}/activity-logs`)
      .set(authHeader(auth.token));

    const deletedLog = logsResponse.body.data.find(
      (log: { action: string }) => log.action === "project.deleted"
    );

    expect(deleteResponse.status).toBe(204);
    expect(logsResponse.status).toBe(200);
    expect(deletedLog).toMatchObject({
      action: "project.deleted",
      message: "删除了项目 Deleted Activity Project",
      metadata: {
        projectName: "Deleted Activity Project"
      },
      projectId: null,
      projectSnapshotId: project.id,
      projectSnapshotName: "Deleted Activity Project"
    });
  });

  it("可以按 action 查询 Project 活动记录", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "activity-log-action-filter@example.com");

    const project = await createProject(app, auth.token, "Action Filter Project");
    const todo = await createTodo(app, auth.token, project.id, "Complete filtered todo");

    await request(app)
      .patch(`/todos/${todo.id}`)
      .set(authHeader(auth.token))
      .send({ completed: true });

    const response = await request(app)
      .get(`/projects/${project.id}/activity-logs?action=todo.completed`)
      .set(authHeader(auth.token));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      action: "todo.completed",
      metadata: {
        todoId: todo.id,
        title: "Complete filtered todo",
        changedFields: ["completed"]
      },
      projectSnapshotId: project.id,
      projectSnapshotName: "Action Filter Project"
    });
    expect(response.body.meta).toMatchObject({
      total: 1,
      totalPages: 1
    });
  });

  it("action 参数非法时返回校验错误", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "activity-log-bad-action@example.com");
    const project = await createProject(app, auth.token, "Bad Action Project");

    const response = await request(app)
      .get(`/projects/${project.id}/activity-logs?action=bad.action`)
      .set(authHeader(auth.token));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("createdAfter 参数非法时返回校验错误", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "activity-log-bad-created-after@example.com");
    const project = await createProject(app, auth.token, "Bad Created After Project");

    const response = await request(app)
      .get(`/projects/${project.id}/activity-logs?createdAfter=not-a-date`)
      .set(authHeader(auth.token));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("createdBefore 参数非法时返回校验错误", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "activity-log-bad-created-before@example.com");
    const project = await createProject(app, auth.token, "Bad Created Before Project");

    const response = await request(app)
      .get(`/projects/${project.id}/activity-logs?createdBefore=not-a-date`)
      .set(authHeader(auth.token));

    // 这条测试只验证 API query validation：非法日期应该在 HTTP 层被 Zod 拦截成 400。
    // 真正的时间范围查询是否正确，应该交给 repository / service 层测试去覆盖。
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
