# Task: 生产化日志、监控和健康检查规划

## 背景

Railway API 已经完成首次部署、线上 smoke 和部署日志复盘。

下一步进入生产化观察能力：

- 日志
- 健康检查
- 错误定位
- 简单监控

这张任务先做规划和盘点，不急着接第三方监控平台。

---

## 这张任务只练什么

只练三件事：

1. 线上出错时应该看哪些日志
2. `/health` 现在能说明什么，不能说明什么
3. 下一步要怎么增强健康检查和可观察性

---

## 任务 1：阅读现有日志和健康检查代码

阅读：

- `apps/api/src/modules/health/health.routes.ts`
- `apps/api/src/middleware/request-logger.ts`
- `apps/api/src/middleware/error-handler.ts`
- `apps/api/src/server.ts`

回答：

- 现在 `/health` 检查了什么？
- request logger 现在记录什么？
- error handler 会不会泄露敏感信息？
- Railway logs 里能看到哪些信息？

---

## 任务 2：创建规划文档

创建：

`docs/reviews/production-observability-plan.md`

写下面这些小标题：

# 生产化日志、监控和健康检查规划

## 1. 当前 `/health` 能说明什么

## 2. 当前 `/health` 不能说明什么

## 3. 当前日志能帮助我定位哪些问题

## 4. 当前日志还缺什么

## 5. 下一步健康检查可以怎么增强

## 6. 下一步日志可以怎么增强

## 7. 我现在怎么理解生产化可观察性

---

## 完成标准

- [ ] 创建 `docs/reviews/production-observability-plan.md`
- [ ] 写清楚 `/health` 的能力边界
- [ ] 写清楚 Railway logs 的作用
- [ ] 写清楚下一步日志 / 健康检查增强方向
- [ ] `npm run format:check` 通过

完成后告诉我：

`生产化日志监控规划完成了`
