import type { RequestHandler } from "express";
import { HTTP_STATUS } from "../http/http-status.js";
import { ERROR_CODE } from "../errors/error-code.js";

type RateLimitOptions = {
  windowMs: number;
  max: number;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  // hits 是这个 middleware 自己持有的内存状态。
  //
  // key 是访问者标识，例如 IP。
  // value 记录这个 key 在当前时间窗口内请求了多少次，以及窗口什么时候重置。
  //
  // 因为 hits 放在 createRateLimiter 里面，所以每次 createApp() 创建新 app 时，
  // 测试环境都会得到一份新的计数器，不容易互相污染。
  const hits = new Map<string, RateLimitRecord>();

  return (request, response, next) => {
    // request.ip 是 Express 解析出的客户端 IP。
    //
    // 如果拿不到 IP，就退回 unknown。
    // 学习阶段先这样处理；真实项目里要结合反向代理和 trust proxy 配置。
    const key = request.ip ?? "unknown";
    const now = Date.now();
    const current = hits.get(key);

    if (!current || current.resetAt <= now) {
      hits.set(key, {
        count: 1,
        resetAt: now + options.windowMs
      });

      next();
      return;
    }

    if (current.count >= options.max) {
      response.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        error: {
          code: ERROR_CODE.RATE_LIMITED,
          message: "Too many requests, please try again later"
        }
      });
      return;
    }

    hits.set(key, {
      ...current,
      count: current.count + 1
    });

    next();
  };
}
