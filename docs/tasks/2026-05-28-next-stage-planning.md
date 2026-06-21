# Task: Choose Next Learning Stage

## 目标

你已经完成了一个比较完整的 Node 后端小系统：

```text
Express
Zod
Service
Repository
Prisma
MySQL
JWT Auth
Permission Boundary
Vitest
Supertest
Smoke Script
```

现在不要急着继续写功能，先选择下一阶段方向。

---

## Option A: 继续深入 Node 后端

适合你如果想继续把后端基础打深。

接下来可以学：

```text
1. service 单元测试
2. 统一错误码和 API 文档
3. 日志结构化
4. 配置分环境
5. 数据分页和搜索
6. 事务 transaction
7. 数据库唯一约束和业务约束
8. rate limit 和基础安全
```

推荐任务顺序：

```text
1. 给 Project / Todo service 补单元测试
2. 给 Todo 列表加分页
3. 学 Prisma transaction
4. 加 rate limit
5. 整理 API 文档
```

---

## Option B: 做一个前端调用这些 API

适合你如果想看到完整产品形态。

接下来可以学：

```text
1. React 或 Next.js
2. 登录表单
3. 保存 JWT
4. Project 列表页
5. Todo 列表和完成状态切换
6. 前后端错误展示
```

推荐任务顺序：

```text
1. 在 monorepo 里新增 apps/web
2. 做登录页
3. 做 Project 列表和创建
4. 做 Todo 列表和完成状态切换
5. 做基础 UI 状态：loading / error / empty
```

---

## 我的建议

我建议你先选 Option A，再做 2 到 3 张后端深化任务。

原因是：

```text
你现在刚把 route -> service -> repository -> Prisma -> test 跑通。
这个时候继续加一点 service 测试、分页、transaction，会让后端理解更稳。
之后再接前端，你会更清楚前端到底在调用什么。
```

---

## 你要做什么

在聊天里回复一个选择：

```text
我选 A：继续深入 Node 后端
```

或者：

```text
我选 B：做一个前端调用这些 API
```

你也可以补一句原因。

我会根据你的选择，继续给你出下一张具体任务卡。
