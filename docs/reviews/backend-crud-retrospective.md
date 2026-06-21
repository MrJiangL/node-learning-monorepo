# 后端 CRUD 阶段复盘

## 我现在能独立解释的内容

- 目前我理解的是 mapper 是对写入数据库的操作统一进行处理
- prisma-repository 是对写入数据的操作 进行校验和处理
- repository 定义接口函数 和类型定义
- route 获取数据来源 以及路劲定义 定义 Router 数据校验
- schema 定义 zod 数据校验
- service 接口的实现 还有一些前置处理 来决定是否返回 数据 还是错误

## 我现在能半独立实现的内容

- 能实现 create update Delete findAll 接口，只限单表，链表可能还需要在理解一下

## 我还容易混乱的内容

- 处理数据的prisma的方法 还不清楚 有时候写到 $transaction 我都不能理解这个函数是干嘛用的 还有zod也是一样

## 一个请求从进入 Express 到返回响应的流程

1. 先匹配 路由 匹配不上报404
2. 对应路由匹配上了 获取参数 zod验证参数 调用service
3. service 先前置检验 是否有权限 以及数据交付给 prisma-repository
4. prisma-repository 负责数据组装 和 数据的转换 以及写入

## 新增一个 API 时我应该怎么拆

1. shared 类型
2. Zod schema
3. repository
4. service
5. route
6. tests
7. smoke

## 我对 Repository / Service / Route 的理解

Repository 是处理数据 以及数据的写入到数据库的操作
Service 是在写入数据前的校验 查看是否有权限 以及数据是否存在等一下安全校验
Route 定义路径 获取客户端传递过来的数据，以及参数的校验

## 下一阶段我想优先补的能力

- ...

## 导师评估

### 总体判断

我现在已经不是“完全跟着任务卡抄代码”的阶段了，而是到了：

```text
能按固定结构实现常规 CRUD，但对底层工具和复杂数据关系还不够稳。
```

如果按当前 Express + Prisma 后端阶段评估，我大概处在：

```text
入门后段 / 初级后端可训练阶段
```

也就是说：

- 单表 CRUD 的路线已经基本建立。
- route / service / repository 的职责已经有雏形。
- 权限边界知道要放在 service 层。
- 测试知道要分层，但还不能完全独立设计。
- Prisma / Zod / transaction 还需要继续专门练。

### 已经比较稳的地方

- 我知道新增 API 时大概要按 `shared -> schema -> repository -> service -> route -> tests -> smoke` 拆。
- 我知道 route 要负责拿 HTTP 里的数据，例如 `params / query / body / current user`。
- 我知道 service 要做权限判断，例如当前用户只能改自己的 Project/Todo。
- 我知道 repository 是数据访问层，负责和 Prisma / 数据库打交道。
- 我已经能实现 `create / update / delete / findAll` 这类基础接口。
- 我知道删除成功通常用 `204 No Content`，创建成功通常用 `201 Created`。

### 需要校准的理解

#### mapper 不是“写入数据库前的统一处理”

我原来的理解：

```text
mapper 是对写入数据库的操作统一进行处理
```

更准确的理解：

```text
mapper 主要负责把 Prisma/数据库返回的数据形状，转换成 API/shared 类型需要的数据形状。
```

比如 Prisma 返回的时间字段是 `Date`：

```ts
createdAt: Date;
```

但 API 返回 JSON 时应该是字符串：

```ts
createdAt: string;
```

所以 mapper 做的是：

```text
数据库模型 -> API DTO
```

它不是主要负责“写入数据库”，写入数据库主要是 repository 的工作。

#### repository 不是主要做校验

我原来的理解：

```text
prisma-repository 是对写入数据的操作进行校验和处理
```

更准确的理解：

```text
repository 主要负责数据访问：查、增、改、删、分页、过滤、排序、transaction。
```

它可以做一些和数据库行为有关的保护，比如：

- Prisma `update` 找不到会抛错，所以先 `findUnique`，找不到返回 `null`。
- 把 `string` 日期转换成 Prisma 需要的 `Date`。
- 用同一个 `where` 同时做 `findMany` 和 `count`，保证分页 meta 正确。

但它不应该负责：

- 当前用户有没有权限。
- HTTP 状态码是什么。
- Zod 请求体验证。
- 返回什么错误响应。

这些应该在 route / service / error handler 里完成。

#### service 不只是“接口实现”

我原来的理解：

```text
service 接口的实现，还有一些前置处理，决定是否返回数据还是错误
```

更准确的理解：

```text
service 是业务规则层。
```

它关心的是：

- 当前用户能不能操作这个资源。
- 资源不存在时抛什么业务错误。
- 删除/更新前是否需要先查一次归属。
- 多个 repository 方法怎么组合成一个业务动作。

例如 Todo 没有 `userId`，所以 service 要通过：

```text
Todo -> Project -> User
```

判断归属。

这就是业务规则，不应该放在 route，也不应该放在 repository。

#### route 的理解基本对，但还要补一个点

我原来的理解：

