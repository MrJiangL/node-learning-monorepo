# Task: 后端生产化下一阶段选择

## 背景

你已经完成了很多后端核心能力：

```text
1. Express API 和分层结构
2. Prisma + MySQL
3. Zod 输入校验
4. JWT / Refresh Token 鉴权
5. Project / Todo / Activity Log 业务模块
6. Redis 缓存
7. 后台任务和数据库队列
8. OpenAPI / Swagger
9. 测试 helper / 测试数据工厂
10. 数据库索引 / EXPLAIN
11. transaction / lock / idempotency
```

现在可以进入后端生产化收束阶段。

---

## 这张任务只练什么

只做选择，不写代码：

```text
接下来先学 CI、部署、监控，还是补产品体验。
```

---

## 推荐选择

我建议你选 A：

```text
A. CI / GitHub Actions 入门
```

理由：

```text
你已经有比较多测试、typecheck、format check。
下一步很适合把这些检查放进 CI，让每次提交都自动验证。
这会把你的项目从“本地能跑”推进到“更像真实团队项目”。
```

---

## 可选方向

你可以从下面选一个：

```text
A. CI / GitHub Actions 入门
B. 部署和环境变量管理
C. 生产化日志、监控和健康检查
D. 回到前端，补完整产品体验
```

---

## 任务 1：创建选择文档

创建：

```text
docs/reviews/next-backend-production-stage-planning.md
```

写下面这些小标题：

```md
# 后端生产化下一阶段选择

## 1. 我已经完成了哪些后端能力

## 2. A：CI / GitHub Actions 入门

## 3. B：部署和环境变量管理

## 4. C：生产化日志、监控和健康检查

## 5. D：回到前端补产品体验

## 6. 我的选择
```

第 6 节可以直接写：

```text
我选择 A：CI / GitHub Actions 入门。
```

---

## 验证命令

这张任务只改文档，所以运行：

```bash
npm run format:check
```

---

## 完成标准

- [x] 创建 `docs/reviews/next-backend-production-stage-planning.md`
- [x] 写出 4 个可选方向
- [x] 写下你的选择
- [x] `npm run format:check` 通过

完成后告诉我：

```text
后端生产化下一阶段选择完成了
```
