# Task: Activity Log 综合业务模块：OpenAPI 文档

## 背景

Activity Log 查询 API 已经完成：

```text
GET /projects/:projectId/activity-logs
```

现在要把这个接口补进 OpenAPI。

当前 Swagger UI 读取的是：

```text
docs/openapi.json
```

所以这张任务只改这个 JSON 文档，不改业务代码。

---

## 任务 1：补 ActivityLog schema

修改：

```text
docs/openapi.json
```

在：

```json
"components": {
  "schemas": {
```

下面新增：

```json
"ActivityLog": {
  "type": "object",
  "required": ["id", "action", "message", "metadata", "createdAt", "userId", "projectId"],
  "properties": {
    "id": { "type": "string" },
    "action": {
      "type": "string",
      "enum": [
        "project.created",
        "project.updated",
        "project.deleted",
        "todo.created",
        "todo.updated",
        "todo.completed",
        "todo.deleted"
      ]
    },
    "message": { "type": "string" },
    "metadata": {
      "anyOf": [
        {
          "type": "object",
          "additionalProperties": true
        },
        {
          "type": "null"
        }
      ]
    },
    "createdAt": {
      "type": "string",
      "format": "date-time"
    },
    "userId": { "type": "string" },
    "projectId": { "type": "string" }
  }
}
```

学习点：

```text
metadata 是 JSON 对象或 null。

OpenAPI 3.1 可以用 anyOf 表示：
- object
- null
```

---

## 任务 2：补 ActivityLogListResponse schema

同样在 `components.schemas` 下新增：

```json
"ActivityLogListResponse": {
  "type": "object",
  "required": ["success", "data", "meta"],
  "properties": {
    "success": {
      "type": "boolean",
      "const": true
    },
    "data": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/ActivityLog"
      }
    },
    "meta": {
      "$ref": "#/components/schemas/PaginationMeta"
    }
  }
}
```

为什么要抽 `ActivityLogListResponse`？

```text
这样 path.responses 里不用重复写完整响应结构。

OpenAPI 里重复越少，后面维护越稳。
```

---

## 任务 3：补 path 文档

在 `paths` 下新增：

```json
"/projects/{projectId}/activity-logs": {
  "get": {
    "summary": "List activity logs in current user's project",
    "security": [{ "bearerAuth": [] }],
    "parameters": [
      {
        "name": "projectId",
        "in": "path",
        "required": true,
        "schema": { "type": "string" }
      },
      {
        "name": "page",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "default": 1
        }
      },
      {
        "name": "pageSize",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 50,
          "default": 10
        }
      }
    ],
    "responses": {
      "200": {
        "description": "Activity log list",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ActivityLogListResponse"
            }
          }
        }
      },
      "400": {
        "description": "Validation error",
        "content": {
          "application/json": {
            "schema": { "$ref": "#/components/schemas/ErrorResponse" }
          }
        }
      },
      "401": {
        "description": "Authentication required",
        "content": {
          "application/json": {
            "schema": { "$ref": "#/components/schemas/ErrorResponse" }
          }
        }
      }
    }
  }
}
```

注意：

```text
当前接口查询别人 Project 的日志时返回 200 + 空数组。
所以这里先不写 404。
```

---

## 任务 4：检查 JSON 格式

因为 `docs/openapi.json` 是 JSON，逗号很容易写错。

修改后先跑：

```bash
npx prettier --check docs/openapi.json
```

如果失败：

```bash
npx prettier --write docs/openapi.json
```

---

## 任务 5：补 docs 集成测试或复用现有测试

先看是否已有：

```text
apps/api/tests/integration/docs.test.ts
```

如果里面已经测试 `/openapi.json`，就在里面补断言：

```ts
it("OpenAPI includes Activity Log query API", async () => {
  const app = createApp();

  const response = await request(app).get("/openapi.json");

  expect(response.status).toBe(200);
  expect(response.body.paths["/projects/{projectId}/activity-logs"]).toBeDefined();
  expect(response.body.components.schemas.ActivityLog).toBeDefined();
  expect(response.body.components.schemas.ActivityLogListResponse).toBeDefined();
});
```

---

## 验证命令

先跑 docs 测试：

```bash
npm run test -w @learn/api -- docs.test.ts
```

再跑 Activity Log API 测试：

```bash
npm run test -w @learn/api -- activity-logs.test.ts
```

最后跑整体检查：

```bash
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] `docs/openapi.json` 新增 `ActivityLog`
- [x] `docs/openapi.json` 新增 `ActivityLogListResponse`
- [x] `docs/openapi.json` 新增 `/projects/{projectId}/activity-logs`
- [x] path 文档包含 `projectId` path 参数
- [x] path 文档包含 `page` / `pageSize` query 参数
- [x] path 文档包含 200 / 400 / 401 响应
- [x] `docs.test.ts` 覆盖 Activity Log OpenAPI 文档
- [x] `npm run test -w @learn/api -- docs.test.ts` 通过
- [x] `npm run test -w @learn/api -- activity-logs.test.ts` 通过
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Activity Log OpenAPI 文档完成了
```
