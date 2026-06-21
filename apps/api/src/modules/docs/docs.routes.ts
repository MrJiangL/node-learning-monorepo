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
