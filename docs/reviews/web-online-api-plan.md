# 前端线上接入 API 规划

## 1. 当前前端 API 地址是怎么配置的

当前前端 API 请求基本都写成 `/api/...`。

例如：

- `fetchHealth()` 请求 `/api/health`
- `loginUser()` 请求 `/api/auth/login`
- `refreshAuthToken()` 请求 `/api/auth/refresh`
- `fetchProjects()` 请求 `/api/projects`
- `fetchTodos()` 请求 `/api/projects/:projectId/todos`

本地开发时，这样写是成立的，因为 `apps/web/vite.config.ts` 配置了 Vite proxy：

`/api` -> `http://localhost:3001`

并且 rewrite 会去掉 `/api` 前缀：

`/api/health` -> 后端实际收到 `/health`

所以本地浏览器看到的是同源请求，实际由 Vite dev server 转发到 Express API。

这个设计很适合本地开发。

但问题是：

线上前端如果部署到 Vercel / Netlify / Railway Web service，浏览器请求 `/api/health` 时，会请求前端自己的域名：

`https://frontend-domain.com/api/health`

它不会自动转发到 Railway API：

`https://node-learning-monorepo-production.up.railway.app/health`

所以线上前端需要一个可配置的 API base URL。

## 2. 为什么需要 `VITE_API_BASE_URL`

Vite 前端项目里，浏览器端能读取的环境变量必须以 `VITE_` 开头。

所以适合定义：

`VITE_API_BASE_URL`

本地开发可以是空字符串或 `/api`：

`VITE_API_BASE_URL=/api`

线上部署可以是 Railway API 地址：

`VITE_API_BASE_URL=https://node-learning-monorepo-production.up.railway.app`

这样前端代码就不要到处写死 `/api`，而是统一通过一个 helper 拼接 API URL。

例如：

- 本地：`/api/auth/login`
- 线上：`https://node-learning-monorepo-production.up.railway.app/auth/login`

我现在理解，API base URL 的价值是：

同一套前端代码，在不同环境里连接不同后端。

## 3. 本地开发应该怎么连 API

本地开发建议继续保留 Vite proxy。

本地 `.env.local` 可以配置：

`VITE_API_BASE_URL=/api`

然后前端请求：

`buildApiUrl('/auth/login')`

实际得到：

`/api/auth/login`

浏览器请求 Vite dev server，Vite 再代理到：

`http://localhost:3001/auth/login`

这样本地不需要处理 CORS。

本地开发流程保持：

1. 启动 API：`npm run dev:api`
2. 启动 Web：`npm run dev:web`
3. 前端请求 `/api/...`
4. Vite proxy 转发到后端

## 4. 线上前端应该怎么连 Railway API

线上前端部署时，应该在前端部署平台配置：

`VITE_API_BASE_URL=https://node-learning-monorepo-production.up.railway.app`

然后前端构建时，Vite 会把这个变量注入到客户端代码里。

线上请求会变成：

`https://node-learning-monorepo-production.up.railway.app/auth/login`

而不是：

`https://frontend-domain.com/api/auth/login`

这一步很关键。

否则前端上线后会出现：

- 本地能登录
- 线上登录 404
- 或者请求打到前端域名而不是 API 域名

第一版前端线上接入 API，建议先做这件事：

新增统一 API URL helper，例如：

`apps/web/src/api/api-url.ts`

里面负责读取：

`import.meta.env.VITE_API_BASE_URL`

然后所有 API client 都用它来拼 URL。

## 5. CORS 需要注意什么

本地开发靠 Vite proxy，不需要 CORS。

但线上前端和 Railway API 大概率是两个不同域名：

- 前端：`https://your-web.vercel.app`
- API：`https://node-learning-monorepo-production.up.railway.app`

浏览器会把这类请求视为跨域请求。

这时后端必须允许前端域名访问 API，也就是配置 CORS。

当前 API 项目里还没有看到 `cors` middleware。

所以如果前端单独部署，下一步后端很可能要加：

- `cors` 依赖
- `CORS_ORIGIN` 环境变量
- 在 `app.ts` 里注册 CORS middleware

第一版可以先允许一个明确的前端域名，而不是直接 `*`。

例如：

`CORS_ORIGIN=https://your-web.vercel.app`

为什么不建议生产环境直接 `*`：

- 以后如果涉及 cookie / credentials，会更麻烦
- 明确 origin 更安全
- 更接近真实项目配置方式

当前项目使用 Authorization Bearer token，不是 cookie 登录，所以 CORS 第一版会相对简单。

但仍然需要后端返回正确的：

`Access-Control-Allow-Origin`

否则浏览器会拦截请求。

## 6. 第一版前端部署选择

第一版前端部署可以选择：

- Vercel
- Netlify
- Railway static / web service

我建议第一版优先 Vercel 或 Netlify。

原因：

- Vite 前端部署体验成熟
- GitHub 连接简单
- 环境变量配置清晰
- 每次 push 可以自动部署

第一版路线建议：

1. 先改前端 API client，支持 `VITE_API_BASE_URL`。
2. 本地 `.env.local` 设置 `VITE_API_BASE_URL=/api`。
3. 线上前端平台设置 `VITE_API_BASE_URL=https://node-learning-monorepo-production.up.railway.app`。
4. 后端 Railway 配置 CORS，允许前端域名。
5. 部署前端。
6. 在线上页面测试登录、Project、Todo。

## 7. 我现在对前端线上接入 API 的理解

我现在理解，前端接线上 API 不是简单地把 URL 从 localhost 改成 Railway。

更正确的做法是：

- 本地和线上用同一套代码
- API 地址通过环境变量切换
- 本地继续使用 Vite proxy
- 线上使用真实 API base URL
- 后端通过 CORS 明确允许前端域名

下一步应该先实现一个 `api-url` helper，把所有 API 请求从硬编码 `/api/...` 改成可配置。

然后再处理 CORS。

这样前端上线时才不会出现“本地好好的，线上全 404 / CORS 报错”的情况。
