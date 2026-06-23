# Task: 前端 API Base URL 和后端 CORS

## 背景

前端当前所有请求都写成 `/api/...`，本地依赖 Vite proxy 转发到 API。

线上前端如果单独部署，需要：

- 前端支持 `VITE_API_BASE_URL`
- 后端支持 CORS

---

## 这张任务练什么

1. 前端用环境变量配置 API base URL
2. 保留本地 Vite proxy 开发体验
3. 后端用 `CORS_ORIGIN` 控制允许的前端域名
4. 给关键 helper 补测试

---

## 涉及文件

- `apps/web/src/api/*.ts`
- `apps/web/src/api/authenticated-fetch.ts`
- `apps/web/vite.config.ts`
- `apps/api/src/app.ts`
- `apps/api/src/config/env.ts`
- `apps/api/package.json`

---

## 建议实现

前端新增：

`apps/web/src/api/api-url.ts`

负责：

- 读取 `import.meta.env.VITE_API_BASE_URL`
- 本地默认使用 `/api`
- 拼接 `/auth/login`、`/projects` 这类路径

后端新增：

- `cors` 依赖
- `CORS_ORIGIN` 环境变量
- `app.use(cors(...))`

---

## 完成标准

- [ ] 前端 API client 不再到处硬编码 `/api/...`
- [ ] 本地开发仍然能通过 Vite proxy 请求 API
- [ ] 线上可以通过 `VITE_API_BASE_URL` 指向 Railway API
- [ ] 后端支持 `CORS_ORIGIN`
- [ ] 测试通过
- [ ] `npm run typecheck` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

`前端 API Base URL 和 CORS 完成了`
