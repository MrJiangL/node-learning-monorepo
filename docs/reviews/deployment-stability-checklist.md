# 部署稳定性 Checklist 和回滚预案

## 1. 这份 checklist 解决什么问题

这份 checklist 解决的是：

    上线时不要只靠记忆。

现在项目已经可以部署到线上：

```text
Netlify 前端
  -> Railway API
    -> Railway MySQL
```

但真实上线时，最容易出问题的往往不是复杂代码，而是一些“便宜但致命”的环节：

- 测试没跑完整
- 前端 API 地址配错
- 后端 CORS 少配了前端域名
- Railway 环境变量缺失
- 数据库 migration 没执行
- `/health` 通过了，但 `/ready` 失败
- 部署后没有跑 smoke，等用户反馈才发现坏了

所以这份 checklist 的目标不是追求形式感，而是把上线流程固定下来：

1. 部署前先挡住明显错误。
2. 部署后快速确认关键链路没断。
3. 如果坏了，知道先查哪里。
4. 如果风险太大，知道什么时候该回滚。

我现在对部署稳定性的理解是：

    监控解决“坏了怎么发现和定位”。
    checklist 解决“上线前怎么尽量少坏”。
    回滚预案解决“坏了以后怎么恢复”。

这三件事合起来，才像一个比较完整的线上维护流程。

## 2. 部署前我应该检查什么

部署前我会从四层检查：代码层、配置层、数据库层、文档层。

我可以把部署前检查固定成下面这张表。真正上线时，不一定每次都要写很长复盘，但至少要能逐项确认：

| 层级     | 检查项              | 通过标准                               | 如果不通过               |
| -------- | ------------------- | -------------------------------------- | ------------------------ |
| 代码     | API 测试            | `npm run test -w @learn/api` 通过      | 停止部署，先修测试       |
| 代码     | Web 测试            | `npm run test -w @learn/web` 通过      | 停止部署，先修测试       |
| 代码     | API 类型检查        | `npm run typecheck -w @learn/api` 通过 | 停止部署，先修类型       |
| 代码     | Web 类型检查        | `npm run typecheck -w @learn/web` 通过 | 停止部署，先修类型       |
| 代码     | 格式检查            | `npm run format:check` 通过            | 先格式化或修正文档格式   |
| 代码     | 前端生产构建        | `npm run build -w @learn/web` 通过     | 停止部署，先修构建       |
| 后端配置 | `DATABASE_URL`      | Railway 指向生产数据库                 | 修正后重新部署           |
| 后端配置 | `JWT_SECRET`        | 已配置且不是示例值                     | 修正后重新部署           |
| 后端配置 | `CORS_ORIGIN`       | 包含 Netlify 线上域名                  | 修正后重新部署           |
| 前端配置 | `VITE_API_BASE_URL` | 指向 Railway API                       | 修正后重新部署前端       |
| 数据库   | Prisma schema       | 知道本次是否有变化                     | 有变化时先评估 migration |
| 数据库   | Migration           | 目标环境执行状态明确                   | 不明确时不要贸然上线     |
| 验证     | Smoke 路径          | 知道部署后怎么验证                     | 先补 smoke 步骤          |

这张表的意义是：

    上线前先把“不应该靠运气”的事情变成显式确认。

如果某一项不通过，我不应该抱着“先部署看看”的心态继续往下走。

### 代码层

先确认本地质量门禁通过：

```bash
npm run test -w @learn/api
npm run test -w @learn/web
npm run typecheck -w @learn/api
npm run typecheck -w @learn/web
npm run format:check
npm run build -w @learn/web
```

这些命令分别解决不同问题：

- API test：后端行为有没有被破坏
- Web test：前端组件、页面、API client 逻辑有没有被破坏
- API typecheck：后端 TypeScript 类型是否正确
- Web typecheck：前端 TypeScript / Vue 类型是否正确
- format check：代码和文档格式是否一致
- web build：前端是否能生成生产构建