```text
route 定义路径，获取客户端传递过来的数据，以及参数的校验
```

这是对的。

还可以补一句：

```text
route 负责把 HTTP 世界转换成业务世界，再把业务结果转换回 HTTP 响应。
```

也就是：

```text
HTTP request -> Zod parse -> service call -> HTTP response
```

route 不应该直接写复杂业务规则，也不应该直接拼很多 Prisma 查询。

### 一个请求流程的修正版

以：

```text
PATCH /todos/:id
```

为例，一个更完整的流程是：

1. 请求进入 Express。
2. `requestLogger` 记录请求。
3. `express.json()` 解析 JSON body。
4. Express 匹配到 `PATCH /todos/:id`。
5. `requireAuth` 检查 JWT，并把当前用户放到 `request.user`。
6. route 从 `request.params.id` 拿 Todo id。
7. route 用 `updateTodoSchema.parse(request.body)` 校验 body。
8. route 调用 `todoService.updateTodo(id, input, request.user.id)`。
9. service 先通过 `todoRepository.findById(id)` 查 Todo。
10. service 通过 `todo.projectId` 调 `projectRepository.findById(projectId)`。
11. service 判断 `project.userId === currentUserId`。
12. 权限通过后，service 调用 `todoRepository.update(id, input)`。
13. repository 用 Prisma 更新数据库，并通过 mapper 转成 API 类型。
14. service 返回更新后的 Todo。
15. route 返回：

```ts
response.json({ success: true, data: todo });
```

如果任何一步抛 `AppError`，会经过：

```text
asyncHandler -> errorHandler -> JSON 错误响应
```

### 当前最大的三个薄弱点

#### 1. Prisma 方法还不够熟

需要继续练：

- `findUnique`
- `findMany`
- `count`
- `create`
- `update`
- `delete`
- `deleteMany`
- `include`
- `where`
- `orderBy`
- `skip / take`

这些不是靠看一次文档就会，而是要通过小任务反复写。

#### 2. transaction 还没有真正内化

现在知道 `$transaction` 大概和“多个数据库动作一起成功/失败”有关，但还没完全理解什么时候必须用。

可以先记：

```text
一个业务动作里包含多个互相关联的数据库写操作时，就要考虑 transaction。
```

项目里的例子：

- 创建 Project 时同时创建初始 Todo。
- 删除 Project 时先删 Todos，再删 Project。

如果只执行一半成功，数据会不一致，所以要用 transaction。

#### 3. Zod 还停留在“照着写 schema”

现在已经知道 Zod 是数据校验，但还需要继续补：

- `optional()` 是没传可以。
- `nullable()` 是可以传 `null`。
- `transform()` 可以转换类型。
- `coerce.number()` 可以把 query string 转数字。
- 为什么 `z.coerce.boolean()` 对 `"false"` 有坑。
- `parse()` 失败会抛 `ZodError`。

这些建议下一阶段专门做一组 Zod + Prisma 小练习。

### 阶段评分

按学习目标拆开看：

| 能力                 | 当前水平 | 评价                         |
| -------------------- | -------- | ---------------------------- |
| Express route        | 75%      | 能写常规接口，还需更熟中间件 |
| HTTP 状态码          | 75%      | 已经理解主流场景             |
| Service 权限边界     | 70%      | 思路对，还要继续独立练       |
| Repository 模式      | 70%      | 会用，但职责还需继续校准     |
| Prisma 基础 CRUD     | 60%      | 能写，但方法细节不稳         |
| Prisma relation      | 50%      | Project/Todo 理解中          |
| Transaction          | 40%      | 知道概念，但还没真正熟       |
| Zod                  | 55%      | 会跟着写，还没形成体系       |
| 测试设计             | 55%      | 能看懂和补一部分，还需练设计 |
| Smoke / 手动验证思路 | 70%      | 已经知道主流程要跑通         |

整体评估：

```text
当前阶段完成度：70% 左右。
```

更准确地说：

```text
Express + Prisma CRUD 主线已经完成第一轮。
下一阶段不应该急着换框架，而应该补 Prisma / Zod / 测试设计这三块。
```

### 下一阶段建议

我建议下一阶段先选：

```text
A. 继续 Express 后端深化
```

暂时不急着接前端，也不急着切 NestJS。

原因：

- 你现在的问题不是“没有页面”，而是后端内部理解还需要再压实。
- 如果现在切前端，会同时引入 React 状态、表单、请求、页面结构，容易分散。
- 如果现在切 NestJS，会引入装饰器、模块、依赖注入，容易把 route/service/repository 的基础概念搅混。

建议下一阶段主题：

```text
Prisma + Zod + 测试设计强化
```

可以拆成小任务：

1. Zod 专项：整理 `optional / nullable / transform / coerce`。
2. Prisma 查询专项：练 `where / include / relation / orderBy`。
3. Transaction 专项：再做 2 个需要 `$transaction` 的业务动作。
4. 测试专项：我只给需求，你自己先写测试，再实现。
5. 错误码和响应格式整理成 checklist。

这会比继续堆接口更适合你现在的瓶颈。
