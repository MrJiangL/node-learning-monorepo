import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { createProjectListCacheKey } from "../../src/cache/project-cache-key.js";
import { createRedisClient } from "../../src/cache/redis-client.js";
import { setJson } from "../../src/cache/redis-json-cache.js";
import {
  authHeader,
  cleanupDatabase,
  createProject,
  registerAndLogin
} from "../helpers/api-test-helpers.js";
import { createFactoryProject } from "../helpers/test-data-factory.js";

const client = createRedisClient();

describe("projects API cache", () => {
  beforeAll(async () => {
    await client.connect();
  });

  beforeEach(async () => {
    await cleanupDatabase();
    await client.flushDb();
  });

  afterAll(async () => {
    await client.quit();
  });

  it("GET /projects 优先返回 Redis 缓存里的列表数据", async () => {
    const app = createApp({ projectCacheClient: client });
    const auth = await registerAndLogin(app, "project-cache-api-read@example.com");

    await createFactoryProject({
      name: "Database project",
      userId: auth.user.id
    });

    const cacheKey = createProjectListCacheKey({
      userId: auth.user.id,
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc"
    });

    await setJson(
      client,
      cacheKey,
      {
        data: [
          {
            id: "cached-project-1",
            name: "Cached project",
            description: "来自 Redis 缓存",
            createdAt: "2026-06-08T00:00:00.000Z",
            updatedAt: "2026-06-08T00:00:00.000Z",
            userId: auth.user.id
          }
        ],
        meta: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1
        }
      },
      60
    );

    const response = await request(app).get("/projects").set(authHeader(auth.token));

    expect(response.status).toBe(200);
    expect(response.body.data.map((project: { name: string }) => project.name)).toEqual([
      "Cached project"
    ]);
  });

  it("POST /projects 创建成功后会清理当前用户的 Project 列表缓存", async () => {
    const app = createApp({ projectCacheClient: client });
    const auth = await registerAndLogin(app, "project-cache-api-create@example.com");

    const cacheKey = createProjectListCacheKey({
      userId: auth.user.id,
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc"
    });

    await setJson(
      client,
      cacheKey,
      { data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } },
      60
    );

    const response = await request(app)
      .post("/projects")
      .set(authHeader(auth.token))
      .send({ name: "Project created after cached list" });

    expect(response.status).toBe(201);
    expect(await client.get(cacheKey)).toBeNull();
  });

  it("PATCH /projects/:id 更新成功后会清理当前用户的 Project 列表缓存", async () => {
    const app = createApp({ projectCacheClient: client });
    const auth = await registerAndLogin(app, "project-cache-api-update@example.com");
    const project = await createProject(app, auth.token, "Old cached project");

    const cacheKey = createProjectListCacheKey({
      userId: auth.user.id,
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc"
    });

    await setJson(
      client,
      cacheKey,
      {
        data: [
          {
            id: project.id,
            name: "Old cached project",
            description: null,
            createdAt: "2026-06-08T00:00:00.000Z",
            updatedAt: "2026-06-08T00:00:00.000Z",
            userId: auth.user.id
          }
        ],
        meta: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1
        }
      },
      60
    );

    const response = await request(app)
      .patch(`/projects/${project.id}`)
      .set(authHeader(auth.token))
      .send({ name: "Updated cached project" });

    expect(response.status).toBe(200);
    expect(await client.get(cacheKey)).toBeNull();
  });

  it("DELETE /projects/:id 删除成功后会清理当前用户的 Project 列表缓存", async () => {
    const app = createApp({ projectCacheClient: client });
    const auth = await registerAndLogin(app, "project-cache-api-delete@example.com");
    const project = await createProject(app, auth.token, "Project cached before delete");

    const cacheKey = createProjectListCacheKey({
      userId: auth.user.id,
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc"
    });

    await setJson(
      client,
      cacheKey,
      {
        data: [
          {
            id: project.id,
            name: "Project cached before delete",
            description: null,
            createdAt: "2026-06-08T00:00:00.000Z",
            updatedAt: "2026-06-08T00:00:00.000Z",
            userId: auth.user.id
          }
        ],
        meta: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1
        }
      },
      60
    );

    const response = await request(app)
      .delete(`/projects/${project.id}`)
      .set(authHeader(auth.token));

    expect(response.status).toBe(204);
    expect(await client.get(cacheKey)).toBeNull();
  });
});
