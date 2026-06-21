import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

describe("OpenAPI 文档路由", () => {
  it("可以返回 OpenAPI JSON", async () => {
    const app = createApp();

    const response = await request(app).get("/openapi.json");

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe("3.1.0");
    expect(response.body.info.title).toBe("Node Learning Monorepo API");
    expect(response.body.components.schemas.ProjectResponse).toEqual({
      type: "object",
      required: ["success", "data"],
      properties: {
        success: {
          type: "boolean",
          const: true
        },
        data: {
          $ref: "#/components/schemas/Project"
        }
      }
    });

    expect(
      response.body.paths["/projects/{id}"].get.responses["200"].content["application/json"].schema
    ).toEqual({
      $ref: "#/components/schemas/ProjectResponse"
    });

    expect(
      response.body.paths["/projects/{id}"].patch.responses["200"].content["application/json"]
        .schema
    ).toEqual({
      $ref: "#/components/schemas/ProjectResponse"
    });

    expect(
      response.body.paths["/projects/{projectId}/todos"].post.responses["201"].content[
        "application/json"
      ].schema
    ).toEqual({
      $ref: "#/components/schemas/TodoResponse"
    });

    expect(response.body.components.schemas.TodoResponse).toEqual({
      type: "object",
      required: ["success", "data"],
      properties: {
        success: {
          type: "boolean",
          const: true
        },
        data: {
          $ref: "#/components/schemas/Todo"
        }
      }
    });
    expect(response.body.components.schemas.PaginationMeta).toEqual({
      type: "object",
      required: ["page", "pageSize", "total", "totalPages"],
      properties: {
        page: {
          type: "number"
        },
        pageSize: {
          type: "number"
        },
        total: {
          type: "number"
        },
        totalPages: {
          type: "number"
        }
      }
    });

    expect(response.body.components.schemas.ProjectListResponse).toEqual({
      type: "object",
      required: ["success", "data", "meta"],
      properties: {
        success: {
          type: "boolean",
          const: true
        },
        data: {
          type: "array",
          items: {
            $ref: "#/components/schemas/Project"
          }
        },
        meta: {
          $ref: "#/components/schemas/PaginationMeta"
        }
      }
    });

    expect(
      response.body.paths["/projects"].get.responses["200"].content["application/json"].schema
    ).toEqual({
      $ref: "#/components/schemas/ProjectListResponse"
    });
  });

  it("可以打开 Swagger UI 文档页", async () => {
    const app = createApp();

    const response = await request(app).get("/docs/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Swagger UI");
  });

  it("OpenAPI 包含 Activity Log 查询 API 文档", async () => {
    const app = createApp();

    const response = await request(app).get("/openapi.json");

    expect(response.status).toBe(200);
    expect(response.body.components.schemas.ActivityLog).toBeDefined();
    expect(response.body.components.schemas.ActivityLogListResponse).toBeDefined();
    expect(response.body.paths["/projects/{projectId}/activity-logs"]).toBeDefined();
    expect(
      response.body.paths["/projects/{projectId}/activity-logs"].get.responses["200"].content[
        "application/json"
      ].schema
    ).toEqual({
      $ref: "#/components/schemas/ActivityLogListResponse"
    });
  });
});
