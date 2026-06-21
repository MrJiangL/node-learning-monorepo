# Task: OpenAPI 工程化：补齐 Project / Todo 核心接口文档

## 背景

你已经把 Swagger UI 接进后端了：

```text
GET /docs
GET /openapi.json
```

现在 Swagger UI 能打开，但 `docs/openapi.json` 里只描述了少量接口。

这张任务继续补 OpenAPI，但不要一次性补全所有 API。

先补 4 个核心接口：

```text
GET /projects/{id}
PATCH /projects/{id}
DELETE /projects/{id}
POST /projects/{projectId}/todos
```

这几个接口很适合练：

- path parameter
- Bearer token 鉴权
- request body
- `200` / `201` / `204` / `400` / `401` / `404`
- 成功响应和错误响应

---

## 你会练到什么

- OpenAPI 里怎么写 `parameters`
- OpenAPI 里怎么描述路径参数 `{id}`
- OpenAPI 里怎么描述 `PATCH` 请求 body
- OpenAPI 里什么时候写 `201 Created`
- OpenAPI 里什么时候写 `204 No Content`
- Swagger UI 里怎么确认新接口已经出现

---

## 任务 1：先阅读真实 route

先读这两个文件：

```text
apps/api/src/modules/projects/projects.routes.ts
apps/api/src/modules/todos/todos.routes.ts
```

重点看：

```text
GET /projects/:id
PATCH /projects/:id
DELETE /projects/:id
POST /projects/:projectId/todos
```

你要先确认真实代码里的状态码：

```text
GET /projects/:id -> 200
PATCH /projects/:id -> 200
DELETE /projects/:id -> 204
POST /projects/:projectId/todos -> 201
```

OpenAPI 应该描述真实代码，而不是凭感觉写。

---

## 任务 2：给 components.schemas 增加 Todo

修改：

```text
docs/openapi.json
```

在 `components.schemas` 里增加：

```json
"Todo": {
  "type": "object",
  "required": [
    "id",
    "title",
    "description",
    "completed",
    "dueDate",
    "createdAt",
    "updatedAt",
    "projectId"
  ],
  "properties": {
    "id": { "type": "string" },
    "title": { "type": "string" },
    "description": { "type": ["string", "null"] },
    "completed": { "type": "boolean" },
    "dueDate": { "type": ["string", "null"], "format": "date-time" },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" },
    "projectId": { "type": "string" }
  }
}
```

注意：

```text
description 和 dueDate 都可能是 null。
```

---

## 任务 3：补 GET /projects/{id}

在 `paths` 里增加：

