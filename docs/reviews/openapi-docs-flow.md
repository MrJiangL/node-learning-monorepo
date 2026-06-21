# OpenAPI 文档工程化复盘

## OpenAPI JSON 和 Swagger UI 有什么区别？

OpenAPI JSON 是机器可读的 API 契约。

当前项目里的文件是：

```text
docs/openapi.json
```

它描述的是：

- API 有哪些路径
- 每个路径有哪些 HTTP method
- 请求参数和请求 body 长什么样
- 响应 body 长什么样
- 错误响应长什么样
- 哪些接口需要 Bearer Token

Swagger UI 是把 OpenAPI JSON 渲染成浏览器页面的工具。

当前项目里：

```text
GET /openapi.json
```

返回的是机器读的 JSON。

```text
GET /docs
```

返回的是人看的 Swagger UI 页面。

所以它们的关系是：

```text
OpenAPI JSON = 数据源 / 契约本体
Swagger UI = 展示这个契约的网页工具
```

如果没有 OpenAPI JSON，Swagger UI 没有东西可以展示。

如果没有 Swagger UI，OpenAPI JSON 仍然是有效契约，只是人读起来不方便。

## paths 和 components.schemas 分别负责什么？

`paths` 负责描述接口路径和 HTTP 行为。

比如：

```text
/projects/{id}
/projects/{projectId}/todos
```

在 `paths` 里，要描述：

- 这个接口是 `get`、`post`、`patch` 还是 `delete`
- 有没有 path parameter
- 有没有 query parameter
- 有没有 request body
- 成功返回什么
- 失败返回什么
- 是否需要鉴权

`components.schemas` 负责描述可以复用的数据结构。

比如：

```text
User
Project
Todo
ErrorResponse
AuthTokenResult
```

这些 schema 不代表某个具体接口。

它们像一组“类型定义”，可以被多个接口复用。

例如：

```json
{ "$ref": "#/components/schemas/Project" }
```

表示这里复用 `Project` 这个数据结构。

所以可以这样记：

```text
paths 描述“有哪些接口，以及怎么调用”。
components.schemas 描述“接口里用到的数据长什么样”。
```

## 为什么 method 必须放在 path 下面？

OpenAPI 的层级是：

```text
paths -> path -> method -> details
```

比如正确结构是：

```json
{
  "paths": {
    "/projects/{id}": {
      "get": {},
      "patch": {},
      "delete": {}
    }
  }
}
```

`get`、`patch`、`delete` 都是某一个路径下面的操作。

它们不能直接挂在 `paths` 下面。

错误结构是：

```json
{
  "paths": {
    "/projects/{id}": {
      "get": {},
      "delete": {}
    },
    "patch": {}
  }
}
```

这个 JSON 语法可能是合法的，但 OpenAPI 语义不对。

因为 `"patch"` 会被理解成一个路径，而不是 `PATCH /projects/{id}`。

## 这次我踩到的结构问题

这次补文档时，`PATCH /projects/{id}` 一开始被放成了：

```text
paths.patch
```

正确位置应该是：

```text
paths["/projects/{id}"].patch
```

也就是说：

```text
错误：paths -> patch
正确：paths -> /projects/{id} -> patch
```

这个问题很典型，因为 JSON 看起来没报错，但 Swagger / OpenAPI 的语义已经错了。

以后写 OpenAPI 时，我要先想清楚：

```text
我现在写的是路径，还是这个路径下面的方法？
```

## 为什么 204 不写 response body？

`204 No Content` 的含义是：

```text
请求成功，但响应体为空。
```

所以后端代码里通常写：

```ts
response.status(204).send();
```

而不是：

```ts
response.status(204).json({ success: true });
```

OpenAPI 里也一样。

`204` 响应只需要写：

```json
{
  "204": {
    "description": "Project deleted"
  }
}
```

不应该写：

```json
{
  "204": {
    "description": "Project deleted",
    "content": {
      "application/json": {}
    }
  }
}
```

因为这会暗示 `204` 有 JSON body，和 HTTP 语义不一致。

## Zod 能帮 OpenAPI 做什么？

Zod 可以帮助生成 OpenAPI 里的 schema 部分。

比如：

```ts
z.object({
  email: z.string().email(),
  password: z.string().min(1).max(100)
});
```

可以转换出类似：

```json
{
  "type": "object",
  "required": ["email", "password"],
  "properties": {
    "email": {
      "type": "string",
      "format": "email"
    },
    "password": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100
    }
  }
}
```

这可以减少重复。

因为同一个请求 body 的字段规则，通常会同时出现在：

```text
Zod schema 里：用于运行时校验
OpenAPI schema 里：用于接口文档
```

如果完全手写，就容易不同步。

## Zod 不能替代 OpenAPI 的哪些部分？

Zod 主要描述数据结构和校验规则。

它不能完整描述 API。

这些信息仍然需要 OpenAPI 自己描述，或者用额外的路由元信息补充：

- API 路径，比如 `/projects/{id}`
- HTTP method，比如 `get` / `post` / `patch` / `delete`
- HTTP status，比如 `200` / `201` / `204` / `400` / `401` / `404`
- 是否需要 Bearer Token
- response description
- path parameter 来自哪里
- query parameter 来自哪里
- 成功响应和错误响应如何组织
- 某些业务错误码

所以更准确的理解是：

```text
Zod 可以辅助 OpenAPI 的 schema。
Zod 不能替代完整 OpenAPI。
```

## 我现在怎么看 API 文档工程化？

API 文档工程化不是“写一份漂亮文档”。

它真正解决的是接口协作问题：

```text
前端怎么知道接口怎么调用？
测试怎么知道响应是否符合契约？
后端怎么避免接口行为只存在代码里？
工具怎么生成类型、Mock 或 client？
```

现在这个项目里的链路是：

```text
docs/openapi.json
  -> GET /openapi.json
  -> GET /docs
  -> Swagger UI 展示
```

后面如果继续工程化，可以往两个方向走：

1. 补更多接口文档，让 Swagger UI 更完整。
2. 用 Zod schema 生成一部分 `components.schemas`，减少手写重复。

当前阶段我最应该记住的是：

```text
OpenAPI 是 API 契约。
Swagger UI 是契约展示工具。
Zod 是运行时校验工具，可以辅助生成 schema。
```
