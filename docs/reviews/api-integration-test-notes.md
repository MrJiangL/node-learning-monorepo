# API 集成测试阅读笔记

## 1. API 集成测试在测什么

我的理解是，API 集成测试在测整个 HTTP 请求链路是否符合 API 契约。

它不是只测某一个函数，而是从 `request` 进来，经过 middleware、route、Zod validation、service、repository，最后再看 response 的 `status` 和 `body` 是否正确。

所以它最适合验证“外部调用者看到的行为”，比如未登录返回 401、参数非法返回 400、成功时返回 `success/data/meta`。

## 2. registerAndLogin / authHeader 是做什么的

`registerAndLogin` 是测试 helper，它会在测试里创建一个真实用户，然后登录拿到 access token。

它的作用不是“校验用户是否登录”，而是帮测试准备一个已经登录的用户身份。

`authHeader(token)` 会生成 `Authorization: Bearer <token>` 请求头，用来模拟前端带着 token 调接口。

## 3. 为什么非法 query 参数适合放在 API 测试里

因为非法 query 参数是从 HTTP URL 进来的，真正负责拦截它的是 route 层附近的 Zod validation。

比如 `createdBefore=not-a-date` 不应该进入 Prisma 查询，而应该在 API 边界就返回 400。

所以这个测试重点不是查数据库，而是验证 API 对外的错误响应契约：`status` 是 400，`error.code` 是 `VALIDATION_ERROR`。

## 4. API 测试和 Repository 测试的区别

API 测试覆盖的是完整 HTTP 链路，重点看接口对外表现是否正确。

Repository 测试覆盖的是数据访问层，重点看 Prisma 查询条件、排序、分页、关系过滤是否真的查对了数据库。

简单说：API 测试更关心“接口返回什么”，Repository 测试更关心“数据库怎么查”。

## 5. 我现在还不懂的地方

我现在还需要继续练的是：看到一个需求时，怎么判断它应该放在 Service 测试、Repository 测试，还是 API 集成测试里。

目前可以先用一个简单判断：如果要验证 HTTP 状态码、请求头、query/body 校验、错误响应格式，就优先放 API 测试；如果要验证数据库查询细节，就优先放 Repository 测试。