```json
"/projects/{id}": {
  "get": {
    "summary": "Get one project by id",
    "security": [{ "bearerAuth": [] }],
    "parameters": [
      {
        "name": "id",
        "in": "path",
        "required": true,
        "schema": { "type": "string" }
      }
    ],
    "responses": {
      "200": {
        "description": "Project detail",
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "required": ["success", "data"],
              "properties": {
                "success": { "type": "boolean", "const": true },
                "data": { "$ref": "#/components/schemas/Project" }
              }
            }
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
      },
      "404": {
        "description": "Project not found",
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

这里的 `id` 对应 Express route 里的：

```text
/projects/:id
```

OpenAPI 里路径参数写成：

```text
/projects/{id}
```

---

## 任务 4：在同一个 path 里补 PATCH /projects/{id}

继续在 `"/projects/{id}"` 对象里增加 `patch`。

注意：不要新建第二个重复的 `"/projects/{id}"` key。

```json
"patch": {
  "summary": "Update current user's project",
  "security": [{ "bearerAuth": [] }],
  "parameters": [
    {
      "name": "id",
      "in": "path",
      "required": true,
      "schema": { "type": "string" }
    }
  ],
  "requestBody": {
    "required": true,
    "content": {
      "application/json": {
        "schema": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "minLength": 1,
              "maxLength": 100
            },
            "description": {
              "type": "string",
              "maxLength": 1000
            }
          }
        }
      }
    }
  },
  "responses": {
    "200": {
      "description": "Project updated",
      "content": {
        "application/json": {
          "schema": {
            "type": "object",
            "required": ["success", "data"],
            "properties": {
              "success": { "type": "boolean", "const": true },
              "data": { "$ref": "#/components/schemas/Project" }
            }
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
    },
    "404": {
      "description": "Project not found",
      "content": {
        "application/json": {
          "schema": { "$ref": "#/components/schemas/ErrorResponse" }
        }
      }
    }
  }
}
```

---

## 任务 5：在同一个 path 里补 DELETE /projects/{id}

继续在 `"/projects/{id}"` 对象里增加 `delete`。

```json
"delete": {
  "summary": "Delete current user's project",
  "security": [{ "bearerAuth": [] }],
  "parameters": [
    {
      "name": "id",
      "in": "path",
      "required": true,
      "schema": { "type": "string" }
    }
  ],
  "responses": {
    "204": {
      "description": "Project deleted"
    },
    "401": {
      "description": "Authentication required",
      "content": {
        "application/json": {
          "schema": { "$ref": "#/components/schemas/ErrorResponse" }
        }
      }
    },
    "404": {
      "description": "Project not found",
      "content": {
        "application/json": {
          "schema": { "$ref": "#/components/schemas/ErrorResponse" }
        }
      }
    }
  }
}
```

注意：

```text
204 没有响应 body，所以这里不写 content。
```

这和你之前问过的 `response.status(204).send()` 是一致的。

---

## 任务 6：补 POST /projects/{projectId}/todos

在 `paths` 里新增：

```json
"/projects/{projectId}/todos": {
  "post": {
    "summary": "Create todo in current user's project",
    "security": [{ "bearerAuth": [] }],
    "parameters": [
      {
        "name": "projectId",
        "in": "path",
        "required": true,
        "schema": { "type": "string" }
      }
    ],
    "requestBody": {
      "required": true,
      "content": {
        "application/json": {
          "schema": {
            "type": "object",
            "required": ["title"],
            "properties": {
              "title": {
                "type": "string",
                "minLength": 1,
                "maxLength": 100
              },
              "description": {
                "type": "string",
                "maxLength": 1000
              },
              "dueDate": {
                "type": "string",
                "format": "date-time"
              }
            }
          }
        }
      }
    },
    "responses": {
      "201": {
        "description": "Todo created",
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "required": ["success", "data"],
              "properties": {
                "success": { "type": "boolean", "const": true },
                "data": { "$ref": "#/components/schemas/Todo" }
              }
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
      },
      "404": {
        "description": "Project not found",
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

---

## 任务 7：验证 JSON 和 Swagger UI

先检查 JSON 能解析：

```bash
node -e "JSON.parse(require('fs').readFileSync('docs/openapi.json','utf8')); console.log('openapi json ok')"
```

再跑 docs 测试：

```bash
npm run test -w @learn/api -- tests/integration/docs.test.ts
```

然后跑格式检查：

```bash
npm run format:check
```

如果格式检查不通过：

```bash
npm run format
npm run format:check
```

最后启动 API：

```bash
npm run dev:api
```

打开：

```text
http://localhost:3001/docs
```

确认 Swagger UI 里能看到：

```text
GET /projects/{id}
PATCH /projects/{id}
DELETE /projects/{id}
POST /projects/{projectId}/todos
```

---

## 完成标准

- [ ] `docs/openapi.json` 新增 `Todo` schema
- [ ] `docs/openapi.json` 新增 `GET /projects/{id}`
- [ ] `docs/openapi.json` 新增 `PATCH /projects/{id}`
- [ ] `docs/openapi.json` 新增 `DELETE /projects/{id}`
- [ ] `docs/openapi.json` 新增 `POST /projects/{projectId}/todos`
- [ ] `204` 响应不写 response body
- [ ] `node -e "JSON.parse(...)"` 通过
- [ ] `npm run test -w @learn/api -- tests/integration/docs.test.ts` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
OpenAPI Project Todo 文档完成了
```
