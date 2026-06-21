# Task: 后端下一阶段规划：缓存、队列、部署还是测试金字塔

## 背景

你现在已经走完了一轮比较完整的 Node 后端主线：

```text
Express API
Zod 输入校验
Prisma + MySQL
Repository / Service 分层
JWT + Refresh Token
权限边界
Vitest / Supertest
测试数据工厂
OpenAPI / Swagger UI
Vue3 前端接入
```

现在先不要急着继续加功能。

下一阶段应该选方向。

这张任务不写代码，只做学习路线决策。

---

## 可选方向

## A：后端测试金字塔强化

适合目标：

```text
把单元测试、集成测试、API smoke、测试数据工厂真正吃透。
```

你会继续练：

- service unit test
- repository integration test
- API integration test
- smoke test
- test data factory
- 测试覆盖边界怎么判断

适合你现在的原因：

```text
你之前多次说测试不知道怎么写。
这条线能把后端测试能力补扎实。
```

## B：缓存 Redis 入门

适合目标：

```text
学习真实后端常见的性能和状态管理工具。
```

你会练：

- Redis 是什么
- 缓存 project / todo 列表
- cache key 设计
- cache invalidation
- rate limit 从内存升级到 Redis

适合你现在的原因：

```text
你已经有 API 和数据库了，Redis 可以自然接进来。
```

## C：队列 / 后台任务入门

适合目标：

```text
学习请求之外的异步任务处理。
```

你会练：

- job queue 是什么
- BullMQ 或轻量队列
- 创建任务后异步处理
- retry / failed job
- worker 和 API 进程分离

适合你现在的原因：

```text
你已经理解 HTTP 请求响应了，可以开始理解“不是所有工作都应该在请求里做”。
```

## D：部署和生产化

适合目标：

```text
把本地项目推向可运行的生产环境。
```

你会练：

- production env
- build / start
- migration
- health check
- Docker
- 部署 API 和 Web

适合你现在的原因：

```text
你已经有前后端和数据库，部署能帮你理解真实项目上线需要什么。
```

---

## 任务 1：写选择笔记

创建文件：

```text
docs/reviews/next-backend-stage.md
```

写入：

```markdown
# 后端下一阶段选择

## 我现在最想补的能力是什么？

...

## A：测试金字塔强化，我的兴趣和顾虑

...

## B：Redis 缓存，我的兴趣和顾虑

...

## C：队列 / 后台任务，我的兴趣和顾虑

...

## D：部署和生产化，我的兴趣和顾虑

...

## 我选择的方向

...
```

---

## 任务 2：给出你的选择

在文档最后明确写一句：

```text
我选择 A/B/C/D，因为...
```

不用写很长。

重点是你要知道自己下一阶段为什么学这个。

---

## 任务 3：运行验证

跑格式检查：

```bash
npm run format:check
```

如果格式不通过：

```bash
npm run format
npm run format:check
```

---

## 完成标准

- [ ] 新增 `docs/reviews/next-backend-stage.md`
- [ ] 对 A/B/C/D 都写了兴趣和顾虑
- [ ] 明确选择一个方向
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
后端下一阶段规划完成了
```
