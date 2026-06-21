# Task: 测试强化 3：API 集成测试读写练习

## 背景

你已经练了两层测试：

```text
Service 单元测试：
  测 service 有没有正确调用协作者

Repository 测试：
  测真实数据库查询条件有没有生效
```

这张开始练 API 集成测试。

API 集成测试重点是：

```text
HTTP 请求进来后，完整链路是否符合 API 契约。
```

也就是：

```text
request
  -> middleware
  -> route
  -> Zod validation
  -> service
  -> repository
  -> database
  -> response
```

---

## 这张任务只练什么

只练：

```text
用 supertest 发真实 HTTP 请求，然后断言 status / body
```

暂时不碰：

```text
复杂 mock
前端 E2E
浏览器测试
性能测试
```

---

## 学习目标

完成后你应该能说清楚：

```text
1. API 集成测试和 Repository 测试有什么区别
2. 为什么 API 测试要走 register/login 拿 token
3. authHeader(token) 是在模拟什么
4. 为什么非法 query 参数应该在 API 测试里测
5. 为什么 API 测试不适合验证所有数据库细节
```

---

## 任务 1：阅读现有 API 集成测试

打开：

```text
apps/api/tests/integration/activity-logs.test.ts
```

重点读这几个测试：

```text
1. 未登录不能查看 Project 活动记录
2. 可以按 action 查询 Project 活动记录
3. action 参数非法时返回校验错误
4. createdAfter 参数非法时返回校验错误
```

读的时候只回答：

```text
这个测试在验证 HTTP 层的什么契约？
```

---

## 任务 2：写一段阅读笔记

创建：

```text
docs/reviews/api-integration-test-notes.md
```

写下面几个小标题：

```md
# API 集成测试阅读笔记

## 1. API 集成测试在测什么

## 2. registerAndLogin / authHeader 是做什么的

## 3. 为什么非法 query 参数适合放在 API 测试里

## 4. API 测试和 Repository 测试的区别

## 5. 我现在还不懂的地方
```

每节 2-4 句即可。

---

## 任务 3：补一个很小的 API 集成测试

修改：

```text
apps/api/tests/integration/activity-logs.test.ts
```

新增测试：

```ts
it("createdBefore 参数非法时返回校验错误", async () => {
  // 你来实现
});
```

参考 `createdAfter 参数非法时返回校验错误`。

流程：

```text
1. createApp()
2. registerAndLogin()
3. createProject()
4. GET /projects/:projectId/activity-logs?createdBefore=not-a-date
5. 断言 status 是 400
6. 断言 error.code 是 VALIDATION_ERROR
```

这条测试的意义：

```text
它不测 Prisma 时间过滤。
它只测 API query validation：
createdBefore 不是合法 datetime 时，HTTP 响应应该是 400。
```

---

## 验证命令

先跑这个测试文件：

```bash
npm run test -w @learn/api -- activity-logs.test.ts
```

再跑：

```bash
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] 创建 `docs/reviews/api-integration-test-notes.md`
- [x] 写清楚 API 集成测试测什么
- [x] 写清楚 registerAndLogin / authHeader 的作用
- [x] 写清楚非法 query 为什么适合放 API 测试
- [x] 写清楚 API 测试和 Repository 测试的区别
- [x] 补充 `createdBefore` 非法参数测试
- [x] `npm run test -w @learn/api -- activity-logs.test.ts` 通过
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
API 集成测试读写练习完成了
```