如果这些没过，就不应该继续部署。

这里的原则是：

    能在本地发现的问题，不要带到线上发现。

### 配置层

部署前要确认生产环境变量和线上地址匹配。

后端 Railway 至少要检查：

- `DATABASE_URL` 已配置
- `JWT_SECRET` 已配置，并且不是测试用弱值
- `CORS_ORIGIN` 包含 Netlify 前端域名
- 如果有 refresh token / cookie 相关配置，也要确认生产环境值正确

前端 Netlify 至少要检查：

- `VITE_API_BASE_URL` 指向 Railway API
- 没有指向 `localhost`
- 没有指向旧的 Railway service URL

这类问题很常见，而且代码测试不一定能发现。

因为测试跑的是本地配置，真正线上用的是平台环境变量。

### 数据库层

数据库层要先问三个问题：

1. Prisma schema 有没有变化？
2. 有没有新的 migration？
3. 目标环境是否已经执行 migration？

如果这次只是前端页面文案或普通逻辑修改，可能不涉及数据库。

如果这次改了 `schema.prisma`，尤其是字段、索引、关系或约束，就必须更谨慎。

我现在要特别记住：

    代码回滚比较容易。
    数据库结构回滚更危险。

所以涉及 migration 的部署，不能只按“代码部署成功”判断完成。

### 文档层

部署前还要确认自己知道怎么验证。

至少要有：

- 后端部署后验证顺序
- 前端部署后验证顺序
- 线上 smoke 用户路径
- 如果失败，知道看浏览器 Network
- 如果 API 500，知道拿 `X-Request-Id` 去 Railway logs 搜

文档层看起来不像工程能力，但它能减少上线时的慌乱。

### 发布记录模板

每次比较重要的上线，我还可以简单记一条发布记录。

模板可以是：

```md
## Release: YYYY-MM-DD HH:mm

- 变更摘要：
- 影响范围：
- 是否涉及数据库 migration：
- 后端部署版本 / Railway deployment：
- 前端部署版本 / Netlify deployment：
- 部署前检查：
  - [ ] API test
  - [ ] Web test
  - [ ] API typecheck
  - [ ] Web typecheck
  - [ ] format check
  - [ ] web build
- 部署后验证：
  - [ ] /health
  - [ ] /ready
  - [ ] 注册
  - [ ] 登录
  - [ ] 创建 Project
  - [ ] 创建 Todo
- 是否需要回滚：
- 备注：
```

这不是为了做复杂流程，而是为了以后排查时知道：

    当时上线了什么？
    当时验证过什么？
    当时有没有异常？

## 3. 后端 Railway 部署后我应该验证什么

后端 Railway 部署后，我会按从低到高的顺序验证。

第一步，看 Railway deployment 状态。

确认：

- build 成功
- deploy 成功
- service 没有反复重启
- logs 里没有启动阶段异常

第二步，访问：

```text
GET /health
```

如果 `/health` 失败，说明 API 进程本身可能没有正常提供服务。

优先检查：

- Railway deployment 状态
- start command
- 端口配置
- server 启动日志
- package workspace 配置

第三步，访问：

```text
GET /ready
```

如果 `/health` 成功但 `/ready` 失败，说明 Express 进程还活着，但关键依赖可能没准备好。

优先检查：

- `DATABASE_URL`
- Railway MySQL 是否在线
- Prisma 是否能连接数据库
- migration 是否缺失

第四步，跑一条最小 API smoke。

可以手动验证：

1. 注册测试账号
2. 登录获取 token
3. 创建 Project
4. 创建 Todo
5. 查询 Project / Todo

第五步，看 Railway logs。

重点看：

- 有没有启动异常
- 有没有 Prisma 连接错误
- 有没有 500 错误
- request logger 是否正常打印请求
- error handler 是否带 requestId

后端部署后不是只看“平台显示成功”，还要确认：

    API 进程活着，数据库可用，核心业务请求能跑。

