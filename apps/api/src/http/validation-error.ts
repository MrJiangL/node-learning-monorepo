import { ZodError } from "zod";
import { AppError } from "../errors/app-error.js";
import { HTTP_STATUS } from "./http-status.js";
import { ERROR_CODE } from "../errors/error-code.js";

type ValidationSource = "body" | "query";

export function mapZodErrorToAppError(error: unknown, source: ValidationSource): never {
  if (error instanceof ZodError) {
    // ZodError.issues 里可能有多条错误。
    //
    // 学习阶段先返回第一条错误 message，
    // 这样响应简单，前端也容易显示。
    const fallbackMessage = source === "query" ? "Invalid query string" : "Invalid request body";
    const message = error.issues[0]?.message ?? fallbackMessage;

    throw new AppError(HTTP_STATUS.BAD_REQUEST, ERROR_CODE.VALIDATION_ERROR, message);
  }

  // 这个 helper 只处理 ZodError。
  //
  // 如果是数据库错误、业务错误或未知错误，继续往外抛，
  // 交给 errorHandler 做统一处理。
  throw error;
}
