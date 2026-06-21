import { Router } from "express";

export const healthRouter = Router();

// GET /health
//
// 健康检查接口通常用于确认服务是否还活着。
// 它应该尽量简单，不依赖数据库、登录状态或其他外部服务。
// 这样当它失败时，我们可以判断问题大概率发生在应用启动层面。
healthRouter.get("/", (_request, response) => {
  response.json({
    success: true,
    data: {
      status: "ok",
      service: "node-learning-api"
    }
  });
});