## 4. 前端 Netlify 部署后我应该验证什么

前端 Netlify 部署后，我会按用户路径验证，而不是只看首页能打开。

第一步，看 Netlify deployment 状态。

确认：

- build 成功
- deploy 成功
- 线上 URL 可以访问

第二步，打开线上前端：

```text
https://scintillating-pavlova-dc76e0.netlify.app
```

或者直接打开：

```text
/login
```

第三步，打开浏览器 DevTools Network。

前端部署验证不能只看页面 UI，还要看请求到底打到哪里。

第四步，注册新账号。

重点看：

- 请求是否发到 Railway API
- 请求是否错误地发到 `localhost`
- 是否有 CORS 错误
- response status 是否正常

第五步，登录后进入 `/projects`。

重点看：

- token 是否保存
- `Authorization` header 是否带上
- 未登录路由守卫是否正常
- 登录后跳转是否正常

第六步，创建 Project 和 Todo。

这一步能验证：

- 前端 API client 正常
- 后端鉴权正常
- Railway API 正常
- Railway MySQL 写入正常

第七步，退出登录并再次登录。

这一步能验证：

- token 清理正常
- 路由跳转正常
- 老用户登录路径正常

如果任何 API 请求失败，我会立刻看：

- Request URL
- status code
- response body
- response headers 里的 `X-Request-Id`

前端部署完成的标准不是“页面能打开”，而是：

    真实用户路径能走通。

## 5. 数据库和环境变量应该怎么检查

数据库和环境变量是线上部署里最容易“代码没错但线上坏”的地方。

### Railway 后端环境变量

我会检查：

```text
DATABASE_URL
JWT_SECRET
CORS_ORIGIN
```

其中：

- `DATABASE_URL` 决定 Prisma 连哪个数据库
- `JWT_SECRET` 决定 token 是否能签发和验证
- `CORS_ORIGIN` 决定 Netlify 前端是否允许访问 API

如果 `DATABASE_URL` 错，通常会表现为 `/ready` 失败或业务 API 500。

如果 `JWT_SECRET` 缺失或变化异常，可能会表现为登录、鉴权、token 验证问题。

如果 `CORS_ORIGIN` 缺少前端域名，浏览器会看到 CORS 错误，但后端本身可能仍然活着。

### Netlify 前端环境变量

我会检查：

```text
VITE_API_BASE_URL
```

它必须指向 Railway API，而不是：

- `localhost`
- 旧 API 地址
- Netlify 前端自己的域名

如果这个值错了，前端页面可能能打开，但所有业务请求都会失败。

### Prisma 和 migration

我会检查：

- `schema.prisma` 是否有变化
- 是否新增 migration
- production 数据库是否执行了 migration
- migration 是否包含破坏性变更

如果 migration 涉及删除字段、修改关系、增加非空字段，就要格外小心。

因为数据库结构变更一旦执行，不能简单地靠“回滚代码”恢复。

所以数据库相关部署的原则是：

    先确认 schema 变化，再决定部署顺序。
    不确定 migration 风险时，不要盲目上线。

## 6. 线上 smoke 应该按什么顺序跑

线上 smoke 应该覆盖最关键的一条用户路径。

我现在的 smoke 顺序是：

1. 打开 Netlify 前端首页或 `/login`。
2. 进入注册页。
3. 注册一个新的测试账号。
4. 注册成功后确认自动进入 `/projects`。
5. 创建一个 Project。
6. 在这个 Project 下创建一个 Todo。
7. 切换 Todo completed 状态。
8. 退出登录。
9. 确认回到 `/login`。
10. 用刚才账号重新登录。
11. 确认能重新进入 `/projects`。
12. 刷新页面，确认登录态和数据仍然正常。

这条 smoke 链路会同时验证：

