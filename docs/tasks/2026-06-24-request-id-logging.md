# Task: 生产化监控增强：Request ID 日志串联

## 背景

你已经完成了 Railway API 部署、Netlify 前端部署、前后端线上联调，以及前端产品体验主链路。

下一阶段你选择 B：回到生产化监控。

监控增强的第一步，不是马上接第三方平台，而是先让后端日志更容易串起来。

现在如果线上用户说：

    我刚才创建 Project 失败了。

你需要能回答：

    这是哪一次请求？
    这次请求经过了哪些日志？
    最后是成功、业务错误，还是服务器错误？

这张任务先做一个小而关键的能力：

    给每个请求生成 requestId，并在日志和响应头里带上它。

---

## 这张任务只练什么

只练三件事：

1. 给每个 HTTP 请求生成 requestId
2. 让 request logger 和 error handler 都能打印 requestId
3. 给响应加上 X-Request-Id header

不接 Sentry，不接 Datadog，不做前端错误上报。

---

## 任务 1：先阅读现有日志代码

打开：

    apps/api/src/middleware/request-logger.ts
    apps/api/src/middleware/error-handler.ts
    apps/api/src/app.ts
    apps/api/src/types/express.ts

先回答自己：

- request logger 现在记录了什么？
- error handler 现在记录了什么？
- Express 的 req 上现在有没有自定义字段？
- 如果要在 req 上挂 requestId，类型应该在哪里补？

---

## 任务 2：新增 requestId middleware

建议新增：

    apps/api/src/middleware/request-id.ts

建议结构：

    import type { NextFunction, Request, Response } from "express";
    import { randomUUID } from "node:crypto";

    export function requestId(req: Request, res: Response, next: NextFunction) {
      const existingRequestId = req.header("x-request-id");
      const id = existingRequestId?.trim() || randomUUID();

      req.requestId = id;
      res.setHeader("X-Request-Id", id);

      next();
    }

学习点：

如果调用方已经传了 x-request-id，可以沿用它。

如果没有，就由后端生成。

这样以后前端、网关或外部调用方也可以把自己的 request id 传进来。

---

## 任务 3：扩展 Express 类型

修改：

    apps/api/src/types/express.ts

给 Request 增加：

    requestId?: string;

学习点：

TypeScript 默认不知道 Express Request 上会有 requestId。

如果不扩展类型，后面 req.requestId 会报类型错误。

---

## 任务 4：在 app.ts 注册 middleware

修改：

    apps/api/src/app.ts

requestId 应该放在 request logger 之前。

原因：

    logger 要打印 requestId。
    如果 requestId middleware 放在 logger 后面，logger 执行时还拿不到 requestId。

顺序大概是：

    app.use(requestId);
    app.use(requestLogger);

---

## 任务 5：更新 request logger

修改：

    apps/api/src/middleware/request-logger.ts

让日志包含 requestId。

如果当前 logger 是字符串格式，也可以先保留字符串，只要包含 requestId。

学习点：

request logger 记录“请求结束时发生了什么”。

它适合记录 method、path、statusCode、durationMs 和 requestId。

---

## 任务 6：更新 error handler

修改：

    apps/api/src/middleware/error-handler.ts

服务端错误日志里也要包含 requestId。

学习点：

request logger 记录“请求结束时发生了什么”。

error handler 记录“异常细节是什么”。

两边都有 requestId，才能把一次失败请求串起来。

响应体可以先不返回 requestId。

但响应 header 必须有：

    X-Request-Id

---

## 任务 7：补测试

建议新增：

    apps/api/tests/integration/request-id.test.ts

至少覆盖：

1. 没传 x-request-id 时，响应有 x-request-id
2. 传了 x-request-id 时，响应沿用传入值
3. request logger 日志里包含 requestId
4. error handler 日志里包含 requestId

如果第 3 / 4 条 mock console 比较绕，可以先至少覆盖 header 行为。

---

## 先不要做

这张任务先不要：

- 不要接 Sentry
- 不要接 Datadog
- 不要做前端错误上报
- 不要把 requestId 存数据库
- 不要改所有 API 响应体结构

先把一次 HTTP 请求的日志串联能力打通。

---

## 验证命令

先跑相关测试：

    npm run test -w @learn/api -- request-id

再跑后端测试和类型检查：

    npm run test -w @learn/api
    npm run typecheck -w @learn/api
    npm run format:check

---

## 完成标准

- [x] 新增 requestId middleware
- [x] req.requestId 类型已扩展
- [x] 响应 header 包含 X-Request-Id
- [x] 传入 x-request-id 时会沿用
- [x] request logger 包含 requestId
- [x] error handler 日志包含 requestId
- [x] 补 request id 相关测试
- [x] npm run test -w @learn/api 通过
- [x] npm run typecheck -w @learn/api 通过
- [x] npm run format:check 通过

## 完成记录

- 完成时间：2026-06-24
- 新增 middleware：apps/api/src/middleware/request-id.ts
- 新增测试：apps/api/tests/integration/request-id.test.ts
- 更新测试：
  - apps/api/tests/integration/health.test.ts
  - apps/api/tests/integration/error-handler.test.ts
- 验证结果：
  - npm run test -w @learn/api -- request-id 通过
  - npm run test -w @learn/api 通过，38 个文件、270 个测试
  - npm run typecheck -w @learn/api 通过
  - npm run format:check 通过

完成后告诉我：

    Request ID 日志串联完成了
