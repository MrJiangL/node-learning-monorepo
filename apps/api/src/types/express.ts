import type { User } from "@learn/shared";

declare global {
  namespace Express {
    interface Request {
      // requireAuth 中间件验证 token 成功后，会把当前用户放到 req.user。
      //
      // 这里写成可选，是因为不是所有路由都要求登录。
      // 例如 /health、/auth/register、/auth/login 都不会有 req.user。
      user?: User;
    }
  }
}

export {};