- Netlify 前端部署正常
- Railway API 可访问
- CORS 正常
- 注册 API 正常
- 登录 API 正常
- token 保存和携带正常
- Project 写入正常
- Todo 写入和更新正常
- MySQL 数据持久化正常
- 路由守卫和退出登录正常

smoke 的目标不是测所有边界情况。

它的目标是快速回答：

    这次上线有没有把最关键的用户路径打断？

如果 smoke 失败，我会拿失败请求的 `X-Request-Id` 去 Railway logs 查，而不是立刻猜代码哪里错了。

### Smoke 结果记录模板

线上 smoke 跑完后，可以用一个很短的记录模板：

```md
## Smoke: YYYY-MM-DD HH:mm

- 前端 URL：
- API URL：
- 测试账号：
- 浏览器：
- 结果：
  - [ ] 打开 /login
  - [ ] 注册
  - [ ] 自动进入 /projects
  - [ ] 创建 Project
  - [ ] 创建 Todo
  - [ ] 切换 Todo completed
  - [ ] 退出登录
  - [ ] 重新登录
  - [ ] 刷新后状态正常
- 失败请求：
- X-Request-Id：
- Railway logs 结论：
```

这能避免一个常见问题：

    我好像验证过了，但具体验证了什么已经记不清。

线上 smoke 不需要写得很重，但结果要能被回忆和追踪。

## 7. 如果线上出问题，我怎么判断继续排查还是回滚

线上出问题后，我会先判断影响范围和恢复成本。

我可以先把故障分成三级。

| 级别 | 表现                                                               | 处理策略                           |
| ---- | ------------------------------------------------------------------ | ---------------------------------- |
| P0   | 核心链路不可用，例如无法登录、无法注册、API 大量 500、服务启动失败 | 优先恢复服务，快速回滚或修配置     |
| P1   | 核心链路部分可用，但某个重要功能失败，例如创建 Project 失败        | 限时排查，短时间不能修复就回滚     |
| P2   | 非核心体验问题，例如文案、样式、局部空状态不理想                   | 可以继续排查并安排修复，不急于回滚 |

这个分级的重点不是名字，而是帮我避免两个极端：

- 小问题过度回滚，浪费时间。
- 大问题一直排查，导致线上持续不可用。

我现在可以用一个简单原则：

    核心链路坏了，恢复优先。
    非核心问题，定位优先。

### 可以先继续排查的情况

如果问题满足这些特征，可以先排查：

- 只影响某个非核心页面
- 用户主路径仍然可用
- `/health` 正常
- `/ready` 正常
- 错误可以通过配置修正
- 没有数据损坏风险
- 能通过 requestId 快速定位到明确原因

例如：

- 某个文案显示不对
- 某个非核心请求 400
- CORS 少配了一个预览域名，但正式域名正常

这种情况可以先查 Network、Railway logs、环境变量，再决定是否热修。

### 应该优先回滚的情况

如果问题满足这些特征，要优先考虑回滚：

- 登录、注册、创建 Project、创建 Todo 等核心路径不可用
- 大量用户请求 500
- `/health` 失败
- `/ready` 失败且短时间无法修复
- 新版本导致服务反复重启
- 发现明显代码缺陷，但修复需要较长时间
- 数据写入可能错误或不一致

这里的原则是：

    用户主路径坏了，先恢复服务，再慢慢排查。

### 数据库问题要更谨慎

如果问题涉及 migration 或数据结构，不要条件反射地回滚代码。

因为：

```text
代码回滚 != 数据库回滚
```

如果新代码已经写入了新结构的数据，或者 migration 已经删除 / 修改字段，简单回滚代码可能让旧代码也无法运行。

涉及数据库时，我会先：

1. 停止继续扩大影响。
2. 判断 migration 是否已经执行。
3. 判断是否有数据写入风险。
4. 必要时备份数据库。
5. 再决定是修复 migration、补兼容代码，还是做人工恢复。

### Go / No-Go 判断

