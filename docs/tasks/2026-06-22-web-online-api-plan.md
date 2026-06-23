# Task: 前端线上接入 Railway API 规划

## 背景

Railway API 已经部署成功，并完成 smoke 验证。

后端现在已经有公网地址：

`https://node-learning-monorepo-production.up.railway.app`

下一步可以考虑让前端 `apps/web` 不再只面向本地 API，而是支持配置线上 API base URL。

这张任务先做规划，不急着部署前端。

---

## 这张任务练什么

1. 找出前端 API client 当前如何写死地址
2. 设计 `VITE_API_BASE_URL`
3. 区分本地开发和线上环境
4. 规划前端部署到 Vercel / Netlify / Railway

---

## 涉及文件

- `apps/web/src/api/*.ts`
- `apps/web/src/api/authenticated-fetch.ts`
- `apps/web/vite.config.ts`
- `apps/web/package.json`

---

## 任务 1：创建规划文档

创建：

`docs/reviews/web-online-api-plan.md`

写下面这些小标题：

# 前端线上接入 API 规划

## 1. 当前前端 API 地址是怎么配置的

## 2. 为什么需要 `VITE_API_BASE_URL`

## 3. 本地开发应该怎么连 API

## 4. 线上前端应该怎么连 Railway API

## 5. CORS 需要注意什么

## 6. 第一版前端部署选择

---

## 完成标准

- [ ] 创建 `docs/reviews/web-online-api-plan.md`
- [ ] 写清楚本地 / 线上 API base URL 区别
- [ ] 写清楚是否需要改前端代码
- [ ] 写清楚 CORS 风险
- [ ] `npm run format:check` 通过

完成后告诉我：

`前端线上接入 API 规划完成了`
