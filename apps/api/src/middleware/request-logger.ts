import type { RequestHandler } from "express";

export type RequestLoggerOptions = {
  enabled: boolean;
};

export function createRequestLogger(options: RequestLoggerOptions): RequestHandler {
  return (request, response, next) => {
    // 测试环境默认关闭请求日志，避免测试输出被大量 GET/POST 日志淹没。
    //
    // 这里关闭的只是“打印日志”这个副作用；
    // 请求本身仍然要继续往后走，所以必须调用 next()。
    if (!options.enabled) {
      next();
      return;
    }

    // 记录请求进入 middleware 的时间。
    // 等响应真正结束时，用当前时间减去它，就能得到请求耗时。
    const startTime = Date.now();

    // finish 事件会在响应已经发送完成后触发。
    //
    // 注意：这里只记录日志，不要在这里调用 next()。
    // 如果把 next() 放进 finish 回调，请求就永远到不了后面的 route，
    // 因为 route 不执行就不会有 response finish，最终会形成“互相等待”。
    response.on("finish", () => {
      const durationMs = Date.now() - startTime;
      console.log(
        `${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs}ms`
      );
    });

    // 监听注册好之后，立刻把请求交给后面的 middleware / route。
    next();
  };
}
