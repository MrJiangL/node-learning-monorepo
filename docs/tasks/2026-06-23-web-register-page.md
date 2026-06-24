# Task: 前端产品体验：注册页

## 背景

线上部署完成后，我们发现一个真实产品体验问题：

```text
前端只有登录页，没有注册页。
```

所以测试账号必须通过 `POST /auth/register` 手动创建。

下一步先补注册页，让用户可以从前端自己完成注册，然后直接进入 Project 工作台。

---

## 这张任务练什么

这张任务练四件事：

1. 前端 API client 怎么封装注册请求
2. Vue 表单页怎么处理 submitting / error 状态
3. 注册成功后怎么保存 token 并跳转
4. 登录页和注册页之间怎么互相导航

---

## 涉及文件

你主要会改这些文件：

- `apps/web/src/api/auth.ts`
- `apps/web/src/router/index.ts`
- `apps/web/src/pages/LoginPage/index.vue`
- `apps/web/src/pages/RegisterPage/index.vue`
- `apps/web/src/style.css`

可能会新增这些测试：

- `apps/web/src/api/__tests__/auth.test.ts`
- `apps/web/src/pages/RegisterPage/__tests__/RegisterPage.test.ts`

---

## 任务 1：给 auth API client 增加 registerUser

现在 `apps/web/src/api/auth.ts` 已经有：

- `loginUser`
- `refreshAuthToken`

新增：

```ts
registerUser(input: RegisterUserInput): Promise<LoginResponse>
```

注意：

- 类型可以从 `@learn/shared` 引入 `RegisterUserInput`
- 请求地址是 `buildApiUrl("/auth/register")`
- method 是 `POST`
- header 要有 `Content-Type: application/json`
- body 要 `JSON.stringify(input)`
- 错误时用 `parseApiError(response, "注册失败，请检查邮箱和密码")`

后端 `POST /auth/register` 当前只返回 user，不返回 token。

所以这张任务有一个小设计选择：

注册成功后，再自动调用 `loginUser({ email, password })` 登录。

这样前端最终仍然能拿到 accessToken / refreshToken，然后跳转到 `/projects`。

---

## 任务 2：先写 auth API client 测试

创建：

`apps/web/src/api/__tests__/auth.test.ts`

至少覆盖：

1. `registerUser` 会请求 `/auth/register`
2. 请求 body 包含 `email`、`password`、`name`
3. 注册接口非 2xx 时会抛出错误

提示：

- 可以 mock `globalThis.fetch`
- 测试重点不是后端真的注册成功，而是前端 API client 的请求合同正确

---

## 任务 3：创建 RegisterPage

创建：

`apps/web/src/pages/RegisterPage/index.vue`

页面字段：

- 邮箱：`email`
- 密码：`password`
- 昵称：`name`，可选

页面行为：

1. 用户提交注册表单
2. 调用 `registerUser({ email, password, name })`
3. 注册成功后调用 `loginUser({ email, password })`
4. 保存 `accessToken` 和 `refreshToken`
5. 跳转到 `/projects`

状态建议复用登录页的模式：

```ts
type RegisterState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string };
```

---

## 任务 4：把注册页接入路由

修改：

`apps/web/src/router/index.ts`

新增路由：

```ts
{
  path: "/register",
  component: RegisterPage
}
```

`/register` 不需要登录。

---

## 任务 5：登录页增加注册链接

修改：

`apps/web/src/pages/LoginPage/index.vue`

在登录表单附近增加一个入口：

```text
还没有账号？去注册
```

点击后跳转到 `/register`。

---

## 任务 6：写 RegisterPage 测试

创建：

`apps/web/src/pages/RegisterPage/__tests__/RegisterPage.test.ts`

至少覆盖：

1. 页面能渲染邮箱、密码、昵称输入框
2. 提交表单时会调用 `registerUser`
3. 注册成功后会调用 `loginUser`
4. 登录成功后会保存 token

如果测试 router 跳转不方便，可以先只断言：

- `setAuthToken` 被调用
- `setRefreshToken` 被调用

---

## 验证命令

先跑前端测试：

```bash
npm run test -w @learn/web
```

再跑前端类型检查：

```bash
npm run typecheck -w @learn/web
```

最后跑整体格式检查：

```bash
npm run format:check
```

如果你想一起确认构建：

```bash
npm run build -w @learn/web
```

---

## 完成标准

- [x] `auth.ts` 新增 `registerUser`
- [x] 新增 `/register` 注册页
- [x] 注册页能注册后自动登录并跳转 `/projects`
- [x] 登录页能跳转到注册页
- [x] 注册失败时显示错误信息
- [x] `npm run test -w @learn/web` 通过
- [x] `npm run typecheck -w @learn/web` 通过
- [x] `npm run format:check` 通过

## 完成记录

- 完成时间：2026-06-23
- 补充测试：
  - `apps/web/src/api/__tests__/auth.test.ts`
  - `apps/web/src/pages/RegisterPage/__tests__/RegisterPage.test.ts`
- 验证命令：
  - `npm run test -w @learn/web`
  - `npm run typecheck -w @learn/web`
  - `npm run format:check`
  - `npm run build -w @learn/web`

完成后告诉我：

`前端注册页完成了`
