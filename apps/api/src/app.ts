import express from "express";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { createPlansRouter } from "./modules/plans/plans.routes.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { createRequestLogger } from "./middleware/request-logger.js";
import { env } from "./config/env.js";
import { createProjectsRouter } from "./modules/projects/projects.routes.js";
import { createTodosRouter } from "./modules/todos/todos.routes.js";
import { docsRouter } from "./modules/docs/docs.routes.js";
import type { RedisClientType } from "redis";
import { createJobsRouter } from "./jobs/jobs.routes.js";
import type { JobRepository } from "./jobs/job.repository.js";
import { createActivityLogsRouter } from "./modules/activity-logs/activity-logs.routes.js";

export type CreateAppOptions = {
  projectCacheClient?: RedisClientType;
  jobQueue?: JobRepository;
};
// createApp 只负责“组装 Express 应用”，不直接 listen 端口。
//
// 这样设计有两个好处：
// 1. server.ts 可以专心负责启动服务。
// 2. 测试可以直接拿 createApp() 生成一个 app，不需要真的占用 3001 端口。
export function createApp(options: CreateAppOptions = {}) {
  const app = express();

  // requestLogger 要尽量靠前注册。
  //
  // 这样它可以覆盖后面的所有业务路由：
  // - /health
  // - /auth/register
  // - /auth/login
  // - /plans
  //
  // 放在 express.json() 前面还有一个好处：
  // 即使请求体 JSON 解析失败，日志 middleware 也已经挂上 finish 监听了。
  app.use(
    createRequestLogger({
      // 测试环境默认静默，开发和生产环境继续打印请求日志。
      enabled: env.NODE_ENV !== "test"
    })
  );

  // express.json() 是一个内置中间件。
  // 它会把 Content-Type: application/json 的请求体解析成 request.body。
  // 如果没有它，POST /plans 里拿到的 request.body 会是 undefined。
  app.use(express.json());

  // 路由注册顺序很重要。
  // Express 会从上到下匹配中间件和路由，匹配到了就执行。
  // 这里把业务路由放在前面，让 /health 和 /plans 先有机会处理请求。
  app.use("/health", healthRouter);

  // createPlansRouter() 是一个路由工厂，不是共享的单例 router。
  // 因为 plans 目前使用内存 repository，每次 createApp() 都应该得到一份新的数据容器。
  // 这会让测试之间互不影响，也更接近真实项目里“每个 app 实例自己组装依赖”的思路。
  app.use("/plans", createPlansRouter());
  app.use(
    "/projects",
    createProjectsRouter({
      redisClient: options.projectCacheClient
    })
  );

  app.use("/auth", createAuthRouter());

  // createTodosRouter() 里包含两个完整路径：
  // - /projects/:projectId/todos
  // - /todos/:id
  //
  // 所以这里不加路径前缀，直接挂到 app 上。
  // 但它必须放在 /auth 后面，因为 Todo router 内部会先执行 requireAuth。
  // 如果放到 /auth 前面，/auth/register 也会被 Todo router 的 requireAuth 拦住。
  app.use(createTodosRouter());

  // ActivityLog router 的完整路径是 /projects/:projectId/activity-logs。
  //
  // 所以这里也不加额外前缀，避免变成 /projects/projects/:projectId/activity-logs。
  app.use(createActivityLogsRouter());
  app.use(docsRouter);

  app.use(
    "/jobs",
    createJobsRouter({
      // 默认情况下 jobs router 会使用全局 jobQueue。
      //
      // 当前真实运行的全局 jobQueue 是 PrismaJobRepository。
      // 测试时仍然可以传入独立的内存 repository，让每个测试用例互不影响。
      queue: options.jobQueue
    })
  );

  // notFound 必须放在所有正常路由后面。
  // 只有前面的路由都没有处理这个请求时，才说明它是一个 404。
  app.use(notFound);

  // errorHandler 必须放在最后。
  // 只要前面任何地方调用 next(error) 或 asyncHandler 捕获到异常，
  // Express 就会把错误交给这个统一错误处理中间件。
  app.use(errorHandler);

  return app;
}
