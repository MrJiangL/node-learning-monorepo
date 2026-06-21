# 测试数据工厂复盘

## 什么是测试数据工厂？

测试数据工厂是专门给测试准备数据库数据的 helper。

它的目标不是测试业务接口，而是让测试更快进入目标场景。

比如测试“当前用户不能删除别人的 todo”时，测试真正关心的是：

```text
用户 A 拿自己的 token 删除用户 B 的 todo，应该返回 404。
```

这个测试并不关心：

```text
用户 B 是怎么注册出来的？
用户 B 的 project 是怎么创建出来的？
用户 B 的 todo 是怎么创建出来的？
```

所以这些已有数据就可以用 factory 直接通过 Prisma 创建。

当前项目里的测试数据工厂是：

```text
apps/api/tests/helpers/test-data-factory.ts
```

里面有：

```text
createFactoryUser()
createFactoryProject()
createFactoryTodo()
```

它们直接写数据库，帮助测试快速准备：

```text
User -> Project -> Todo
```

## API helper 和 test data factory 有什么区别？

API helper 是通过 HTTP API 准备数据。

比如：

```text
registerAndLogin()
createProject()
createTodo()
```

这些 helper 会走真实接口，所以它们适合验证完整链路：

```text
route -> Zod -> service -> repository -> Prisma -> MySQL
```

test data factory 是直接通过 Prisma 准备数据。

比如：

```text
createFactoryUser()
createFactoryProject()
createFactoryTodo()
```

这些 helper 会绕过 HTTP route、Zod schema、service 逻辑，直接写入数据库。

所以两者的区别可以这样记：

```text
API helper 关注“像用户一样调用系统”。
test data factory 关注“快速准备测试场景”。
```

它们不是谁替代谁，而是用在不同场景。

## 什么时候应该走真实 API 准备数据？

当测试目标本身就是某个 API 行为时，应该走真实 API。

比如：

```text
POST /auth/register 是否能注册用户
POST /auth/login 是否能登录并返回 token
POST /projects 是否能创建 project
POST /projects/{projectId}/todos 是否能创建 todo
```

这些测试如果用 factory 直接创建数据，就会绕过真正要验证的接口。

例如测试 `POST /projects` 时，如果先用 `createFactoryProject()` 直接写数据库，再断言数据库里有 project，这个测试其实没有验证：

- Express route 是否注册正确
- `requireAuth` 是否生效
- Zod body 校验是否生效
- service 是否正确使用当前用户 id
- response status 是否是 `201`
- response body 是否符合 API 契约

所以测试创建类接口时，不应该用 factory 替代 API。

## 什么时候可以直接用 factory 准备数据？

当测试目标是“已有数据下的行为”时，可以用 factory 准备数据。

比如：

```text
查询已有 project
更新已有 project
删除已有 project
不能访问别人的 project
不能删除别人的 todo
分页查询已有多条数据
按 completed / dueDate / title 过滤已有 todo
```

这些测试的重点不是“数据怎么被创建出来”，而是：

```text
系统面对已有数据时，是否返回正确结果。
```

这时候 factory 可以减少测试噪音。

例如：

```ts
const anotherUser = await createFactoryUser();
const anotherProject = await createFactoryProject({ userId: anotherUser.id });

const response = await request(app)
  .get(`/projects/${anotherProject.id}`)
  .set(authHeader(currentUser.token));

expect(response.status).toBe(404);
```

这段测试读起来更接近业务意图：

```text
当前用户不能查看别人的 project。
```

而不是被注册、登录、创建 project 的准备步骤淹没。

## factory 直接用 Prisma 时要注意什么？

factory 直接用 Prisma，意味着它绕过了 service 和 repository。

所以原本由 service / repository 做的事情，如果是数据库必需字段，factory 也要补上。

当前项目里最典型的是 id。

Prisma schema 里这些 model 的 id 是：

```text
String @id
```

但没有：

```text
@default(uuid())
```

所以数据库不会自动生成 id。

业务代码里创建 User / Project / Todo 时，通常会显式传：

```ts
crypto.randomUUID();
```

因此 factory 直接写 Prisma 时，也必须传 id：

```ts
id: crypto.randomUUID();
```

否则会出现 Prisma 报错：

```text
Argument `id` is missing.
```

factory 还要注意这些点：

- 唯一字段要避免冲突，比如 `User.email`
- 关系字段要明确传，比如 `Project.userId`、`Todo.projectId`
- 不要在 factory 里写太多业务逻辑
- 不要让 factory 帮你断言结果
- 不要让 factory 替代真正要测试的 API

factory 的职责应该保持简单：

```text
创建测试需要的数据库状态。
```

## 当前项目里我怎么判断一个测试该用哪种方式？

我会先问一个问题：

```text
这个测试真正想证明什么？
```

如果它想证明“某个 API 能不能创建数据”，就走真实 API。

比如：

```text
creates and lists projects for the current user
creates and lists todos for the current user's project
```

这类测试应该继续走：

```text
request(app).post(...)
```

如果它想证明“已有数据下的权限、查询、更新、删除是否正确”，就可以用 factory。

比如：

```text
不能查看别人的 Project 详情
不能删除别人的 Project
不能通过 API 更新别人的 Project
不能通过 API 删除别人的 todo
```

这些测试可以用 factory 准备“别人的数据”，然后通过 HTTP 请求验证当前用户的行为。

## 项目里的例子

### 适合走 API helper 的场景

适合走 API helper 的测试包括：

- 测 `POST /auth/register` 是否真的能注册用户
- 测 `POST /auth/login` 是否能返回 access token / refresh token
- 测 `POST /projects` 是否真的能创建 project
- 测 `POST /projects/{projectId}/todos` 是否真的能创建 todo
- 测创建 project 时 response status 是否是 `201`
- 测创建 todo 时 response body 是否包含正确的 `projectId`

这些测试的重点是 API 自己，所以必须走真实 HTTP 请求。

### 适合走 test data factory 的场景

适合走 factory 的测试包括：

- 当前用户不能查看别人的 project
- 当前用户不能删除别人的 project
- 当前用户不能更新别人的 project
- 当前用户不能删除别人的 todo
- Todo 列表分页时预先准备多条 todo
- Todo 按 completed / dueDate / title 过滤时预先准备不同状态的数据

这些测试的重点是已有数据下的行为，所以可以用 factory 快速准备数据库状态。

### 不应该用 factory 的场景

不应该用 factory 的场景包括：

- 测注册接口时，不应该用 `createFactoryUser()` 代替注册
- 测登录接口时，不应该跳过密码哈希和登录流程
- 测创建 project 接口时，不应该用 `createFactoryProject()` 代替 `POST /projects`
- 测创建 todo 接口时，不应该用 `createFactoryTodo()` 代替 `POST /projects/{projectId}/todos`

原因很简单：

```text
如果测试目标就是这个 API，绕过 API 就等于没测它。
```

## 我的判断公式

我现在的判断公式是：

```text
如果测试目标是“创建这条数据的 API 是否正确”，就走 API。
如果测试目标是“已有数据下的查询 / 更新 / 删除 / 权限行为”，就用 factory 准备数据。
```

再换成更短的一句话：

```text
要测入口，就走入口；只需要场景，就用工厂。
```

API helper 和 test data factory 的边界清楚以后，测试会更容易读：

```text
准备数据的代码更少。
测试行为更突出。
失败时也更容易定位是准备数据坏了，还是 API 行为坏了。
```
