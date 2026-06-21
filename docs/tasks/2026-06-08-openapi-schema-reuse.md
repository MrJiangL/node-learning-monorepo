# Task: OpenAPI 工程化：schema 复用整理

## 背景

你现在的 `docs/openapi.json` 已经能描述 Project / Todo 的核心接口。

但里面有一个明显重复：

```json
{
  "type": "object",
  "required": ["success", "data"],
  "properties": {
    "success": { "type": "boolean", "const": true },
    "data": { "$ref": "#/components/schemas/Project" }
  }
}
```

这个结构在多个成功响应里都会出现。

这张任务要练的是：

```text
把重复的响应 envelope schema 放到 components.schemas 里复用。
```

这不是为了炫技，而是为了让 OpenAPI 文档更容易维护。

---

## 你会练到什么

- OpenAPI 里的 `$ref` 是怎么复用 schema 的
- 为什么 `components.schemas` 不只放实体，也可以放响应结构
- 为什么 `Project` 和 `ProjectResponse` 是两个不同概念
- 如何用测试保护 OpenAPI 文档结构
- 如何避免手写 JSON 时把字段放错层级

---

## 任务 1：打开 OpenAPI JSON

打开：

```text
docs/openapi.json
```

找到这两个成功响应：

```text
GET /projects/{id} -> responses -> 200
PATCH /projects/{id} -> responses -> 200
```

它们现在都内联写了：

```json
{
  "type": "object",
  "required": ["success", "data"],
  "properties": {
    "success": { "type": "boolean", "const": true },
    "data": { "$ref": "#/components/schemas/Project" }
  }
}
```

这两个地方可以复用同一个 schema。

---

## 任务 2：在 components.schemas 里新增 ProjectResponse

在：

```text
components.schemas
```

里面新增：

```json
"ProjectResponse": {
  "type": "object",
  "required": ["success", "data"],
  "properties": {
    "success": {
      "type": "boolean",
      "const": true
    },
    "data": {
      "$ref": "#/components/schemas/Project"
    }
  }
}
```

建议放在 `Project` schema 后面。

注意：

```text
Project 是纯业务实体。
ProjectResponse 是 API 响应外壳。
```

它们不要混成一个东西。

---

## 任务 3：把 Project 详情响应改成 $ref

找到：

```text
paths["/projects/{id}"].get.responses["200"].content["application/json"].schema
```

把原来内联的 object 改成：

```json
{
  "$ref": "#/components/schemas/ProjectResponse"
}
```

这表示：

```text
GET /projects/{id} 成功时返回 ProjectResponse。
```

---

## 任务 4：把 Project 更新响应改成 $ref

找到：

```text
paths["/projects/{id}"].patch.responses["200"].content["application/json"].schema
```

同样改成：

```json
{
  "$ref": "#/components/schemas/ProjectResponse"
}
```

这样详情和更新接口会共用同一个成功响应结构。

---

## 任务 5：给 OpenAPI docs 测试补结构断言

打开：

```text
apps/api/tests/integration/docs.test.ts
```

在 `it("可以返回 OpenAPI JSON", async () => { ... })` 里，已有：

```ts
expect(response.body.openapi).toBe("3.1.0");
expect(response.body.info.title).toBe("Node Learning Monorepo API");
```

后面继续加：

```ts
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
  response.body.paths["/projects/{id}"].patch.responses["200"].content["application/json"].schema
).toEqual({
  $ref: "#/components/schemas/ProjectResponse"
});
```

这个测试不是测业务接口，而是测：

```text
OpenAPI 文档本身的结构有没有保持我们约定的复用方式。
```

---

## 任务 6：运行验证

先确认 JSON 没写坏：

```bash
node -e "JSON.parse(require('fs').readFileSync('docs/openapi.json', 'utf8')); console.log('openapi json ok')"
```

再跑 docs 测试：

```bash
npm run test -w @learn/api -- tests/integration/docs.test.ts
```

再跑 API 类型检查：

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

- [ ] `components.schemas.ProjectResponse` 已新增
- [ ] `ProjectResponse.data` 引用 `#/components/schemas/Project`
- [ ] `GET /projects/{id}` 的 200 schema 改成 `$ref`
- [ ] `PATCH /projects/{id}` 的 200 schema 改成 `$ref`
- [ ] docs 测试断言 `ProjectResponse` 存在
- [ ] docs 测试断言两个 Project 成功响应都引用 `ProjectResponse`
- [ ] `docs/openapi.json` 可以被 `JSON.parse` 正常解析
- [ ] `npm run test -w @learn/api -- tests/integration/docs.test.ts` 通过
- [ ] `npm run typecheck -w @learn/api` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
OpenAPI schema 复用整理完成了
```
