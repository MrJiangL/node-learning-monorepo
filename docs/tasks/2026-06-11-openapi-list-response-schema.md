# Task: OpenAPI 工程化：抽取 ProjectListResponse

## 背景

你刚刚完成了 `TodoResponse` 抽取。

现在我们继续把 OpenAPI 文档往“工程化”方向推进一步：给列表接口也定义明确的响应结构。

目前 `GET /projects` 只写了：

```json
"200": {
  "description": "Project list"
}
```

但是实际 API 返回的是：

```json
{
  "success": true,
  "data": [
    {
      "id": "project-1",
      "name": "Learn Node",
      "description": null,
      "createdAt": "2026-06-11T00:00:00.000Z",
      "updatedAt": "2026-06-11T00:00:00.000Z",
      "userId": "user-1"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

这张任务要做：

```text
把 GET /projects 的 200 响应补成 ProjectListResponse，并把分页 meta 也抽成可复用 schema。
```

---

## 你会练到什么

- 列表响应和详情响应的结构差异
- 为什么列表接口通常需要 `data + meta`
- OpenAPI 里数组怎么描述
- OpenAPI 里分页对象怎么复用
- 用测试保护文档结构，避免“文档看起来有，实际没约束”

---

## 核心理解

详情接口通常返回一条数据：

```json
{
  "success": true,
  "data": {
    "id": "project-1",
    "name": "Learn Node"
  }
}
```

列表接口通常返回多条数据，并且还要告诉前端分页信息：

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "total": 0,
    "totalPages": 0
  }
}
```

所以：

```text
ProjectResponse 描述一条 Project 的成功响应。
ProjectListResponse 描述一组 Project + 分页信息的成功响应。
PaginationMeta 描述所有分页列表都能复用的 meta 结构。
```

---

## 任务 1：新增 PaginationMeta schema

修改：

```text
docs/openapi.json
```

在 `components.schemas` 里新增：

```json
"PaginationMeta": {
  "type": "object",
  "required": ["page", "pageSize", "total", "totalPages"],
  "properties": {
    "page": {
      "type": "number"
    },
    "pageSize": {
      "type": "number"
    },
    "total": {
      "type": "number"
    },
    "totalPages": {
      "type": "number"
    }
  }
}
```

学习点：

```text
meta 不属于 Project 本身。
它属于“列表响应的分页信息”，所以不要塞进 Project schema。
```

---

## 任务 2：新增 ProjectListResponse schema

继续修改：

```text
docs/openapi.json
```

在 `components.schemas` 里新增：

```json
"ProjectListResponse": {
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
        "$ref": "#/components/schemas/Project"
      }
    },
    "meta": {
      "$ref": "#/components/schemas/PaginationMeta"
    }
  }
}
```

这里最重要的是 `data`：

```json
"data": {
  "type": "array",
  "items": {
    "$ref": "#/components/schemas/Project"
  }
}
```

它表示：

```text
data 是数组，数组里的每一项都是 Project。
```

---

## 任务 3：给 GET /projects 的 200 响应补 content

继续修改：

```text
docs/openapi.json
```

找到：

```text
paths["/projects"].get.responses["200"]
```

把它从：

```json
{
  "description": "Project list"
}
```

改成：

```json
{
  "description": "Project list",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/ProjectListResponse"
      }
    }
  }
}
```

学习点：

```text
description 只是给人看的说明。
content.application/json.schema 才是给工具和前端类型生成器看的结构契约。
```

---

## 任务 4：补 docs 测试断言

修改：

```text
apps/api/tests/integration/docs.test.ts
```

在 `it("可以返回 OpenAPI JSON", async () => { ... })` 里新增断言。

先断言 `PaginationMeta`：

```ts
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
```

再断言 `ProjectListResponse`：

```ts
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
```

最后断言 `GET /projects` 的 200 响应引用它：

```ts
expect(
  response.body.paths["/projects"].get.responses["200"].content["application/json"].schema
).toEqual({
  $ref: "#/components/schemas/ProjectListResponse"
});
```

如果你觉得最后这段换行不好看，可以先照着写，最后用：

```bash
npm run format
```

让 Prettier 处理。

---

## 任务 5：运行验证

先确认 JSON 没写坏：

```bash
node -e "JSON.parse(require('fs').readFileSync('docs/openapi.json', 'utf8')); console.log('openapi json ok')"
```

再跑 docs 测试：

```bash
npm run test -w @learn/api -- tests/integration/docs.test.ts
```

再跑类型检查：

```bash
npm run typecheck -w @learn/api
```

最后跑格式检查：

```bash
npm run format:check
```

如果格式检查不通过：

```bash
npm run format
npm run format:check
```

---

## 完成标准

- [x] `components.schemas.PaginationMeta` 已新增
- [x] `PaginationMeta` 包含 `page / pageSize / total / totalPages`
- [x] `components.schemas.ProjectListResponse` 已新增
- [x] `ProjectListResponse.data` 是 Project 数组
- [x] `ProjectListResponse.meta` 引用 `#/components/schemas/PaginationMeta`
- [x] `GET /projects` 的 200 schema 引用 `ProjectListResponse`
- [x] docs 测试断言 `PaginationMeta`
- [x] docs 测试断言 `ProjectListResponse`
- [x] docs 测试断言 `GET /projects` 的 200 `$ref`
- [x] `docs/openapi.json` 可以被 `JSON.parse` 正常解析
- [x] `npm run test -w @learn/api -- tests/integration/docs.test.ts` 通过
- [x] `npm run typecheck -w @learn/api` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
OpenAPI ProjectListResponse 抽取完成了
```
