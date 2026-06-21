# Task: OpenAPI 工程化：接入 Swagger UI 文档页

## 背景

你现在已经有了：

```text
docs/openapi.json
```

也做过一个 Zod 转 JSON Schema 的实验。

但现在 OpenAPI 还只是一个文件。

真实项目里更常见的做法是把它挂到后端服务上，让开发时可以打开浏览器查看接口文档：

```text
http://localhost:3001/docs
```

这张任务要做的就是接入 Swagger UI。

目标不是把 OpenAPI 写全，而是先把“API 文档可以被服务暴露出来”这件事跑通。

---

## 你会练到什么

- Express 如何挂载第三方 middleware
- Swagger UI 和 OpenAPI JSON 的关系
- 为什么 `/docs` 是给人看的页面，`/openapi.json` 是给工具看的数据
- 如何给文档路由写一个很小的集成测试
- 为什么文档路由要放在 `notFound` 和 `errorHandler` 前面

---

## 任务 1：安装 Swagger UI 依赖

在项目根目录运行：

```bash
npm install swagger-ui-express -w @learn/api
npm install -D @types/swagger-ui-express -w @learn/api
```

说明：

```text
swagger-ui-express
```

负责把 OpenAPI JSON 渲染成浏览器里的 Swagger UI 页面。

```text
@types/swagger-ui-express
```

给 TypeScript 提供类型声明。

---

## 任务 2：新增 docs router

创建文件：

```text
apps/api/src/modules/docs/docs.routes.ts
```

写入：

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Router } from "express";
import swaggerUi from "swagger-ui-express";

// 当前命令通常是通过 npm workspace 在 apps/api 目录下运行：
//
// npm run dev -w @learn/api
// npm run test -w @learn/api
//
// 所以 process.cwd() 多数情况下是 apps/api。
// ../../docs/openapi.json 则回到 monorepo 根目录下的 docs/openapi.json。
//
// 这里先用读文件的方式加载 OpenAPI：
// - 对学习者来说更直观
// - 避免 TypeScript 编译后 JSON import 路径变复杂
const openApiPath = resolve(process.cwd(), "../../docs/openapi.json");

// OpenAPI 文件是 JSON，所以读出来后要 JSON.parse 成对象。
//
// swagger-ui-express 需要的不是字符串，而是已经解析好的 OpenAPI document。
const openApiDocument = JSON.parse(readFileSync(openApiPath, "utf-8"));

export const docsRouter = Router();

// /openapi.json 是给工具看的原始契约数据。
//
// 比如后面如果前端要生成 API client，或者测试要做契约校验，
// 它们通常会读取这个 JSON。
docsRouter.get("/openapi.json", (_request, response) => {
  response.json(openApiDocument);
});

// /docs 是给人看的文档页面。
//
// swaggerUi.serve 负责提供 Swagger UI 需要的静态资源。
// swaggerUi.setup(openApiDocument) 负责把当前 OpenAPI document 注入页面。
docsRouter.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
```

---

## 任务 3：在 app.ts 注册 docs router

修改：

```text
apps/api/src/app.ts
```

新增 import：

```ts
import { docsRouter } from "./modules/docs/docs.routes.js";
```

然后在业务路由附近注册：

```ts
app.use(docsRouter);
```

建议放在这些路由之后：

```ts
app.use("/auth", createAuthRouter());
app.use(createTodosRouter());
```

但一定要放在：

```ts
app.use(notFound);
app.use(errorHandler);
```

之前。

原因：

```text
notFound 后面的路由不会再被正常匹配。
如果 /docs 放在 notFound 后面，访问 /docs 会先变成 404。
```

---

## 任务 4：新增 docs 路由测试

创建文件：

```text
apps/api/tests/integration/docs.test.ts
```

写入：

```ts
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
  });

  it("可以打开 Swagger UI 文档页", async () => {
    const app = createApp();

    const response = await request(app).get("/docs/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Swagger UI");
  });
});
```

这里的测试不是验证 Swagger UI 的每个按钮。

它只验证两个最关键的入口：

```text
/openapi.json 能返回机器可读契约
/docs/ 能返回人可以看的 HTML 文档页
```

---

## 任务 5：本地打开看看

启动 API：

```bash
npm run dev:api
```

然后打开：

```text
http://localhost:3001/docs
```

你应该能看到 Swagger UI 页面。

再打开：

```text
http://localhost:3001/openapi.json
```

你应该能看到原始 OpenAPI JSON。

如果你本地服务不是 3001，按终端实际输出的端口访问。

---

## 任务 6：运行验证

先跑新测试：

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

- [ ] 安装 `swagger-ui-express`
- [ ] 安装 `@types/swagger-ui-express`
- [ ] 新增 `apps/api/src/modules/docs/docs.routes.ts`
- [ ] 在 `apps/api/src/app.ts` 注册 docs router
- [ ] 新增 `apps/api/tests/integration/docs.test.ts`
- [ ] `GET /openapi.json` 返回 OpenAPI JSON
- [ ] `GET /docs/` 返回 Swagger UI HTML
- [ ] `npm run test -w @learn/api -- tests/integration/docs.test.ts` 通过
- [ ] `npm run typecheck -w @learn/api` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
Swagger UI 文档页完成了
```
