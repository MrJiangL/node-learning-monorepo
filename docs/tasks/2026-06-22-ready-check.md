# Task: 实现 `/ready` 数据库 Readiness Check

## 背景

当前 `/health` 只能说明 API 进程活着，不能说明数据库可用。

下一步实现一个轻量 `/ready`：

- 成功连接数据库时返回 200
- 数据库不可用时返回 503
- 不泄露数据库地址、密码或完整错误堆栈

---

## 这张任务练什么

1. 区分 liveness 和 readiness
2. 用 Prisma 做轻量数据库检查
3. 给健康检查写集成测试
4. 保持错误响应安全

---

## 建议行为

`GET /health`：

- 不查数据库
- 返回 200
- 表示 API 进程活着

`GET /ready`：

- 查数据库
- 数据库可用返回 200
- 数据库不可用返回 503

---

## 涉及文件

- `apps/api/src/modules/health/health.routes.ts`
- `apps/api/src/app.ts`
- `apps/api/tests/integration/health.test.ts`

---

## 完成标准

- [ ] `GET /ready` 数据库可用时返回 200
- [ ] `GET /ready` 数据库不可用时返回 503
- [ ] 响应不泄露敏感连接信息
- [ ] 测试覆盖 `/health` 和 `/ready` 的区别
- [ ] `npm run test -w @learn/api -- health.test.ts` 通过
- [ ] `npm run typecheck` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

`/ready 数据库 readiness check 完成了`
