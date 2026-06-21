# Task: OpenAPI 进阶：用 Zod schema 辅助生成文档

## 背景

你已经手写了：

```text
docs/openapi.json
```

也复盘了 OpenAPI 的定位：

```text
OpenAPI 是 API 契约。
Zod 是运行时输入校验。
```

现在可以进入下一步：看见“重复”。

比如登录请求的字段现在可能写了两遍：

```text
apps/api/src/modules/auth/auth.schema.ts
docs/openapi.json
```

这张任务只做一个最小实验：

```text
把已有的 Zod schema 转成 JSON Schema，观察它和 OpenAPI components.schemas 的关系。
```

先不改 Express route，也不要求生成完整 Swagger 文档。

---

## 你会练到什么

- 理解 Zod schema 可以被转换成 JSON Schema
- 理解 OpenAPI 的 `components.schemas` 为什么可以复用这类结构
- 看见“手写 OpenAPI”和“从代码生成文档”的区别
- 理解自动生成文档也不是魔法，它只是减少一部分重复

---

## 任务 1：安装转换工具

在项目根目录运行：

```bash
npm install zod-to-json-schema -w @learn/api
```

这个包的作用很直白：

```text
把 Zod schema 转成 JSON Schema。
```

而 OpenAPI 的 schema 描述方式和 JSON Schema 很接近，所以它可以作为 OpenAPI 自动化的第一步。

---

## 任务 2：新增一个 schema 转换脚本

创建文件：

```text
apps/api/src/scripts/openapi-schema-lab.ts
```

写入下面代码。

注意：这不是生产级生成器，只是学习实验脚本。

```ts
import { zodToJsonSchema } from "zod-to-json-schema";
import { loginUserSchema } from "../modules/auth/auth.schema.js";
import { createProjectSchema } from "../modules/projects/projects.schema.js";
import { createTodoSchema } from "../modules/todos/todos.schema.js";

// 这个脚本的目标不是启动 API 服务，而是观察：
// “我们平时用来校验请求 body 的 Zod schema，能不能转换成文档里能使用的 schema？”
//
// 你可以把它理解成一个学习用的小实验：
// - Zod schema：给后端运行时校验输入
// - JSON Schema：给文档、工具、OpenAPI 描述数据结构
const schemas = {
  LoginRequest: loginUserSchema,
  CreateProjectRequest: createProjectSchema,
  CreateTodoRequest: createTodoSchema
};

// Object.entries() 会把对象变成一组 [name, schema]。
//
// 例如：
// {
//   LoginRequest: loginUserSchema
// }
//
// 会变成：
// [
//   ["LoginRequest", loginUserSchema]
// ]
//
// 这样我们就可以用循环批量转换多个 Zod schema。
const jsonSchemas = Object.fromEntries(
  Object.entries(schemas).map(([name, schema]) => [
    name,
    zodToJsonSchema(schema, {
      // name 会出现在生成结果里，方便你知道当前 schema 是谁。
      name,

      // OpenAPI 3.1 和 JSON Schema 2020-12 更接近。
      // 这里先用默认转换结果观察结构，不急着追求完整生产配置。
      target: "jsonSchema7"
    })
  ])
);

// JSON.stringify(value, null, 2) 的第三个参数 2 表示格式化缩进。
// 这样终端输出更容易阅读。
console.log(JSON.stringify(jsonSchemas, null, 2));
```

---

## 任务 3：给脚本加 npm 命令

修改：

```text
apps/api/package.json
```

在 `scripts` 里增加：

```json
"openapi:schema-lab": "tsx src/scripts/openapi-schema-lab.ts"
```

加完之后大概像这样：

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "smoke:api": "tsx src/scripts/api-smoke.ts",
    "openapi:schema-lab": "tsx src/scripts/openapi-schema-lab.ts"
  }
}
```

你不需要把其它 script 删除，只要新增这一项。

---

## 任务 4：运行脚本并观察输出

在项目根目录运行：

```bash
npm run openapi:schema-lab -w @learn/api
```

你应该能在终端看到类似这样的结构：

```json
{
  "LoginRequest": {
    "$ref": "#/definitions/LoginRequest",
    "definitions": {
      "LoginRequest": {
        "type": "object",
        "properties": {
          "email": {
            "type": "string",
            "format": "email"
          },
          "password": {
            "type": "string"
          }
        },
        "required": ["email", "password"]
      }
    }
  }
}
```

实际输出可能不完全一样，没关系。

你重点看三件事：

```text
Zod 的 string 变成了 JSON Schema 的 type: "string"
Zod 的 email 变成了 format: "email"
Zod object 的字段变成了 properties
```

---

## 任务 5：写一点观察笔记

创建文件：

```text
docs/reviews/zod-to-openapi-schema-lab.md
```

写入：

```markdown
# Zod 转 OpenAPI Schema 实验

## 我运行了什么？

...

## Zod schema 转出来后，我看到了什么？

...

## 哪些信息可以自动生成？

...

## 哪些信息仍然需要手写？

...

## 我现在怎么理解 Zod 和 OpenAPI 的关系？

...
```

你可以重点回答：

```text
字段类型、必填字段、email 这类格式可以自动生成。
接口路径、HTTP method、状态码、鉴权方式、业务说明还需要额外写。
```

---

## 任务 6：运行验证

先跑类型检查：

```bash
npm run typecheck -w @learn/api
```

再跑脚本：

```bash
npm run openapi:schema-lab -w @learn/api
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

- [ ] 安装 `zod-to-json-schema`
- [ ] 新增 `apps/api/src/scripts/openapi-schema-lab.ts`
- [ ] `apps/api/package.json` 新增 `openapi:schema-lab`
- [ ] 脚本能输出由 Zod 转出来的 JSON Schema
- [ ] 新增 `docs/reviews/zod-to-openapi-schema-lab.md`
- [ ] 能说清楚哪些 OpenAPI 信息可以从 Zod 来，哪些仍然要手写
- [ ] `npm run typecheck -w @learn/api` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
Zod 转 OpenAPI schema 实验完成了
```
