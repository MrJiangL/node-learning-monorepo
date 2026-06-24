# Task: 前端首次部署

## 背景

前端已经支持 `VITE_API_BASE_URL`，后端也支持 `CORS_ORIGIN`。

下一步可以把 `apps/web` 部署到托管平台，并连接 Railway API。

---

## 推荐平台

第一版推荐 Vercel 或 Netlify。

原因：

- Vite 前端部署体验成熟
- 可以从 GitHub 自动部署
- 环境变量配置简单
- 适合先验证前端线上登录 / Project / Todo 主链路

---

## 需要配置

前端环境变量：

`VITE_API_BASE_URL=https://node-learning-monorepo-production.up.railway.app`

后端 Railway 环境变量：

`CORS_ORIGIN=<前端线上域名>`

---

## 完成标准

- [x] 前端平台连接 GitHub 仓库
- [x] 前端 build 成功
- [x] 配置 `VITE_API_BASE_URL`
- [x] Railway API 配置 `CORS_ORIGIN`
- [x] 线上前端能登录
- [x] 线上前端能创建 / 查询 Project
- [x] 线上前端能创建 / 查询 Todo

## 完成记录

- 前端地址：`https://scintillating-pavlova-dc76e0.netlify.app/projects`
- 完成时间：2026-06-23
- 验证方式：使用测试账号在线上前端完成登录，并验证 Project / Todo 主链路。

完成后告诉我：

`前端首次部署完成了`
