# Task: OpenAPI 工程化：抽取 TodoResponse

## 背景

你前面已经把 Project 的成功响应抽成了：

```text
components.schemas.ProjectResponse
```

现在 Todo 创建接口里还有一段内联响应 schema：

```text
POST /projects/{projectId}/todos -> responses -> 201
```

它现在直接写了：

```json
{
  "type": "object",
  "required": ["success", "data"],
  "properties": {
    "success": { "type": "boolean", "const": true },
    "data": { "$ref": "#/components/schemas/Todo" }
  }
}
```

这张任务要做：

```text
把这段抽成 components.schemas.TodoResponse，然后在接口响应里用 $ref 复用。
```

---

## 你会练到什么

- 为什么 `Todo` 和 `TodoResponse` 是两个不同概念
- OpenAPI `$ref` 怎么减少重复
- 为什么 response envelope 也可以放进 `components.schemas`
- 如何用测试保护 OpenAPI 文档结构
- 如何读 JSON 路径定位到具体接口响应

---

## 核心理解

`Todo` 是业务实体：

```json
{
  "id": "todo-1",
  "title": "Learn Redis",
  "completed": false
}
```

`TodoResponse` 是 API 响应结构：

```json
{
  "success": true,
  "data": {
    "id": "todo-1",
    "title": "Learn Redis",
    "completed": false
  }
}
```

所以：

```text
Todo 描述数据本身。
TodoResponse 描述 HTTP API 成功响应的外壳。
```

---

## 任务 1：在 components.schemas 里新增 TodoResponse

修改：

```text
docs/openapi.json
```

在 `components.schemas.Todo` 后面新增：

```json
"TodoResponse": {
  "type": "object",
  "required": ["success", "data"],
  "properties": {
    "success": {
      "type": "boolean",
      "const": true
    },
    "data": {
      "$ref": "#/components/schemas/Todo"
    }
  }
}
```

注意 JSON 逗号：

```text
Todo 后面如果还要继续放 TodoResponse，就需要给 Todo schema 后面加逗号。
```

---

## 任务 2：把 Todo 创建响应改成 $ref

继续修改：

```text
docs/openapi.json
```

找到这个路径：

```text
paths["/projects/{projectId}/todos"].post.responses["201"].content["application/json"].schema
```

把原来的内联 object 改成：

```json
{
  "$ref": "#/components/schemas/TodoResponse"
}
```

这表示：

```text
POST /projects/{projectId}/todos 创建成功时返回 TodoResponse。
```

---

## 任务 3：补 docs 测试断言

修改：

```text
apps/api/tests/integration/docs.test.ts
```

在 `it("可以返回 OpenAPI JSON", async () => { ... })` 里，ProjectResponse 的断言后面新增：

```ts
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
```

再新增 Todo 创建响应的 `$ref` 断言：

```ts
expect(
  response.body.paths["/projects/{projectId}/todos"].post.responses["201"].content[
    "application/json"
  ].schema
).toEqual({
  $ref: "#/components/schemas/TodoResponse"
});
```

这个测试证明：

```text
Todo 创建接口没有继续使用内联 schema，而是引用了 TodoResponse。
```

---

## 任务 4：运行验证

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

- [x] `components.schemas.TodoResponse` 已新增
- [x] `TodoResponse.data` 引用 `#/components/schemas/Todo`
- [x] `POST /projects/{projectId}/todos` 的 201 schema 改成 `$ref`
- [x] docs 测试断言 `TodoResponse` 存在
- [x] docs 测试断言 Todo 创建成功响应引用 `TodoResponse`
- [x] `docs/openapi.json` 可以被 `JSON.parse` 正常解析
- [x] `npm run test -w @learn/api -- tests/integration/docs.test.ts` 通过
- [x] `npm run typecheck -w @learn/api` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
OpenAPI TodoResponse 抽取完成了
```