上线前或上线后验证时，我可以用 Go / No-Go 来做最后判断。

可以 Go：

- 本地测试和类型检查通过
- `/health` 通过
- `/ready` 通过
- 线上 smoke 主路径通过
- Railway logs 没有持续异常
- 没有发现数据写入风险

应该 No-Go：

- 任一核心测试失败且原因不明
- `/health` 失败
- `/ready` 失败且不是已知短暂波动
- 注册 / 登录 / 创建 Project / 创建 Todo 任一主路径失败
- 发现 migration 风险但没有备份或恢复方案
- 线上出现大量 500 且无法快速定位

No-Go 不是“任务失败”。

No-Go 的含义是：

    当前证据不足以安全继续上线。

这也是工程判断的一部分。

## 8. 当前项目的回滚预案是什么

当前项目还没有自动化回滚系统，所以先采用手动回滚预案。

### 如果前端 Netlify 部署坏了

优先操作：

1. 在 Netlify 找到上一个成功 deployment。
2. 回滚 / redeploy 到上一个稳定版本。
3. 确认前端页面能打开。
4. 重新跑前端 smoke：
   - 注册
   - 登录
   - 创建 Project
   - 创建 Todo
   - 退出
   - 再登录

如果回滚后恢复，说明问题大概率在前端代码、前端构建或 Netlify 环境变量。

然后再本地复现和修复，不要在线上继续试错。

### 如果后端 Railway 部署坏了

优先判断是哪类问题：

1. `/health` 是否成功？
2. `/ready` 是否成功？
3. Railway logs 是否有启动异常？
4. API 失败时是否有 `X-Request-Id`？

如果是环境变量错误：

- 修正 Railway 环境变量
- 重新部署
- 再跑 `/health`、`/ready` 和 API smoke

如果是代码错误：

- 优先 redeploy Railway 上一个成功版本
- 或回退代码后重新部署
- 回滚后重新跑后端 smoke 和前端 smoke

如果服务已经影响核心链路，不要长时间在线上调试。

先恢复到可用版本，再在本地或测试环境分析。

### 如果数据库 migration 出问题

这是最需要谨慎的场景。

我不会直接盲目回滚代码。

我会先判断：

- migration 是否已经执行成功
- 表结构是否已经改变
- 是否有用户在新结构下写入数据
- 是否有数据丢失风险
- 是否有备份

如果只是 migration 没执行导致新代码报错，可能可以执行 migration 或回滚代码。

如果 migration 已经改变结构甚至影响数据，就要先备份，再制定修复方案。

这类问题的原则是：

    前端和后端代码可以较快回滚。
    数据库变更必须先保护数据。

### 当前项目的实际恢复顺序

当前项目如果线上坏了，我会按这个顺序恢复：

1. 判断是否影响核心路径。
2. 如果前端坏，先回滚 Netlify。
3. 如果后端进程坏，先看 Railway deployment 和 `/health`。
4. 如果依赖坏，先看 `/ready`、`DATABASE_URL` 和 MySQL。
5. 如果 API 500，拿 `X-Request-Id` 查 Railway logs。
6. 如果短时间不能修复，回滚到上一个成功部署。
7. 回滚后必须重新跑 smoke，确认恢复成功。

### 回滚后的复盘问题

回滚不是结束。回滚只是先恢复服务。

恢复后我还要补一次小复盘：

1. 这次问题是代码、配置、数据库、部署平台，还是测试缺口？
2. checklist 里有没有本来可以提前发现它的项目？
3. 如果有，为什么这次没发现？
4. 如果没有，是否要把它补进 checklist？
5. 是否需要补测试、补文档、补 smoke，还是补自动化？

这样 checklist 会随着真实问题变得越来越有用。

它不是一次写完就封存的文档，而是项目上线经验的积累。

最后我现在对部署稳定性的理解是：

    checklist 不是为了让上线变慢。
    checklist 是为了让上线变得可重复、可验证、可恢复。
