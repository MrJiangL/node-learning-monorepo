# Task: Railway API 首次部署

## 背景

你已经完成 Railway API 部署准备，下一步可以真正进入 Railway 页面部署 API。

这张任务的目标不是一次性完美生产化，而是跑通第一条线上 API 链路：

GitHub 仓库 -> Railway build -> Prisma migration -> API start -> `/health` 可访问。

---

## 这张任务只练什么

只练第一次部署 API：

1. 在 Railway 创建 project
2. 连接 GitHub 仓库
3. 创建 MySQL service
4. 配置 API service
5. 配置环境变量
6. 看 deploy 日志
7. 验证 `/health`

---

## 任务 1：创建 Railway Project

进入 Railway，创建新 project。

选择：

`Deploy from GitHub repo`

仓库选择：

`MrJiangL/node-learning-monorepo`

---

## 任务 2：创建 MySQL Service

在同一个 Railway project 里添加 MySQL service。

创建后查看它提供的变量，例如：

- `MYSQL_URL`
- `MYSQLHOST`
- `MYSQLPORT`
- `MYSQLUSER`
- `MYSQLPASSWORD`
- `MYSQLDATABASE`

---

## 任务 3：配置 API Service

API service 的 build command：

`npm run prisma:generate -w @learn/api && npm run build -w @learn/shared && npm run build -w @learn/api`

API service 的 start command：

`npx prisma migrate deploy --config prisma.config.ts && npm run start -w @learn/api`

---

## 任务 4：配置 API 环境变量

至少配置：

- `NODE_ENV=production`
- `JWT_SECRET=<生成一串随机字符串>`
- `DATABASE_URL=<MySQL service 的 MYSQL_URL>`
- `DATABASE_HOST=<MySQL service 的 MYSQLHOST>`
- `DATABASE_PORT=<MySQL service 的 MYSQLPORT>`
- `DATABASE_USER=<MySQL service 的 MYSQLUSER>`
- `DATABASE_PASSWORD=<MySQL service 的 MYSQLPASSWORD>`
- `DATABASE_NAME=<MySQL service 的 MYSQLDATABASE>`
- `JOB_WORKER_ENABLED=false`
- `JOB_WORKER_INTERVAL_MS=1000`

不要把真实值写进文档或 GitHub。

---

## 任务 5：部署后验证

部署成功后，先访问：

`https://<你的-railway-domain>/health`

如果 `/health` 能访问，再继续看：

- deploy logs
- API docs / Swagger 页面
- 是否有数据库连接错误
- 是否有 Prisma migration 错误

---

## 任务 6：创建部署记录文档

创建：

`docs/reviews/railway-api-first-deploy.md`

写下面这些小标题：

# Railway API 首次部署记录

## 1. Railway Project 创建情况

## 2. MySQL Service 创建情况

## 3. API Service build command

## 4. API Service start command

## 5. 环境变量配置情况

## 6. 第一次部署是否成功

## 7. 如果失败，失败在哪一步

## 8. `/health` 验证结果

## 9. 我这次学到了什么

---

## 完成标准

- [ ] Railway project 创建完成
- [ ] API service 连接 GitHub 仓库
- [ ] MySQL service 创建完成
- [ ] API build command 配置完成
- [ ] API start command 配置完成
- [ ] 环境变量配置完成
- [ ] 部署日志已查看
- [ ] `/health` 已验证
- [ ] 创建 `docs/reviews/railway-api-first-deploy.md`

完成后告诉我：

`Railway API 首次部署完成了`
