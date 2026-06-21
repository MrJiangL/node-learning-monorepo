import { Router } from "express";
import { asyncHandler } from "../../http/async-handler.js";
import { HTTP_STATUS } from "../../http/http-status.js";
import { createAuthService } from "./auth.service.js";
import { loginUserSchema, refreshTokenSchema, registerUserSchema } from "./auth.schema.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { createRateLimiter } from "../../middleware/rate-limit.js";

export function createAuthRouter() {
  const router = Router();
  const authService = createAuthService();

  const authWriteLimiter = createRateLimiter({
    // 学习项目先设 1 分钟 5 次。
    //
    // 这个值不是“标准答案”，只是一个方便测试和理解的起点。
    // 真实项目里可以按业务风险调整。
    windowMs: 60_000,
    max: 5
  });

  router.post(
    "/register",
    authWriteLimiter,
    asyncHandler(async (req, res) => {
      const input = registerUserSchema.parse(req.body);
      const user = await authService.register(input);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: user
      });
    })
  );

  router.post(
    "/login",
    authWriteLimiter,
    asyncHandler(async (req, res) => {
      const input = loginUserSchema.parse(req.body);
      const result = await authService.login(input);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result
      });
    })
  );

  router.post(
    "/refresh",
    authWriteLimiter,
    asyncHandler(async (req, res) => {
      const input = refreshTokenSchema.parse(req.body);
      const result = await authService.refresh(input);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result
      });
    })
  );

  router.post(
    "/logout",
    authWriteLimiter,
    asyncHandler(async (req, res) => {
      const input = refreshTokenSchema.parse(req.body);
      await authService.logout(input);

      // logout 成功后没有新的资源需要返回。
      //
      // 204 No Content 表示“请求成功，但响应体为空”，
      // 所以这里不要再返回 { success: true }。
      res.status(HTTP_STATUS.NO_CONTENT).send();
    })
  );

  router.get(
    "/me",
    requireAuth,
    asyncHandler(async (req, res) => {
      // requireAuth 通过后，req.user 就是当前登录用户。
      //
      // 这里的 /auth/me 是一个很小的验证接口：
      // 它不做复杂业务，只返回“我是谁”。
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: req.user
      });
    })
  );

  return router;
}
