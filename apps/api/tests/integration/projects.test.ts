import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import {
  authHeader,
  cleanupDatabase,
  createProject,
  registerAndLogin
} from "../helpers/api-test-helpers.js";
import { createFactoryProject, createFactoryUser } from "../helpers/test-data-factory.js";

describe("projects API", () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  it("rejects listing projects without authentication", async () => {
    const app = createApp();

    const response = await request(app).get("/projects");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("creates and lists projects for the current user", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "projects-owner@example.com");

    const createResponse = await request(app).post("/projects").set(authHeader(auth.token)).send({
      name: "Node Learning Project",
      description: "Build project and todo APIs"
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data).toMatchObject({
      name: "Node Learning Project",
      description: "Build project and todo APIs",
      userId: auth.user.id
    });

    const listResponse = await request(app).get("/projects").set(authHeader(auth.token));

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data.map((project: { name: string }) => project.name)).toEqual([
      "Node Learning Project"
    ]);
    expect(listResponse.body.meta).toEqual({
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1
    });
  });

  it("does not list another user's projects", async () => {
    const app = createApp();
    const owner = await registerAndLogin(app, "project-owner-a@example.com");
    const anotherUser = await registerAndLogin(app, "project-owner-b@example.com");

    await request(app)
      .post("/projects")
      .set(authHeader(owner.token))
      .send({ name: "Owner project" });

    await request(app)
      .post("/projects")
      .set(authHeader(anotherUser.token))
      .send({ name: "Another user project" });

    const response = await request(app).get("/projects").set(authHeader(owner.token));

    expect(response.status).toBe(200);
    expect(response.body.data.map((project: { name: string }) => project.name)).toEqual([
      "Owner project"
    ]);
    expect(
      response.body.data.every((project: { userId: string }) => project.userId === owner.user.id)
    ).toBe(true);
  });

  it("分页返回当前用户的 projects", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "project-page@example.com");

    await request(app).post("/projects").set(authHeader(auth.token)).send({ name: "Project 1" });
    await request(app).post("/projects").set(authHeader(auth.token)).send({ name: "Project 2" });
    await request(app).post("/projects").set(authHeader(auth.token)).send({ name: "Project 3" });

    const response = await request(app)
      .get("/projects?page=2&pageSize=2")
      .set(authHeader(auth.token));

    expect(response.status).toBe(200);
    expect(response.body.data.map((project: { name: string }) => project.name)).toEqual([
      "Project 3"
    ]);
    expect(response.body.meta).toEqual({
      page: 2,
      pageSize: 2,
      total: 3,
      totalPages: 2
    });
  });

  it("拒绝非法 project 分页参数", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "project-bad-page@example.com");

    const response = await request(app).get("/projects?page=0").set(authHeader(auth.token));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects invalid project input for an authenticated user", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "project-invalid@example.com");

    const response = await request(app)
      .post("/projects")
      .set(authHeader(auth.token))
      .send({ name: "" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("creates a project with initial todos for the current user", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "project-with-todos@example.com");

    const response = await request(app)
      .post("/projects/with-todos")
      .set(authHeader(auth.token))
      .send({
        name: "Project with todos",
        todos: [{ title: "Todo A" }, { title: "Todo B" }]
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.project).toMatchObject({
      name: "Project with todos",
      userId: auth.user.id
    });
    expect(response.body.data.todos.map((todo: { title: string }) => todo.title)).toEqual([
      "Todo A",
      "Todo B"
    ]);

    // 直接查数据库，确认 todos 的 projectId 指向刚创建的 project。
    const savedTodos = await prisma.todo.findMany({
      where: { projectId: response.body.data.project.id },
      orderBy: { createdAt: "asc" }
    });

    expect(savedTodos.map((todo) => todo.title)).toEqual(["Todo A", "Todo B"]);
  });

  it("rejects creating a project with empty initial todos", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "project-with-empty-todos@example.com");

    const response = await request(app)
      .post("/projects/with-todos")
      .set(authHeader(auth.token))
      .send({
        name: "Invalid transaction project",
        todos: []
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("当前用户可以查看自己的 Project 详情", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "project-detail-owner@example.com");

    const createResponse = await request(app).post("/projects").set(authHeader(auth.token)).send({
      name: "Project detail",
      description: "Read one project"
    });

    const projectId = createResponse.body.data.id as string;

    const response = await request(app).get(`/projects/${projectId}`).set(authHeader(auth.token));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      id: projectId,
      name: "Project detail",
      description: "Read one project",
      userId: auth.user.id
    });
  });

  it("不能查看别人的 Project 详情", async () => {
    const app = createApp();
    const owner = await registerAndLogin(app, "project-detail-owner-a@example.com");
    const anotherUser = await createFactoryUser({
      email: "project-detail-owner-b@example.com"
    });
    const anotherProject = await createFactoryProject({
      userId: anotherUser.id,
      name: "Another user's private project"
    });

    const response = await request(app)
      .get(`/projects/${anotherProject.id}`)
      .set(authHeader(owner.token));

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PROJECT_NOT_FOUND");
  });

  it("查看不存在的 Project 详情时返回 404", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "project-detail-missing@example.com");

    const response = await request(app)
      .get("/projects/missing-project-id")
      .set(authHeader(auth.token));

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PROJECT_NOT_FOUND");
  });

  it("当前用户可以删除自己的 Project，并删除下面的 todos", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "project-delete-owner@example.com");

    const createResponse = await request(app)
      .post("/projects/with-todos")
      .set(authHeader(auth.token))
      .send({
        name: "Project to delete",
        todos: [{ title: "Todo A" }, { title: "Todo B" }]
      });

    const projectId = createResponse.body.data.project.id as string;

    const response = await request(app)
      .delete(`/projects/${projectId}`)
      .set(authHeader(auth.token));

    expect(response.status).toBe(204);
    expect(response.text).toBe("");

    const savedProject = await prisma.project.findUnique({ where: { id: projectId } });
    const savedTodos = await prisma.todo.findMany({ where: { projectId } });

    expect(savedProject).toBeNull();
    expect(savedTodos).toEqual([]);
  });

  it("不能删除别人的 Project", async () => {
    const app = createApp();
    const owner = await registerAndLogin(app, "project-delete-owner-a@example.com");
    const anotherUser = await createFactoryUser({
      email: "project-delete-owner-b@example.com"
    });
    const anotherProject = await createFactoryProject({
      userId: anotherUser.id,
      name: "Another user's project"
    });

    const response = await request(app)
      .delete(`/projects/${anotherProject.id}`)
      .set(authHeader(owner.token));

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PROJECT_NOT_FOUND");

    const savedProject = await prisma.project.findUnique({ where: { id: anotherProject.id } });
    expect(savedProject).not.toBeNull();
  });

  it("当前用户可以通过 API 更新自己的 Project", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "project-api-update-owner@example.com");
    const project = await createProject(app, auth.token, "Old API project");

    const response = await request(app)
      .patch(`/projects/${project.id}`)
      .set(authHeader(auth.token))
      .send({
        name: "New API project",
        description: "Updated from integration test"
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      id: project.id,
      name: "New API project",
      description: "Updated from integration test",
      userId: auth.user.id
    });
  });

  it("拒绝把 project name 更新为空字符串", async () => {
    const app = createApp();
    const auth = await registerAndLogin(app, "project-api-empty-name@example.com");
    const project = await createProject(app, auth.token, "Valid project");

    const response = await request(app)
      .patch(`/projects/${project.id}`)
      .set(authHeader(auth.token))
      .send({
        name: "   "
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("不能通过 API 更新别人的 Project", async () => {
    const app = createApp();
    const owner = await registerAndLogin(app, "project-api-update-owner-a@example.com");
    const anotherUser = await createFactoryUser({
      email: "project-api-update-owner-b@example.com"
    });
    const anotherProject = await createFactoryProject({
      userId: anotherUser.id,
      name: "Private API project"
    });

    const response = await request(app)
      .patch(`/projects/${anotherProject.id}`)
      .set(authHeader(owner.token))
      .send({
        name: "Should not update"
      });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PROJECT_NOT_FOUND");

    const savedProject = await prisma.project.findUnique({
      where: { id: anotherProject.id }
    });

    expect(savedProject?.name).toBe("Private API project");
  });
});
