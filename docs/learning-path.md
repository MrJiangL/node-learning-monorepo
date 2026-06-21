# Node.js 系统学习路线

这份路线是按“先能做出来，再做得规范，最后理解框架差异”的顺序设计的。你之前学过基础，只是很久没写，所以重点不是重新背语法，而是通过项目把手感找回来。

## 第 1 周：恢复 TypeScript 和 Express 手感

目标：能看懂并修改一个最小但完整的 API 项目。

你需要重点理解：

- `package.json` 里的 scripts 是怎么启动项目的。
- `npm workspaces` 为什么能管理多个子项目。
- `apps/api/src/app.ts` 为什么不直接监听端口，而是导出 `createApp()`。
- `apps/api/src/server.ts` 为什么只负责启动服务。
- Express 的 `app.use()` 是按顺序执行的。
- `express.json()` 为什么必须放在路由前面。
- 为什么 404 和错误处理中间件要放在所有路由后面。

练习：

```bash
npm run dev
curl http://localhost:3001/health
npm run test
```

完成标准：

- 你能说清楚 `/health` 请求从浏览器或 curl 进来后，代码执行顺序是什么。
- 你能独立新增一个 `GET /hello` 接口，并写一个测试。

## 第 2 周：参数校验和分层结构

目标：理解 route、schema、service、repository 各自负责什么。

当前 `plans` 模块已经拆成几层：

- `plans.routes.ts`：负责 HTTP 路由，读取请求，返回响应。
- `plans.schema.ts`：负责校验用户传入的数据。
- `plans.service.ts`：负责业务逻辑。
- `plans.repository.ts`：负责数据读写。

为什么要拆层：

- 路由层不要塞太多业务逻辑，否则代码很快会乱。
- service 层以后可以被 HTTP、命令行任务、定时任务复用。
- repository 层以后可以从内存数组换成 Prisma，而不用大改业务逻辑。

练习：

1. 给学习计划增加 `PATCH /plans/:id/complete`。
2. 先写测试，期望计划状态从 `active` 变成 `completed`。
3. 再改 repository 和 service。

完成标准：

- 你能解释为什么 Zod 校验放在路由层。
- 你能解释为什么 `plans = [...plans, plan]` 比 `plans.push(plan)` 更适合这个学习项目。

## 第 3 周：Prisma + SQLite

目标：把内存数据换成真实数据库。

要学的内容：

- `prisma/schema.prisma` 如何定义表结构。
- migration 是什么。
- SQLite 为什么适合学习阶段。
- Prisma Client 如何替代手写 SQL。
- 测试环境如何避免污染开发数据库。

练习：

```bash
npm install @prisma/client -w @learn/api
npm install prisma -D -w @learn/api
npx prisma init --datasource-provider sqlite
npx prisma migrate dev --name init
```

完成标准：

- 重启服务后，之前创建的学习计划仍然存在。
- 测试依然通过。

## 第 4 周：登录鉴权

目标：理解真实后端绕不开的安全基础。

要学的内容：

- 密码不能明文保存，要用 bcrypt 哈希。
- 登录成功后返回 JWT。
- 受保护接口需要检查 `Authorization: Bearer <token>`。
- 错误信息不能泄露太多，例如不要告诉攻击者“邮箱存在但密码错”。

练习：

- `POST /auth/register`
- `POST /auth/login`
- `GET /me`
- 让 `/plans` 变成登录后才能访问。

完成标准：

- 未登录访问 `/plans` 返回 401。
- 登录后带 token 可以创建学习计划。

## 第 5 周：接入前端

目标：从“只会写 API”走到“能做一个完整小产品”。

推荐先用 Vite + React，不急着上 Next.js：

- React 负责页面和交互。
- API 仍然由 Express 提供。
- `packages/shared` 里的类型可以被前后端一起使用。

完成标准：

- 页面能展示学习计划列表。
- 页面能创建新的学习计划。
- 表单错误能展示给用户。

## 第 6 周：对比 Fastify 和 NestJS

目标：理解框架不是魔法，核心后端概念是共通的。

学习顺序：

1. 先把当前 Express 项目做扎实。
2. 用 Fastify 重写同样的 `/health` 和 `/plans`。
3. 用 NestJS 重写同样的能力，对比它的 Module、Controller、Service。

对照表：

| 你在 Express 里看到的概念 | NestJS 里的对应概念              |
| ------------------------- | -------------------------------- |
| Router                    | Controller                       |
| Middleware                | Middleware / Guard / Interceptor |
| Service factory           | Injectable Service               |
| Zod 手动校验              | Pipe + DTO                       |
| `app.ts` 手动组装         | Module graph                     |

## 每次学习的固定流程

建议你每次都按这个节奏来：

1. 先读测试，看项目希望实现什么行为。
2. 再读 route，看 HTTP 请求怎么进入系统。
3. 再读 schema，看输入怎么被校验。
4. 再读 service，看业务逻辑在哪里。
5. 再读 repository，看数据怎么保存。
6. 自己改一个小功能。
7. 运行 `npm run test` 和 `npm run typecheck`。

这个流程比“看视频看懂了”更可靠。你会真正知道代码为什么这么写。
