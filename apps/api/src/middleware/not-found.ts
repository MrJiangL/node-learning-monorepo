import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";
import { HTTP_STATUS } from "../http/http-status.js";
import { ERROR_CODE } from "../errors/error-code.js";

// 这个中间件专门处理 404。
//
// 它不直接 response.status(404).json(...)，而是 next(new AppError(...))。
// 这样所有错误响应都能统一从 error-handler.ts 出去，返回格式保持一致。
export const notFound: RequestHandler = (request, _response, next) => {
  next(
    new AppError(
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODE.NOT_FOUND,
      `Route ${request.method} ${request.path} was not found`
    )
  );
};
