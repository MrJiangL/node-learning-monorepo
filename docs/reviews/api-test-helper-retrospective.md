# API 测试 helper 小阶段复盘

## 1. 这次抽出了哪些 helper？

```text
我抽出了： cleanupDatabase 这个函数是在 beforeEach 是清理数据 避免之前数据影响接下来的测试
registerAndLogin 这个发送真实请求 发送 register 然后登录 登录成功后拿到token 以及用户信息
authHeader 组装Authorization token

createProject 真实请求 创建 project

createTodo 真实请求创建 todo

```

2. 为什么 registerAndLogin 要走真实 auth/register 和 auth/login？

因为这样可以真实模拟客户端 真实登录的情况

3. 为什么 createProject / createTodo 走 HTTP API，而不是直接 prisma.create？
   因为你直接使用 prisma 来做的话 意味着你还是自己调用 数据库的后台，不是真实 客户端那边创建
4. cleanupDatabase 为什么要先删 Todo，再删 Project / Plan，最后删 User？
   你如果先删 user 会导致 删除数据的时候匹配不上对应的userId 导致删除失败，还有 删除时需要先删关联的子表 在删父表 这样不会导致子表 匹配不到对应的父表
5. helper 抽取后，测试文件更容易读了吗？
   感觉读是没什么问题，就是如果让我自己不看任务手写 可能我写的有很多问题
6. 下一阶段我准备好了接前端吗？
   你来帮我看下是不是准备好了

---

## 导师评估

### 总体判断

你这次复盘抓住了重点：helper 的价值不是“少写几行代码”，而是把测试里的准备动作统一起来，让测试文件更专注业务行为。

你现在对这几个点的理解是合格的：

```text
cleanupDatabase：清理数据，避免上一个测试影响下一个测试。
registerAndLogin：走真实注册和登录，拿 token 和用户信息。
authHeader：组装 Authorization header。
createProject / createTodo：通过真实 HTTP API 准备数据。
```

### 需要补精确的地方

#### 1. createProject / createTodo 为什么走 HTTP API？

你的理解是对的：直接 Prisma 写库不是客户端行为。

再补一句更工程化的说法：

```text
integration test helper 应该尽量复用真实 API 链路，这样测试能覆盖 route、middleware、schema、service、repository 的协作。
```

如果我们用 `prisma.project.create()` 直接造 Project，就会绕过：

```text
requireAuth
Zod schema
route handler
service 权限判断
```

这样测试准备虽然快，但它验证的链路就变短了。

#### 2. cleanupDatabase 的删除顺序

你说“先删子表，再删父表”是对的。

更准确地说：

```text
Todo 依赖 Project。
Project / Plan 依赖 User。
所以清理顺序是 Todo -> Project / Plan -> User。
```

这样测试不用依赖数据库级联删除，也更容易读懂。

#### 3. 你准备好接前端了吗？

我的判断是：可以开始接前端了。

原因：

```text
后端 API 已经有认证、Project、Todo、分页、过滤、权限边界、错误响应和集成测试。
测试 helper 也完成了第一轮工程化。
```

但前端第一步不要直接做完整页面。

建议顺序是：

```text
1. 先搭 apps/web：Vite + React + TypeScript。
2. 用 Vite proxy 调 GET /health，确认前端能连后端。
3. 再做登录页。
4. 再做 Project / Todo 页面。
```

当前学习进度更新：

```text
Node 后端：约 75% 到 78%
测试工程化：刚入门，但已经有可复用 helper 意识
下一阶段：前端接入阶段
```
