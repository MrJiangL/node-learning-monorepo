import { Router } from "express";
import { ERROR_CODE } from "../../errors/error-code.js";
import { HTTP_STATUS } from "../../http/http-status.js";
import { prisma } from "../../db/prisma.js";

export type ReadinessCheck = () => Promise<void>;

export type CreateHealthRouterOptions = {
  readinessCheck?: ReadinessCheck;
};

async function checkDatabaseReady() {
  // /ready 是 readiness check，不是业务查询。
  //
  // 这里用最轻量的 SELECT 1 验证：
  // - Prisma Client 能工作
  // - 数据库连接能建立
  // - 当前服务已经准备好访问数据库
  await prisma.$queryRaw`SELECT 1`;
}

export function createHealthRouter(options: CreateHealthRouterOptions = {}) {
  const healthRouter = Router();
  const readinessCheck = options.readinessCheck ?? checkDatabaseReady;

  // GET /health
  //
  // 健康检查接口通常用于确认服务是否还活着。
  // 它应该尽量简单，不依赖数据库、登录状态或其他外部服务。
  // 这样当它失败时，我们可以判断问题大概率发生在应用启动层面。
  healthRouter.get("/health", (_request, response) => {
    response.json({
      success: true,
      data: {
        status: "ok",
        service: "node-learning-api"
      }
    });
  });

  // GET /ready
  //
  // readiness check 用来确认服务是否“准备好承接真实流量”。
  //
  // 和 /health 不同，/ready 可以检查外部依赖。
  // 第一版先只检查数据库，避免一次性把 Redis / worker 都加进来。
  healthRouter.get("/ready", async (_request, response) => {
    try {
      await readinessCheck();

      response.json({
        success: true,
        data: {
          status: "ready",
          service: "node-learning-api",
          dependencies: {
            database: "ok"
          }
        }
      });
    } catch {
      // 不把底层数据库错误、连接地址、密码或堆栈返回给客户端。
      //
      // 生产环境里详细错误应该进入服务端日志；
      // readiness 响应只告诉调用方：服务暂时还没准备好。
      response.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        success: false,
        error: {
          code: ERROR_CODE.SERVICE_UNAVAILABLE,
          message: "Service is not ready"
        }
      });
    }
  });

  return healthRouter;
}

export const healthRouter = createHealthRouter();
