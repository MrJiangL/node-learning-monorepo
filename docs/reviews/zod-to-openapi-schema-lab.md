# Zod 转 OpenAPI Schema 实验

## 我运行了什么？

这次我运行了：

```bash
npm run openapi:schema-lab -w @learn/api
```

这个命令会执行：

```text
apps/api/src/scripts/openapi-schema-lab.ts
```

脚本里做的事情是：

```text
读取已有的 Zod schema -> 使用 zod-to-json-schema 转换 -> 在终端输出 JSON Schema
```

这不是一个完整的 OpenAPI 生成器，而是一个学习实验。

它的目的很明确：

```text
观察 Zod schema 里已有的信息，哪些可以变成 OpenAPI components.schemas 能使用的结构。
```

## Zod schema 转出来后，我看到了什么？

我看到了 `LoginRequest`、`CreateProjectRequest`、`CreateTodoRequest` 三个 schema。

以 `LoginRequest` 为例，Zod schema 里的规则被转换成了 JSON Schema：

```json
{
  "type": "object",
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "maxLength": 255
    },
    "password": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100
    }
  },
  "required": ["email", "password"],
  "additionalProperties": false
}
```

这说明：

- `z.string()` 可以转换成 `"type": "string"`
- `.email()` 可以转换成 `"format": "email"`
- `.min(1)` 可以转换成 `"minLength": 1`
- `.max(255)` 可以转换成 `"maxLength": 255`
- `z.object({ ... })` 可以转换成 `"type": "object"` 和 `"properties"`
- 必填字段可以转换成 `"required"`

这一步最重要的收获是：

```text
Zod 里已经写过一遍的字段规则，不一定要在 OpenAPI 里完全手写第二遍。
```

## 哪些信息可以自动生成？

从这次实验看，下面这些信息比较适合从 Zod 自动生成：

- 字段名，比如 `email`、`password`、`name`、`title`
- 字段类型，比如 string、boolean、object
- 必填字段，比如 `email` 和 `password`
- 字符串长度限制，比如 `minLength`、`maxLength`
- 邮箱格式，比如 `format: "email"`
- object 的属性结构，比如 `properties`

这些信息本来就是 Zod schema 的职责范围。

Zod 负责运行时输入校验，OpenAPI 负责 API 契约描述。
当两边都需要描述“请求 body 长什么样”时，就会出现重复。

## 哪些信息仍然需要手写？

Zod 只能描述数据结构和部分校验规则，不能描述完整接口。

下面这些 OpenAPI 信息仍然需要额外手写或通过别的配置补充：

- 接口路径，比如 `/auth/login`
- HTTP method，比如 `POST`
- 接口说明，比如 `summary`
- 状态码，比如 `200`、`400`、`401`
- 成功响应和错误响应分别是什么
- 哪些接口需要 Bearer Token
- 业务错误码，比如 `INVALID_CREDENTIALS`
- 参数来自 body、query、params 还是 header

所以不能把“Zod 转 JSON Schema”理解成“OpenAPI 自动完成了”。

更准确的理解是：

```text
Zod 可以帮 OpenAPI 生成 schema 部分。
OpenAPI 的 paths、responses、security 仍然需要工程化组织。
```

## 我现在怎么理解 Zod 和 OpenAPI 的关系？

我现在可以这样理解：

```text
Zod 是后端运行时的守门员。
OpenAPI 是 API 对外的说明书。
```

比如登录接口：

```text
用户请求 POST /auth/login
```

后端会先用 Zod 校验：

```text
email 必须是邮箱
password 必须是字符串
```

而 OpenAPI 会告诉前端或工具：

```text
这个接口需要 email / password，成功后会返回 token，失败会返回错误响应。
```

它们不是同一个东西，但有一部分内容可以共享。

如果以后接口越来越多，完全手写 OpenAPI 很容易和 Zod 不同步。
用 Zod 辅助生成 schema，可以减少重复维护。

## 这次实验的结论

这次实验可以得出一个很实用的结论：

```text
OpenAPI 自动生成不是魔法。
它只是把代码里已有的结构化信息，转换成文档工具能读懂的结构。
```

后面继续做 OpenAPI 工程化时，可以考虑：

- 用 Zod 管请求 body 和 query 的 schema
- 用工具把 Zod schema 转成 OpenAPI schema
- 再手写或封装 paths、responses、security 这些接口级信息

这样既能保留 Zod 的运行时校验价值，也能让 API 文档更稳定。
