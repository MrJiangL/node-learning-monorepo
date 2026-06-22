# Task: 部署方式选择：托管平台还是自管服务器

## 背景

你已经完成部署前环境变量盘点。

下一步不要马上买服务器，也不要直接乱选平台。先理解几种部署方式的差别：

- 托管平台：Render、Railway、Fly.io、Vercel 等
- 自管服务器：云服务器 / VPS + Linux + Nginx + PM2 或 Docker
- 混合部署：前端放 Vercel，后端放 Render / Railway，数据库和 Redis 用托管服务

这张任务只做选择和理解，不写代码。

---

## 这张任务只练什么

只练三件事：

1. 判断当前项目适合哪种部署方式
2. 理解托管平台和自管服务器的取舍
3. 选出第一版部署路线

---

## 任务 1：创建部署方式选择文档

创建：

`docs/reviews/deployment-platform-choice.md`

写下面这些小标题：

# 部署方式选择

## 1. 我当前项目要部署哪些东西

## 2. 方案 A：托管平台

## 3. 方案 B：自管云服务器

## 4. 方案 C：混合部署

## 5. 我现在是否需要先准备服务器

## 6. 我的第一版部署选择

---

## 任务 2：建议先思考的问题

回答这些问题：

1. API 服务要部署在哪里？
2. Web 前端要不要单独部署？
3. MySQL 用本地、云数据库，还是平台托管数据库？
4. Redis 第一版是否必须上线？
5. Worker 第一版是否打开？
6. 当前学习目标是学 Node 部署，还是学 Linux 运维？

---

## 推荐选择

我建议第一版选择托管平台，而不是马上买服务器。

原因：

- 你当前重点是 Node 后端生产化，不是 Linux 运维。
- 托管平台更容易专注在环境变量、构建命令、启动命令、数据库连接和 CI/CD。
- 自管服务器会额外引入 Nginx、SSL、PM2、Docker、防火墙、系统更新等很多变量。

第一版可以先选：

- API：Render 或 Railway
- Database：平台托管 MySQL / 外部云 MySQL
- Redis：第一版可以暂时关闭或用托管 Redis
- Worker：第一版先 `JOB_WORKER_ENABLED=false`
- Web：后面单独考虑 Vercel / Netlify / 同平台部署

---

## 验证命令

这张任务只改文档，所以运行：

`npm run format:check`

---

## 完成标准

- [ ] 创建 `docs/reviews/deployment-platform-choice.md`
- [ ] 写清楚托管平台和自管服务器的区别
- [ ] 写清楚当前是否需要先准备服务器
- [ ] 写下第一版部署选择
- [ ] `npm run format:check` 通过

完成后告诉我：

`部署方式选择完成了`
