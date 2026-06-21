# Task: 后端测试金字塔复盘：unit / integration / smoke 怎么分工

## 背景

你最近连续练了几类测试：

```text
service unit test
repository integration test
API integration test
API smoke script
OpenAPI docs test
```

这些测试都重要，但最容易混乱的是：

```text
我到底该在哪一层测这个行为？
```

这张任务不写新功能，只做学习复盘。

目标是让你以后看到一个后端需求时，可以先判断：

```text
这个规则应该写 unit test？
应该写 repository integration test？
应该写 API integration test？
还是只需要 smoke？
```

---

## 你会练到什么

- unit test / integration test / smoke test 的分工
- fake repository 适合验证什么
- 真实 Prisma / MySQL 测试适合验证什么
- Supertest API 测试适合验证什么
- 为什么不是每一层都重复测同一个细节
- 如何形成自己的测试判断清单

---

## 任务 1：创建复盘文档

创建：

```text
docs/reviews/test-pyramid-retrospective.md
```

文档开头写：

```md
# 后端测试金字塔复盘

## 我现在已经写过哪些测试

我现在项目里已经写过这些测试类型：

- service unit test
- repository integration test
- API integration test
- API smoke script
- OpenAPI docs test
```

---

## 任务 2：写 service unit test 的理解

继续写：

````md
## Service unit test：测业务流程和协作者调用

Service unit test 不应该关心 Express、HTTP、Prisma、MySQL。

它主要验证：

- service 有没有按正确顺序执行业务流程
- 权限不通过时有没有提前停止
- 有没有把 currentUserId 传给 repository
- 什么时候应该返回数据
- 什么时候应该抛 AppError

这层适合用 fake repository。

例子：

- 当前用户不能更新别人的 Project 时，service 应该抛 PROJECT_NOT_FOUND
- 当前用户不能更新别人的 Project 时，不应该调用 repository.update

我的理解：

```text
service unit test 测的是“业务判断”，不是数据库查询。
```
````

````

注意：最后那个代码块里面是普通文本，不是 TypeScript。

---

## 任务 3：写 repository integration test 的理解

继续写：

```md
## Repository integration test：测真实数据库行为

Repository integration test 会碰真实 Prisma / MySQL。

它主要验证：

- Prisma 查询条件有没有写对
- userId 过滤有没有生效
- 分页 skip / take 有没有生效
- transaction 有没有真的保存多张表
- 删除 Project 时 Todo 有没有一起删除
- 找不到数据时是否返回 null

这层不应该关心：

- HTTP 状态码
- JWT
- Express middleware
- 当前登录用户是谁
- response body 长什么样

例子：

- findAll 只返回指定 userId 的 Project
- page 超出范围时，data 是空数组，但 meta.total 仍然是总数量

我的理解：

```text
repository integration test 测的是“真实数据库读写行为”，不是用户请求流程。
````

````

---

## 任务 4：写 API integration test 的理解

继续写：

```md
## API integration test：测 HTTP 入口到业务结果

API integration test 通常用 Supertest 调 Express app。

它主要验证：

- 路由有没有挂对
- request body / query / params 有没有校验
- 鉴权 middleware 有没有生效
- 当前用户只能操作自己的数据
- 成功时状态码和 response body 是否正确
- 失败时错误码是否符合契约

这层可以准备真实数据库数据，但测试目标不是 Prisma 语法。

例子：

- 未登录访问 Project API 返回 401
- 用户不能查看别人的 Project，返回 404 和 PROJECT_NOT_FOUND
- 创建 Todo 成功返回 201 和 success: true

我的理解：

```text
API integration test 测的是“一个真实 HTTP 请求进来后，对外表现是否正确”。
````

````

---

## 任务 5：写 smoke test 和 docs test 的理解

继续写：

```md
## Smoke test：测关键链路能不能跑通

Smoke test 不追求覆盖所有边界。

它主要验证：

- 服务启动后关键 API 能不能串起来
- 注册 / 登录 / 创建 Project / 创建 Todo 这类主流程能不能跑通
- 本地或部署后有没有明显断裂

我的理解：

```text
smoke test 是健康巡检，不是细节测试。
````

## OpenAPI docs test：测文档结构契约

OpenAPI docs test 不测业务数据。

它主要验证：

- `/openapi.json` 能不能返回合法文档
- `/docs/` 能不能打开 Swagger UI
- 关键 schema / response ref 有没有按约定存在

我的理解：

```text
docs test 测的是“文档契约有没有坏”，不是 API 业务本身有没有跑通。
```

````

---

## 任务 6：写自己的判断清单

最后写：

```md
## 我以后怎么判断测哪一层

当我拿到一个后端需求时，可以这样判断：

1. 如果是纯业务规则，比如权限失败后不能继续调用 update，优先写 service unit test。
2. 如果是 Prisma 查询、分页、排序、transaction、级联删除，优先写 repository integration test。
3. 如果是 HTTP 状态码、请求参数校验、鉴权、错误响应格式，优先写 API integration test。
4. 如果是验证整条主流程能不能跑通，用 smoke test。
5. 如果是 OpenAPI / Swagger 文档结构，用 docs test。

我现在最容易混淆的是：

```text
这里写你自己的 2-3 句真实感受。
````

我下一阶段最想继续补的是：

```text
这里写你想继续补 Redis、队列、部署，或者继续补测试都可以。
```

````

最后两段要你自己写，不需要写得很正式，说真实困惑就行。

---

## 任务 7：运行验证

这张任务只写文档，所以跑：

```bash
npm run format:check
````

如果格式检查不通过：

```bash
npm run format
npm run format:check
```

---

## 完成标准

- [ ] 创建 `docs/reviews/test-pyramid-retrospective.md`
- [ ] 写清楚 service unit test 测什么
- [ ] 写清楚 repository integration test 测什么
- [ ] 写清楚 API integration test 测什么
- [ ] 写清楚 smoke test 测什么
- [ ] 写清楚 OpenAPI docs test 测什么
- [ ] 写出自己的测试分层判断清单
- [ ] 写出自己最容易混淆的点
- [ ] 写出下一阶段最想继续补什么
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
测试金字塔复盘完成了
```
