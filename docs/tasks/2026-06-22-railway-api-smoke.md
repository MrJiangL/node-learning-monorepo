# Task: Railway 线上 API Smoke 验证

## 背景

Railway API 第一次部署已经成功，`/health` 返回 200。

但 `/health` 只说明 API 进程活着，还不能证明数据库、Prisma migration、鉴权和业务接口都正常。

下一步做线上 API smoke 验证。

---

## 这张任务只练什么

只验证线上 API 的最小主链路：

1. `/health`
2. `/openapi.json`
3. `/docs`
4. 注册
5. 登录
6. 创建 Project
7. 创建 Todo

---

## 任务 1：确认文档接口

访问：

`https://node-learning-monorepo-production.up.railway.app/openapi.json`

再访问：

`https://node-learning-monorepo-production.up.railway.app/docs`

确认 OpenAPI JSON 和 Swagger UI 能在线访问。

---

## 任务 2：验证鉴权链路

用线上 API 测试注册和登录。

注意：不要使用真实常用密码。使用测试账号和测试密码。

验证目标：

- `POST /auth/register` 能成功
- `POST /auth/login` 能返回 token

---

## 任务 3：验证 Project / Todo 主链路

使用登录返回的 token，验证：

- 创建 Project
- 查询 Project 列表
- 创建 Todo
- 查询 Todo 列表

---

## 任务 4：创建 smoke 记录文档

创建：

`docs/reviews/railway-api-smoke.md`

写下面这些小标题：

# Railway 线上 API Smoke 验证

## 1. `/health` 验证结果

## 2. `/openapi.json` 验证结果

## 3. `/docs` 验证结果

## 4. 注册 / 登录验证结果

## 5. Project / Todo 验证结果

## 6. 如果失败，失败在哪一层

## 7. 我这次学到了什么

---

## 完成标准

- [ ] `/health` 返回 200
- [ ] `/openapi.json` 可访问
- [ ] `/docs` 可访问
- [ ] 注册成功
- [ ] 登录成功并拿到 token
- [ ] Project 创建 / 查询成功
- [ ] Todo 创建 / 查询成功
- [ ] 创建 `docs/reviews/railway-api-smoke.md`

完成后告诉我：

`Railway 线上 API smoke 验证完成了`
