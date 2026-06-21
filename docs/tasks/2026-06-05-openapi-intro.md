# Task: 后端工程化：OpenAPI / API 文档生成入门

## 背景

你现在已经写了不少 REST API：

```text
GET /health
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET /auth/me
GET /projects
POST /projects
GET /projects/:id
PATCH /projects/:id
DELETE /projects/:id
```

现在这些接口主要靠代码和测试理解。

真实后端项目通常还会有一份 API 契约文档，让前端、后端、测试、产品都能知道：

```text
接口路径是什么？
请求 body 长什么样？
响应 body 长什么样？
错误响应有哪些？
需要不需要鉴权？
```

这张任务先做 OpenAPI 入门，不引入 Swagger UI，也不做自动生成。

我们先手写一个小型 `openapi.json`，理解结构。

---

## 目标

新增：

```text
docs/openapi.json
```

先描述这些接口：

```text
GET /health
POST /auth/login
POST /auth/refresh
GET /auth/me
GET /projects
POST /projects
```

---

## 你会练到什么

- OpenAPI 里的 `paths` 是什么
- OpenAPI 里的 `components.schemas` 是什么
- 如何描述 request body
- 如何描述 response body
- 如何描述 Bearer token 鉴权
- 如何把 API response envelope 写成文档契约

---

## 任务 1：创建最小 OpenAPI 文件

创建文件：

```text
docs/openapi.json
```

先写基础结构：

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Node Learning Monorepo API",
    "version": "0.1.0"
  },
  "servers": [
    {
      "url": "http://localhost:3001"
    }
  ],
  "paths": {},
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    },
    "schemas": {}
  }
}
```

---

## 任务 2：新增通用响应 schema

在 `components.schemas` 里新增：

```json
"ErrorResponse": {
  "type": "object",
  "required": ["success", "error"],
  "properties": {
    "success": {
      "type": "boolean",
      "const": false
    },
    "error": {
      "type": "object",
      "required": ["code", "message"],
      "properties": {
        "code": {
          "type": "string",
          "examples": ["AUTH_REQUIRED", "INVALID_TOKEN", "VALIDATION_ERROR"]
        },
        "message": {
          "type": "string"
        }
      }
    }
  }
}
```

这表示项目里的错误响应统一长这样：

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Authentication token is invalid"
  }
}
```

---

## 任务 3：新增业务 schema

继续在 `components.schemas` 里新增：

```json
"User": {
  "type": "object",
  "required": ["id", "email", "name", "createdAt", "updatedAt"],
  "properties": {
    "id": { "type": "string" },
    "email": { "type": "string", "format": "email" },
    "name": { "type": ["string", "null"] },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" }
  }
},
"Project": {
  "type": "object",
  "required": ["id", "name", "description", "createdAt", "updatedAt", "userId"],
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "description": { "type": ["string", "null"] },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" },
    "userId": { "type": "string" }
  }
},
"AuthTokenResult": {
  "type": "object",
  "required": ["user", "accessToken", "refreshToken"],
  "properties": {
    "user": { "$ref": "#/components/schemas/User" },
    "accessToken": { "type": "string" },
    "refreshToken": { "type": "string" }
  }
}
```

---

## 任务 4：描述 GET /health

在 `paths` 里新增：

```json
"/health": {
  "get": {
    "summary": "Check API health",
    "responses": {
      "200": {
        "description": "API is healthy"
      }
    }
  }
}
```

---

## 任务 5：描述 POST /auth/login

在 `paths` 里新增：

```json
"/auth/login": {
  "post": {
    "summary": "Login with email and password",
    "requestBody": {
      "required": true,
      "content": {
        "application/json": {
          "schema": {
            "type": "object",
            "required": ["email", "password"],
            "properties": {
              "email": { "type": "string", "format": "email" },
              "password": { "type": "string" }
            }
          }
        }
      }
    },
    "responses": {
      "200": {
        "description": "Login success"
      },
      "401": {
        "description": "Invalid credentials",
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

## 任务 6：描述一个需要鉴权的接口

给 `GET /projects` 增加：

```json
"/projects": {
  "get": {
    "summary": "List current user's projects",
    "security": [{ "bearerAuth": [] }],
    "responses": {
      "200": {
        "description": "Project list"
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

你可以继续给 `POST /projects` 也加上 `security`。

---

## 任务 7：校验 JSON 是否有效

运行：

```bash
node -e "JSON.parse(require('fs').readFileSync('docs/openapi.json','utf8')); console.log('openapi json ok')"
```

预期：

```text
openapi json ok
```

再跑格式检查：

```bash
npm run format:check
```

---

## 完成标准

- [ ] 新增 `docs/openapi.json`
- [ ] 有 `openapi` / `info` / `servers` / `paths` / `components`
- [ ] 有 `bearerAuth` security scheme
- [ ] 有 `ErrorResponse` / `User` / `Project` / `AuthTokenResult`
- [ ] 至少描述 `GET /health`、`POST /auth/login`、`GET /projects`
- [ ] `docs/openapi.json` 能被 `JSON.parse` 解析
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
OpenAPI 入门完成了
```
