// HTTP 状态码统一放在这里，避免 route / middleware 里散落大量裸数字。
//
// 好处：
// - HTTP_STATUS.CREATED 比 201 更有语义。
// - 以后看到状态码时，不需要靠记忆猜数字含义。
// - 如果项目里要统一检查状态码使用，也更容易搜索。
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
} as const;
