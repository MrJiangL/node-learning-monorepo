import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import {
  authHeader,
  cleanupDatabase,
  createProject,
  createTodo,
  registerAndLogin
} from "../helpers/api-test-helpers.js";
import {
  createFactoryProject,
  createFactoryTodo,
  createFactoryUser
} from "../helpers/test-data-factory.js";

describe("todos API", () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  it("rejects creating todos without authentication", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/projects/missing-project-id/todos")
      .send({ title: "Should not be created" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("creates and lists todos for the current user's project", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "todo-owner@example.com");
    const project = await createProject(app, auth.token, "Todo API project");

    const createResponse = await request(app)
      .post(`/projects/${project.id}/todos`)
      .set(authHeader(auth.token))
      .send({
        title: "Write Todo API",
        description: "Create and list endpoint"
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data).toMatchObject({
      title: "Write Todo API",
      description: "Create and list endpoint",
      completed: false,
      projectId: project.id
    });

    const listResponse = await request(app)
      .get(`/projects/${project.id}/todos`)
      .set(authHeader(auth.token));

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data.map((todo: { title: string }) => todo.title)).toEqual([
      "Write Todo API"
    ]);
    expect(listResponse.body.meta).toEqual({
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1
    });
  });

  it("paginates todos for the current user's project", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "todo-page-owner@example.com");
    const project = await createProject(app, auth.token, "Todo page project");

    await createTodo(app, auth.token, project.id, "Todo page 1");
    await createTodo(app, auth.token, project.id, "Todo page 2");
    await createTodo(app, auth.token, project.id, "Todo page 3");

    const response = await request(app)
      .get(`/projects/${project.id}/todos?page=2&pageSize=2`)
      .set(authHeader(auth.token));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // 这是端到端视角的分页验证：
    // route 解析 query -> service 校验权限 -> repository 查第二页数据。
    expect(response.body.data.map((todo: { title: string }) => todo.title)).toEqual([
      "Todo page 3"
    ]);
    expect(response.body.meta).toEqual({
      page: 2,
      pageSize: 2,
      total: 3,
      totalPages: 2
    });
  });

  it("returns validation error for invalid todo pagination query", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "todo-page-invalid@example.com");
    const project = await createProject(app, auth.token, "Invalid pagination project");

    const response = await request(app)
      .get(`/projects/${project.id}/todos?page=0`)
      .set(authHeader(auth.token));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("按创建时间倒序返回当前项目的 todos", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "todos-sort@example.com");
    const project = await createProject(app, auth.token, "Todo sort project");

    const olderTodo = await createTodo(app, auth.token, project.id, "Older todo");
    const newerTodo = await createTodo(app, auth.token, project.id, "Newer todo");

    // 直接设置 createdAt，让排序测试稳定验证“倒序”语义。
    await prisma.todo.update({
      where: { id: olderTodo.id },
      data: { createdAt: new Date("2026-01-01T00:00:00.000Z") }
    });
    await prisma.todo.update({
      where: { id: newerTodo.id },
      data: { createdAt: new Date("2026-01-02T00:00:00.000Z") }
    });

    const response = await request(app)
      .get(`/projects/${project.id}/todos?sortBy=createdAt&sortOrder=desc`)
      .set(authHeader(auth.token));

    expect(response.status).toBe(200);
    expect(response.body.data.map((todo: { title: string }) => todo.title)).toEqual([
      "Newer todo",
      "Older todo"
    ]);
  });

  it("does not create todos in another user's project", async () => {
    const app = createApp();
    const owner = await registerAndLogin(app, "todo-owner-a@example.com");
    const anotherUser = await registerAndLogin(app, "todo-owner-b@example.com");
    const anotherProject = await createProject(app, anotherUser.token, "Another user's project");

    const response = await request(app)
      .post(`/projects/${anotherProject.id}/todos`)
      .set(authHeader(owner.token))
      .send({ title: "Should not be created" });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PROJECT_NOT_FOUND");

    const count = await prisma.todo.count();
    expect(count).toBe(0);
  });

  it("updates the current user's todo completed status", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "todo-toggle-owner@example.com");
    const project = await createProject(app, auth.token, "Toggle project");
    const todo = await createTodo(app, auth.token, project.id, "Toggle me");

    expect(todo.completed).toBe(false);

    const response = await request(app)
      .patch(`/todos/${todo.id}`)
      .set(authHeader(auth.token))
      .send({ completed: true });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: todo.id,
        title: "Toggle me",
        completed: true,
        projectId: project.id
      }
    });
  });

  it("当前用户可以通过 API 更新 todo 的 title 和 dueDate", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "todo-api-update-title-due-date@example.com");
    const project = await createProject(app, auth.token, "Todo API update project");
    const todo = await createTodo(app, auth.token, project.id, "Old API title", {
      dueDate: "2026-05-01"
    });

    const response = await request(app)
      .patch(`/todos/${todo.id}`)
      .set(authHeader(auth.token))
      .send({
        title: "New API title",
        dueDate: "2026-06-01"
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      id: todo.id,
      title: "New API title",
      projectId: project.id
    });

    // API 返回 JSON，没有真正的 Date 类型。
    // dueDate 会以 ISO 字符串返回，所以这里只断言日期部分。
    expect(response.body.data.dueDate).toContain("2026-06-01");
  });

  it("当前用户可以通过 API 清空 todo 的 dueDate", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "todo-api-clear-due-date@example.com");
    const project = await createProject(app, auth.token, "Todo API clear dueDate project");
    const todo = await createTodo(app, auth.token, project.id, "Clear API dueDate", {
      dueDate: "2026-05-01"
    });

    const response = await request(app)
      .patch(`/todos/${todo.id}`)
      .set(authHeader(auth.token))
      .send({
        dueDate: null
      });

    expect(response.status).toBe(200);
    expect(response.body.data.dueDate).toBeNull();
  });

  it("拒绝把 todo title 更新为空字符串", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "todo-api-empty-title@example.com");
    const project = await createProject(app, auth.token, "Todo API invalid title project");
    const todo = await createTodo(app, auth.token, project.id, "Valid title");

    const response = await request(app)
      .patch(`/todos/${todo.id}`)
      .set(authHeader(auth.token))
      .send({
        title: "   "
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("does not update another user's todo", async () => {
    const app = createApp();
    const owner = await registerAndLogin(app, "todo-update-owner-a@example.com");
    const anotherUser = await registerAndLogin(app, "todo-update-owner-b@example.com");
    const anotherProject = await createProject(app, anotherUser.token, "Another todo project");
    const anotherTodo = await createTodo(app, anotherUser.token, anotherProject.id, "Private todo");

    const response = await request(app)
      .patch(`/todos/${anotherTodo.id}`)
      .set(authHeader(owner.token))
      .send({ completed: true });

    expect(response.status).toBe(404);

    const savedTodo = await prisma.todo.findUnique({ where: { id: anotherTodo.id } });
    expect(savedTodo?.completed).toBe(false);
  });
  it("按 completed 查询当前项目的 todos", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "todo-completed-api@example.com");
    const project = await createProject(app, auth.token, "Todo completed API project");

    const openTodo = await createTodo(app, auth.token, project.id, "Open API todo");
    const doneTodo = await createTodo(app, auth.token, project.id, "Done API todo");

    await request(app)
      .patch(`/todos/${doneTodo.id}`)
      .set(authHeader(auth.token))
      .send({ completed: true });

    const response = await request(app)
      .get(`/projects/${project.id}/todos?completed=true`)
      .set(authHeader(auth.token));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.map((todo: { id: string }) => todo.id)).toEqual([doneTodo.id]);
    expect(response.body.data.some((todo: { id: string }) => todo.id === openTodo.id)).toBe(false);
    expect(response.body.meta.total).toBe(1);
  });

  it("拒绝非法 completed 查询参数", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "todo-completed-invalid@example.com");
    const project = await createProject(app, auth.token, "Invalid completed project");

    const response = await request(app)
      .get(`/projects/${project.id}/todos?completed=yes`)
      .set(authHeader(auth.token));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("按 dueDate 范围查询当前项目的 todos", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "todo-due-date-api@example.com");
    const project = await createProject(app, auth.token, "Todo dueDate API project");

    await createTodo(app, auth.token, project.id, "Old API todo", { dueDate: "2026-05-01" });
    const inRangeTodo = await createTodo(app, auth.token, project.id, "In range API todo", {
      dueDate: "2026-05-15"
    });
    await createTodo(app, auth.token, project.id, "Future API todo", { dueDate: "2026-06-01" });

    const response = await request(app)
      .get(`/projects/${project.id}/todos?dueAfter=2026-05-10&dueBefore=2026-05-20`)
      .set(authHeader(auth.token));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.map((todo: { id: string }) => todo.id)).toEqual([inRangeTodo.id]);
    expect(response.body.meta.total).toBe(1);
  });

  it("拒绝非法 dueDate 查询参数", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "todo-due-date-invalid@example.com");
    const project = await createProject(app, auth.token, "Invalid dueDate project");

    const response = await request(app)
      .get(`/projects/${project.id}/todos?dueAfter=not-a-date`)
      .set(authHeader(auth.token));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("按 title 关键字查询当前项目的 todos", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "todo-title-search-api@example.com");
    const project = await createProject(app, auth.token, "Todo title search API project");

    const matchedTodo = await createTodo(app, auth.token, project.id, "Write weekly report");
    await createTodo(app, auth.token, project.id, "Buy milk");

    const response = await request(app)
      .get(`/projects/${project.id}/todos?title=report`)
      .set(authHeader(auth.token));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.map((todo: { id: string }) => todo.id)).toEqual([matchedTodo.id]);
    expect(response.body.meta.total).toBe(1);
  });

  it("拒绝空 title 查询参数", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "todo-title-empty-api@example.com");
    const project = await createProject(app, auth.token, "Invalid title search project");

    const response = await request(app)
      .get(`/projects/${project.id}/todos?title=   `)
      .set(authHeader(auth.token));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("当前用户可以通过 API 删除自己的 todo", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "todo-api-delete-owner@example.com");
    const project = await createProject(app, auth.token, "Todo API delete project");
    const todo = await createTodo(app, auth.token, project.id, "Delete API todo");

    const response = await request(app).delete(`/todos/${todo.id}`).set(authHeader(auth.token));

    expect(response.status).toBe(204);
    expect(response.text).toBe("");

    const savedTodo = await prisma.todo.findUnique({
      where: { id: todo.id }
    });

    expect(savedTodo).toBeNull();
  });

  it("不能通过 API 删除别人的 todo", async () => {
    const app = createApp();
    const owner = await registerAndLogin(app, "todo-api-delete-owner-a@example.com");
    const anotherUser = await createFactoryUser({
      email: "todo-api-delete-owner-b@example.com"
    });
    const anotherProject = await createFactoryProject({
      userId: anotherUser.id,
      name: "Private todo project"
    });
    const anotherTodo = await createFactoryTodo({
      projectId: anotherProject.id,
      title: "Private todo"
    });

    const response = await request(app)
      .delete(`/todos/${anotherTodo.id}`)
      .set(authHeader(owner.token));

    expect(response.status).toBe(404);

    const savedTodo = await prisma.todo.findUnique({
      where: { id: anotherTodo.id }
    });

    expect(savedTodo).not.toBeNull();
  });
});
