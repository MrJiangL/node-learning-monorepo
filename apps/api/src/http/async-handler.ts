import type { NextFunction, Request, RequestHandler, Response } from "express";

// Express 4 不会自动捕获 async route 里抛出的错误。
//
// 如果没有这个工具函数，下面这种写法里的异常可能不会进入 errorHandler：
// async (request, response) => {
//   throw new Error("boom");
// }
//
// asyncHandler 做的事情很简单：
// 1. 执行异步 route handler。
// 2. 如果 Promise reject，就把错误交给 next(error)。
// 3. Express 收到 next(error) 后，会跳到最后的错误处理中间件。
export function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (request, response, next) => {
    void handler(request, response, next).catch(next);
  };
}
