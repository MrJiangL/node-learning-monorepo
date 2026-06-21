import type { ErrorCode } from "./error-code.js";

// AppError 是我们自己定义的“可预期业务错误”。
//
// 普通 Error 只有 message，不知道应该返回 400、401 还是 404。
// 所以这里额外保存：
// - statusCode：HTTP 状态码
// - code：给前端或调用方看的稳定错误码
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;

  constructor(statusCode: number, code: ErrorCode, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}
