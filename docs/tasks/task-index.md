# Task Index

这个索引用来把每日任务卡和总学习计划连接起来。

## Source Plan

总计划：

```text
docs/superpowers/plans/2026-05-14-node-learning-monorepo.md
```

当前阶段来自总计划：

```text
Task 5: Prisma Persistence With MySQL
```

前一个阶段已经把 Express API、Zod、测试和分层结构练了一轮。
原计划先用 SQLite 降低学习成本；现在你本地已经有 MySQL，所以当前阶段调整为：
先把 Prisma 从 SQLite 切到本地 MySQL，再继续 repository 测试和后续登录鉴权。

## Completed

- Zod 基础练习：`docs/zod-lab.md`
- difficulty 字段练习：`docs/difficulty-feature-lab.md`
- `GET /plans/:id`
- `PATCH /plans/:id`：`docs/tasks/2026-05-15-patch-plan.md`
- `DELETE /plans/:id`：`docs/tasks/2026-05-16-delete-plan.md`
- `GET /plans?difficulty=easy`：`docs/tasks/2026-05-16-filter-plans-by-difficulty.md`
- `GET /plans?page=1&pageSize=10`：`docs/tasks/2026-05-19-paginate-plans.md`
- Prisma 初始化和 SQLite 持久化：`docs/tasks/2026-05-20-prisma-sqlite-persistence.md`
- 用 Prisma repository 替换内存 repository：`docs/tasks/2026-05-20-replace-memory-repository-with-prisma.md`
- 从 SQLite 切换到本地 MySQL：`docs/tasks/2026-05-21-switch-prisma-from-sqlite-to-mysql.md`
- Prisma repository 单元测试：`docs/tasks/2026-05-20-prisma-repository-unit-tests.md`
- 给 Plan 增加 User 数据关系：`docs/tasks/2026-05-21-add-user-plan-relation.md`
- 支持按 userId 查询计划：`docs/tasks/2026-05-21-filter-plans-by-user-id.md`
- 用户注册和密码哈希：`docs/tasks/2026-05-21-user-register-password-hash.md`
- 用户登录和 JWT 签发：`docs/tasks/2026-05-23-user-login-jwt.md`
- 当前用户鉴权中间件：`docs/tasks/2026-05-25-current-user-auth-middleware.md`
- 计划 API 权限边界：`docs/tasks/2026-05-25-protect-plans-with-current-user.md`
- 手写 plans 权限边界测试：`docs/tasks/2026-05-26-write-plans-auth-boundary-tests.md`
- 整理鉴权 API 示例文档：`docs/tasks/2026-05-26-update-auth-api-examples.md`
- API smoke CLI 脚本：`docs/tasks/2026-05-26-api-smoke-cli-script.md`
- 请求日志 middleware：`docs/tasks/2026-05-27-request-logging-middleware.md`
- 环境配置校验：`docs/tasks/2026-05-27-validate-env-config.md`
- 错误响应文档：`docs/tasks/2026-05-27-error-response-catalog.md`
- 请求日志噪音控制：`docs/tasks/2026-05-27-logger-test-noise-control.md`
- Project / Todo 数据模型设计：`docs/tasks/2026-05-27-design-project-todo-model.md`
- Project repository 和单元测试：`docs/tasks/2026-05-28-project-repository-unit-tests.md`
- Project API：创建和列表：`docs/tasks/2026-05-28-project-create-list-api.md`
- Todo repository 和单元测试：`docs/tasks/2026-05-28-todo-repository-unit-tests.md`
- Todo API：创建、列表、完成状态切换：`docs/tasks/2026-05-28-todo-create-list-toggle-api.md`
- Project / Todo API smoke 脚本扩展：`docs/tasks/2026-05-28-extend-api-smoke-project-todo.md`
- 学习阶段复盘：Prisma 关系、Repository、权限边界：`docs/tasks/2026-05-28-prisma-repository-auth-retrospective.md`
- 下一阶段规划：后端深化还是前端接入：`docs/tasks/2026-05-28-next-stage-planning.md`
- Project / Todo service 单元测试：`docs/tasks/2026-05-28-project-todo-service-unit-tests.md`
- Todo 列表分页：`docs/tasks/2026-05-28-paginate-todos.md`
- Prisma transaction 入门：创建 Project 时同时创建初始 Todo：`docs/tasks/2026-05-29-prisma-transaction-create-project-with-todos.md`
- 基础 rate limit 和安全加固：`docs/tasks/2026-05-29-basic-rate-limit-auth.md`
- API 分页参数抽取成复用 helper：`docs/tasks/2026-05-29-shared-pagination-query-schema.md`
- 统一 Zod validation error helper：`docs/tasks/2026-05-29-zod-validation-error-helper.md`
- 给列表接口补排序参数：`docs/tasks/2026-05-29-list-sort-query.md`
- Project 列表分页：`docs/tasks/2026-05-29-paginate-projects.md`
- Todo 按 completed 过滤：`docs/tasks/2026-05-29-filter-todos-by-completed.md`
- Project 详情接口：`docs/tasks/2026-05-29-get-project-by-id.md`
- Todo 按 dueDate 过滤：`docs/tasks/2026-05-29-filter-todos-by-due-date.md`
- Todo 按 title 关键字搜索：`docs/tasks/2026-05-29-search-todos-by-title.md`
- Project 删除接口和级联 Todo 行为：`docs/tasks/2026-05-29-delete-project-cascade-todos.md`
- Todo 更新 title / dueDate：`docs/tasks/2026-05-29-update-todo-title-due-date.md`
- Project 更新 name / description：`docs/tasks/2026-05-29-update-project-name-description.md`
- Todo 删除接口：`docs/tasks/2026-05-29-delete-todo.md`
- 错误处理和测试覆盖复盘：`docs/tasks/2026-05-29-error-handling-and-test-coverage-review.md`
- 后端阶段复盘：Express API 完整 CRUD：`docs/tasks/2026-05-30-backend-crud-retrospective.md`
- Zod 输入边界专项：optional / nullable / transform / coerce：`docs/tasks/2026-05-30-zod-input-boundary-practice.md`
- Prisma 查询关系专项：where / include / relation：`docs/tasks/2026-05-30-prisma-query-relation-practice.md`
- Prisma transaction 回滚专项：多步写入的一致性：`docs/tasks/2026-05-30-prisma-transaction-rollback-practice.md`
- 测试设计专项：red-green 和行为覆盖：`docs/tasks/2026-05-30-test-design-red-green-practice.md`
- Prisma + Zod + 测试设计强化阶段复盘：`docs/tasks/2026-05-30-prisma-zod-test-stage-retrospective.md`
- API 测试 helper 抽取：`docs/tasks/2026-05-30-extract-api-test-helpers.md`
- Projects 测试复用 API helper：`docs/tasks/2026-05-31-use-api-test-helpers-in-projects.md`
- Plans 测试复用 API helper：`docs/tasks/2026-05-31-use-api-test-helpers-in-plans.md`
- API 测试 helper 小阶段复盘：`docs/tasks/2026-05-31-api-test-helper-retrospective.md`
- 前端 Vite Vue 骨架：`docs/tasks/2026-05-31-scaffold-vite-vue-web-app.md`
- 前端登录页：调用 `/auth/login`：`docs/tasks/2026-05-31-vue-login-page.md`
- 前端 Project 列表页：读取 token 调用 `/projects`：`docs/tasks/2026-05-31-vue-project-list-page.md`
- 前端 Todo 列表和创建：调用 `/projects/:projectId/todos`：`docs/tasks/2026-05-31-vue-todo-list-create.md`
- 前端 Todo 完成状态切换：调用 `PATCH /todos/:id`：`docs/tasks/2026-05-31-vue-toggle-todo-completed.md`
- 前端 Todo 更新和删除：调用 `PATCH /todos/:id` / `DELETE /todos/:id`：`docs/tasks/2026-05-31-vue-update-delete-todo.md`
- 前端创建 Project：调用 `POST /projects`：`docs/tasks/2026-05-31-vue-create-project.md`
- 前端路由拆分：登录页 / Project 工作台：`docs/tasks/2026-05-31-vue-router-split-pages.md`
- 前端错误响应解析和登录态清理：`docs/tasks/2026-05-31-vue-error-auth-state.md`
- 前端阶段复盘：Vue 状态、API client、鉴权链路：`docs/tasks/2026-05-31-vue-frontend-stage-retrospective.md`
- 前端组件拆分：ProjectListPanel 组件：`docs/tasks/2026-06-01-vue-split-project-list-panel.md`
- 前端组件拆分：TodoPanel 组件：`docs/tasks/2026-06-01-vue-split-todo-panel.md`
- 前端组件拆分复盘：props / emit / 状态归属：`docs/tasks/2026-06-01-vue-component-split-retrospective.md`
- 前端 composables 入门：抽取 `useProjects`：`docs/tasks/2026-06-01-vue-use-projects-composable.md`
- 前端 composables 入门：抽取 `useTodos`：`docs/tasks/2026-06-02-vue-use-todos-composable.md`
- 前端组件测试入门：给 ProjectListPanel / TodoPanel 写测试：`docs/tasks/2026-06-02-vue-component-test-intro.md`
- 前端 composables 复盘：页面状态、业务状态、子组件状态：`docs/tasks/2026-06-02-vue-composable-state-retrospective.md`
- 前端组件测试复盘：props / emit / DOM 查询：`docs/tasks/2026-06-02-vue-component-test-retrospective.md`
- 前端 composable 测试入门：测试 useProjects / useTodos：`docs/tasks/2026-06-02-vue-composable-test-intro.md`
- 前端页面测试入门：测试 ProjectsPage 编排逻辑：`docs/tasks/2026-06-02-vue-page-test-intro.md`（跳过：前端基础测试不再作为主线）
- 后端鉴权进阶：Refresh Token 和 Session：`docs/tasks/2026-06-02-auth-refresh-token-session.md`
- 后端鉴权复盘：access token / refresh token / session：`docs/tasks/2026-06-03-auth-token-session-retrospective.md`
- 后端工程化：API 错误码契约和测试 helper：`docs/tasks/2026-06-05-api-error-code-contract.md`
- 错误码契约扩展：全项目 AppError 迁移：`docs/tasks/2026-06-05-error-code-contract-full-migration.md`
- 后端测试工程化：MySQL 集成测试隔离复盘：`docs/tasks/2026-06-05-mysql-test-isolation-retrospective.md`
- 后端鉴权工程化：Refresh Token 轮换：`docs/tasks/2026-06-05-refresh-token-rotation.md`
- 前端鉴权工程化：Access Token 过期后自动 Refresh：`docs/tasks/2026-06-05-web-auth-auto-refresh.md`
- 前后端鉴权复盘：Refresh Token Rotation 和自动 Refresh：`docs/tasks/2026-06-05-auth-refresh-flow-retrospective.md`
- 后端工程化：OpenAPI / API 文档生成入门：`docs/tasks/2026-06-05-openapi-intro.md`
- 后端工程化复盘：OpenAPI 到底解决什么问题：`docs/tasks/2026-06-05-openapi-contract-retrospective.md`
- OpenAPI 进阶：用 Zod schema 辅助生成文档：`docs/tasks/2026-06-05-zod-to-openapi-schema-intro.md`
- 后端测试工程化：测试数据工厂入门：`docs/tasks/2026-06-05-api-test-data-factory.md`
- OpenAPI 工程化：接入 Swagger UI 文档页：`docs/tasks/2026-06-06-openapi-swagger-ui.md`
- 后端测试工程化：复用测试数据工厂清理集成测试：`docs/tasks/2026-06-06-reuse-test-data-factory.md`
- OpenAPI 工程化：补齐 Project / Todo 核心接口文档：`docs/tasks/2026-06-06-openapi-project-todo-docs.md`
- 后端测试工程化复盘：测试数据工厂怎么用才不乱：`docs/tasks/2026-06-06-test-data-factory-retrospective.md`
- OpenAPI 工程化复盘：文档、Schema 和 Swagger UI 怎么协作：`docs/tasks/2026-06-06-openapi-docs-retrospective.md`
- 后端下一阶段规划：缓存、队列、部署还是测试金字塔：`docs/tasks/2026-06-06-next-backend-stage-planning.md`
- 测试金字塔强化：Service 单元测试里的协作者断言：`docs/tasks/2026-06-06-service-unit-test-collaboration.md`
- 测试金字塔强化：Repository integration test 边界：`docs/tasks/2026-06-08-repository-integration-boundary.md`
- OpenAPI 工程化：schema 复用整理：`docs/tasks/2026-06-08-openapi-schema-reuse.md`
- 后端测试金字塔复盘：unit / integration / smoke 怎么分工：`docs/tasks/2026-06-08-test-pyramid-retrospective.md`
- 后端进阶预备：Redis 连接入门：`docs/tasks/2026-06-08-redis-connection-intro.md`
- Redis 缓存入门：Project 列表 cache key 和 TTL：`docs/tasks/2026-06-08-project-cache-key-ttl.md`
- Redis 缓存入门：封装 get / set JSON helper：`docs/tasks/2026-06-08-redis-json-helper.md`
- Redis 缓存入门：Project 列表缓存读取：`docs/tasks/2026-06-08-project-list-cache-read.md`
- Redis 缓存入门：Project 列表缓存失效：`docs/tasks/2026-06-08-project-list-cache-invalidation.md`
- Redis 缓存入门：把 Project 列表缓存接入 API：`docs/tasks/2026-06-08-project-list-cache-api.md`
- Redis 缓存进阶：Project 更新 / 删除后的缓存失效：`docs/tasks/2026-06-08-project-update-delete-cache-invalidation.md`
- Redis 缓存阶段复盘：cache aside / key / TTL / invalidation：`docs/tasks/2026-06-11-redis-cache-retrospective.md`
- OpenAPI 工程化：抽取 TodoResponse：`docs/tasks/2026-06-11-openapi-todo-response-schema.md`
- OpenAPI 工程化：抽取 ProjectListResponse：`docs/tasks/2026-06-11-openapi-list-response-schema.md`
- Redis 缓存进阶：缓存失败时降级到数据库：`docs/tasks/2026-06-12-redis-cache-fallback.md`
- Redis 缓存阶段复盘：故障降级 / cache aside / 可观察性：`docs/tasks/2026-06-12-redis-cache-fallback-retrospective.md`
- 后端工程化：后台任务 / 队列入门：`docs/tasks/2026-06-12-background-job-queue-intro.md`
- 后台任务入门：处理一个 pending job：`docs/tasks/2026-06-13-background-job-worker-intro.md`
- 后台任务阶段复盘：queue / worker / processor：`docs/tasks/2026-06-13-background-job-retrospective.md`
- 后台任务进阶：失败任务重试次数：`docs/tasks/2026-06-13-background-job-retry-count.md`
- 后台任务进阶：接入 API 创建任务：`docs/tasks/2026-06-13-background-job-api.md`
- 后台任务进阶：API 触发 worker 处理任务：`docs/tasks/2026-06-13-background-job-api-process.md`
- 后台任务进阶：processor 按任务 type 分发处理逻辑：`docs/tasks/2026-06-13-background-job-processor-dispatch.md`
- 后台任务进阶：记录任务处理日志：`docs/tasks/2026-06-13-background-job-logs.md`
- 后台任务阶段复盘：queue / worker / processor / logs 怎么协作：`docs/tasks/2026-06-13-background-job-full-retrospective.md`
- 后台任务下一阶段规划：内存队列、数据库队列还是 BullMQ：`docs/tasks/2026-06-13-background-job-next-stage-planning.md`
- MySQL 数据库队列：设计 Job / JobLog 数据模型：`docs/tasks/2026-06-13-database-job-model.md`
- MySQL 数据库队列：实现 PrismaJobRepository 入门：`docs/tasks/2026-06-13-prisma-job-repository.md`
- MySQL 数据库队列：Repository 支持状态更新和失败重试：`docs/tasks/2026-06-13-prisma-job-repository-status.md`
- MySQL 数据库队列：让 worker 依赖 JobRepository 接口：`docs/tasks/2026-06-13-worker-use-job-repository.md`
- MySQL 数据库队列：给 JobRepository 补 list 能力：`docs/tasks/2026-06-13-job-repository-list.md`
- MySQL 数据库队列：API 默认使用 PrismaJobRepository：`docs/tasks/2026-06-14-jobs-api-use-prisma-repository.md`
- MySQL 数据库队列：worker 轮询处理数据库任务：`docs/tasks/2026-06-14-job-worker-polling.md`
- MySQL 数据库队列：把 worker loop 接入 server 启动流程：`docs/tasks/2026-06-14-job-worker-server-startup.md`
- MySQL 数据库队列：worker 运行与关闭复盘：`docs/tasks/2026-06-14-job-worker-runtime-retrospective.md`
- MySQL 数据库队列：worker 错误处理和运行保护：`docs/tasks/2026-06-14-job-worker-loop-error-guard.md`
- MySQL 数据库队列：worker 防重入处理：`docs/tasks/2026-06-14-job-worker-loop-no-overlap.md`
- MySQL 数据库队列：worker loop 阶段复盘：`docs/tasks/2026-06-14-job-worker-loop-stage-retrospective.md`
- 后台任务阶段收束：下一阶段选择：`docs/tasks/2026-06-14-next-stage-after-background-jobs.md`
- Activity Log 综合业务模块：数据模型设计：`docs/tasks/2026-06-14-activity-log-data-model.md`
- Activity Log 综合业务模块：Repository：`docs/tasks/2026-06-14-activity-log-repository.md`
- Activity Log 综合业务模块：Service：`docs/tasks/2026-06-14-activity-log-service.md`
- Activity Log 综合业务模块：接入 Project 写操作：`docs/tasks/2026-06-14-activity-log-project-write-integration.md`
- Activity Log 综合业务模块：接入 Todo 写操作：`docs/tasks/2026-06-14-activity-log-todo-write-integration.md`
- Activity Log 综合业务模块：查询 API：`docs/tasks/2026-06-17-activity-log-query-api.md`
- Activity Log 综合业务模块：OpenAPI 文档：`docs/tasks/2026-06-17-activity-log-openapi-docs.md`
- Activity Log 综合业务模块：阶段复盘：`docs/tasks/2026-06-17-activity-log-retrospective.md`
- Activity Log 审计日志设计优化：Project 删除日志快照：`docs/tasks/2026-06-17-activity-log-project-delete-snapshot.md`
- Activity Log action / metadata schema 强化：`docs/tasks/2026-06-17-activity-log-action-metadata-schema.md`
- Activity Log 接入 Project 删除日志：`docs/tasks/2026-06-18-activity-log-project-deleted.md`
- Activity Log 查询支持 action 过滤：`docs/tasks/2026-06-18-activity-log-action-filter.md`
- Activity Log 查询支持时间范围过滤：`docs/tasks/2026-06-18-activity-log-date-range-filter.md`
- Activity Log 综合模块阶段复盘：`docs/tasks/2026-06-18-activity-log-final-retrospective.md`
- 测试强化 1：Service 单元测试读写练习：`docs/tasks/2026-06-18-testing-service-unit-test-practice.md`
- 测试强化 2：Repository 测试读写练习：`docs/tasks/2026-06-18-testing-repository-test-practice.md`
- 测试强化 3：API 集成测试读写练习：`docs/tasks/2026-06-19-testing-api-integration-practice.md`
- 测试强化阶段复盘：`docs/tasks/2026-06-19-testing-stage-retrospective.md`
- 数据库索引入门：从 Activity Log 查询反推复合索引：`docs/tasks/2026-06-19-database-index-intro.md`
- 数据库索引取舍：判断旧索引是否冗余：`docs/tasks/2026-06-19-database-index-tradeoff.md`
- EXPLAIN 入门：看 MySQL 是否使用了 Activity Log 索引：`docs/tasks/2026-06-19-database-explain-intro.md`
- EXPLAIN 结果复盘：为什么暂时不删旧索引：`docs/tasks/2026-06-19-database-explain-result-review.md`
- EXPLAIN 对比：Activity Log 带 action 查询会怎么选索引：`docs/tasks/2026-06-19-database-explain-action-query.md`
- 判断是否需要 Activity Log action 复合索引：`docs/tasks/2026-06-19-database-action-composite-index-decision.md`
- Activity Log action 复合索引实验：`docs/tasks/2026-06-19-database-action-composite-index-experiment.md`
- Activity Log action 索引保留决策：`docs/tasks/2026-06-20-database-action-index-keep-or-revert.md`
- Activity Log EXPLAIN 数据量实验：`docs/tasks/2026-06-20-activity-log-explain-data-volume.md`
- 复盘 action_idx 和 Using filesort：`docs/tasks/2026-06-20-explain-action-index-filesort-review.md`
- EXPLAIN FORCE INDEX 实验：`docs/tasks/2026-06-20-explain-force-index-experiment.md`
- Activity Log action 复合索引最终判断：`docs/tasks/2026-06-20-activity-log-index-final-decision.md`
- 数据库索引阶段总复盘：`docs/tasks/2026-06-20-database-index-stage-retrospective.md`
- 并发更新实验：观察 lost update：`docs/tasks/2026-06-20-concurrent-lost-update-lab.md`
- 用 atomic increment 修复 lost update：`docs/tasks/2026-06-21-atomic-increment-fix-lost-update.md`
- Prisma transaction 一致性边界实验：`docs/tasks/2026-06-21-prisma-transaction-job-log-boundary.md`
- 数据库锁实验：SELECT FOR UPDATE：`docs/tasks/2026-06-21-row-lock-for-update-lab.md`
- 幂等入门：用 idempotency key 防止重复创建 Job：`docs/tasks/2026-06-21-idempotency-key-intro.md`
- Job repository 接入 idempotencyKey：`docs/tasks/2026-06-21-job-idempotency-key-repository.md`
- Job API 接入 idempotencyKey：`docs/tasks/2026-06-21-job-api-idempotency-key.md`
- 事务和并发阶段复盘：`docs/tasks/2026-06-21-transaction-concurrency-stage-retrospective.md`
- 后端生产化下一阶段选择：`docs/tasks/2026-06-21-next-backend-production-stage-planning.md`
- GitHub Actions CI 入门：`docs/tasks/2026-06-21-github-actions-ci-intro.md`
- CI 结果复盘和优化：`docs/tasks/2026-06-21-ci-result-retrospective.md`
- 部署前环境变量盘点：`docs/tasks/2026-06-22-deployment-env-inventory.md`
- 部署方式选择：托管平台还是自管服务器：`docs/tasks/2026-06-22-deployment-platform-choice.md`
- Railway API 第一版部署准备：`docs/tasks/2026-06-22-railway-api-deploy-prep.md`
- Railway API 首次部署：`docs/tasks/2026-06-22-railway-api-first-deploy.md`
- Railway 线上 API Smoke 验证：`docs/tasks/2026-06-22-railway-api-smoke.md`
- API 部署日志和故障复盘：`docs/tasks/2026-06-22-railway-deploy-log-retrospective.md`
- 生产化日志、监控和健康检查规划：`docs/tasks/2026-06-22-production-observability-plan.md`
- 实现 `/ready` 数据库 Readiness Check：`docs/tasks/2026-06-22-ready-check.md`

## Current

- 增强 Error Handler 服务端日志：`docs/tasks/2026-06-22-error-handler-server-logging.md`

## Next

完成当前任务后，继续按这个顺序走：

1. 增强 error handler 服务端日志
2. 前端线上接入 API

## Working Agreement

每张任务卡的节奏固定：

1. 我创建任务卡。
2. 你按任务卡实现。
3. 你完成后告诉我。
4. 我跑测试、类型检查、格式检查和构建。
5. 通过后我补学习型注释。
6. 我更新任务索引，并给下一张任务卡。
