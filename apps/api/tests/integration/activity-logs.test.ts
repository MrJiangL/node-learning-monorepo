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
