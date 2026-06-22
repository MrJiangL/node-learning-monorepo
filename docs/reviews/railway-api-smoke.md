# Railway 线上 API Smoke 验证

## 1. `/health` 验证结果

线上地址：

https://node-learning-monorepo-production.up.railway.app/health

验证结果：

- HTTP Status：`200`
- 结果：通过
- 响应说明：API 进程已经在线运行，并返回 `node-learning-api` 服务状态。

## 2. `/openapi.json` 验证结果

线上地址：

https://node-learning-monorepo-production.up.railway.app/openapi.json

验证结果：

- HTTP Status：`200`
- 结果：通过
- 响应说明：OpenAPI JSON 可以在线访问，说明 API 契约文件也随服务部署成功。

## 3. `/docs` 验证结果

线上地址：

https://node-learning-monorepo-production.up.railway.app/docs/

验证结果：

- HTTP Status：`200`
- 结果：通过
- 响应说明：Swagger UI 可以在线访问。

## 4. 注册 / 登录验证结果

使用一次性 smoke 测试账号：

`railway-smoke-1782129683059@example.com`

验证结果：

| 接口                  | 状态码 | 结果 |
| --------------------- | ------ | ---- |
| `POST /auth/register` | `201`  | 通过 |
| `POST /auth/login`    | `200`  | 通过 |
| `GET /auth/me`        | `200`  | 通过 |

登录接口成功返回 token，后续受保护接口可以通过 `Authorization: Bearer <token>` 访问。

文档中不记录真实 token。

## 5. Project / Todo 验证结果

使用登录 token 验证 Project / Todo 主链路。

创建的测试 Project ID：

`bced651f-96cb-40f1-9af1-0d9b2bd8e1e8`

创建的测试 Todo ID：

`201166b9-34ea-44f0-ac88-a8a951ad668e`

验证结果：

| 接口                              | 状态码 | 结果 |
| --------------------------------- | ------ | ---- |
| `POST /projects`                  | `201`  | 通过 |
| `GET /projects`                   | `200`  | 通过 |
| `POST /projects/:projectId/todos` | `201`  | 通过 |
| `GET /projects/:projectId/todos`  | `200`  | 通过 |

这说明线上环境里的 API、鉴权、Prisma、MySQL、migration 和业务接口已经串起来。

## 6. 如果失败，失败在哪一层

本次 smoke 没有失败。

如果后续失败，可以按层排查：

1. `/health` 失败：API 进程或 Railway service 启动失败。
2. `/openapi.json` / `/docs` 失败：文档文件路径或构建产物问题。
3. 注册失败：数据库连接、User 表、migration 或 validation 问题。
4. 登录失败：密码哈希、JWT_SECRET、session 写入或数据库问题。
5. Project / Todo 失败：鉴权 token、业务表、Prisma relation 或权限边界问题。

这次所有主链路通过，说明第一版 Railway API 部署已经达到可用状态。

## 7. 我这次学到了什么

这次 smoke 验证让我确认：

- `/health` 只能证明 API 活着，不能证明数据库可用。
- 注册 / 登录能通过，才说明数据库和鉴权链路真的能工作。
- Project / Todo 能通过，才说明核心业务链路能在线上运行。
- 部署完成后一定要做 smoke 验证，而不是只看平台显示 deploy succeeded。
- 文档接口也应该验证，因为 OpenAPI / Swagger 是后续调试和联调的重要入口。

当前项目已经完成第一版线上 API 部署和 smoke 验证。

下一步可以进入部署日志复盘、生产日志、监控和健康检查强化。
