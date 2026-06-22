# Task: 增强 Error Handler 服务端日志

## 背景

`/ready` 数据库 readiness check 已经实现。

当前 error handler 对客户端是安全的：未知错误只返回通用 500，不泄露内部信息。

下一步要增强服务端日志：

- 客户端仍然看不到内部错误细节
- Railway logs 能看到足够的错误上下文

---

## 这张任务练什么

1. 区分客户端错误响应和服务端错误日志
2. 给未知错误记录 method / path / message / stack
3. 避免把敏感信息返回给客户端
4. 为后续 request id 做准备

---

## 涉及文件

- `apps/api/src/middleware/error-handler.ts`
- `apps/api/tests/unit` 或 `apps/api/tests/integration` 中新增/扩展错误处理测试

---

## 完成标准

- [ ] 未知错误会写入服务端日志
- [ ] 客户端仍然只收到通用 500
- [ ] 测试验证不会泄露原始错误 message
- [ ] 测试验证 `console.error` 被调用
- [ ] `npm run test -w @learn/api` 通过
- [ ] `npm run typecheck` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

`Error Handler 服务端日志增强完成了`
