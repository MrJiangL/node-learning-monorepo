import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors/app-error.js";
import { HTTP_STATUS } from "../http/http-status.js";
import { ERROR_CODE } from "../errors/error-code.js";

// Express 的错误处理中间件有 4 个参数：
// (error, request, response, next)
// 只要参数数量是 4 个，Express 就知道这是错误处理函数。
export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  // AppError 是我们主动抛出的、可预期的错误，例如：
  // - 参数校验失败：400 VALIDATION_ERROR
  // - 路由不存在：404 NOT_FOUND
  // 这类错误可以把具体 message 返回给客户端。
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message
      }
    });
    return;
  }

  // 其他未知错误统一返回 500。
  // 学习重点：不要把未知错误的原始 message 直接返回给用户。
  // 真实项目里，详细错误应该写入服务端日志；客户端只看到通用提示。
  console.error("Unhandled request error", {
    method: request.method,
    path: request.originalUrl,
    errorName: error instanceof Error ? error.name : typeof error,
    errorMessage: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });

  response.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      code: ERROR_CODE.INTERNAL_SERVER_ERROR,
      message: "Unexpected server error"
    }
  });
};
