# 后端测试金字塔复盘

## 我现在已经写过哪些测试

我现在项目里已经写过这些测试类型：

- service unit test
- repository integration test
- API integration test
- API smoke script
- OpenAPI docs test

这些测试不是越多越好，而是要各自守住自己的边界。

我现在最需要建立的判断是：

```text
这个行为到底应该在哪一层测？
```

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
```

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
```

## Smoke test：测关键链路能不能跑通

Smoke test 不追求覆盖所有边界。

它主要验证：

- 服务启动后关键 API 能不能串起来
- 注册 / 登录 / 创建 Project / 创建 Todo 这类主流程能不能跑通
- 本地或部署后有没有明显断裂

我的理解：

```text
smoke test 是健康巡检，不是细节测试。
```

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

## 我以后怎么判断测哪一层

当我拿到一个后端需求时，可以这样判断：

1. 如果是纯业务规则，比如权限失败后不能继续调用 update，优先写 service unit test。
2. 如果是 Prisma 查询、分页、排序、transaction、级联删除，优先写 repository integration test。
3. 如果是 HTTP 状态码、请求参数校验、鉴权、错误响应格式，优先写 API integration test。
4. 如果是验证整条主流程能不能跑通，用 smoke test。
5. 如果是 OpenAPI / Swagger 文档结构，用 docs test。

## 我现在最容易混淆的是

我现在暂时没有特别卡住的混淆点。

但我需要继续提醒自己：

```text
不要因为一个行为很重要，就在每一层都重复测同一个细节。
```

更好的做法是先判断这个行为属于哪一层：

```text
业务判断归 service。
数据库行为归 repository。
HTTP 对外表现归 API integration。
主流程巡检归 smoke。
文档结构归 docs test。
```

## 我下一阶段最想继续补的是

下一阶段我适合开始补 Redis。

原因是我现在已经有：

- Express API
- Prisma + MySQL
- 鉴权和权限边界
- 测试分层意识

接下来学习 Redis，可以练到真实后端里很常见的能力：

- 外部服务连接
- 缓存 key 设计
- TTL
- 缓存命中和未命中
- 数据更新后的缓存失效
- 后续把 rate limit 从内存升级到 Redis

我的下一步不应该一上来就做复杂缓存，而是先从最小入口开始：

```text
Node API 能连接 Redis，并能执行 PING。
```
