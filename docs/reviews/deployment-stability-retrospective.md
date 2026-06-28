# 部署稳定性阶段复盘

## 1. 这一阶段我完成了什么

这一阶段我完成的是“部署稳定性”这层能力的整理。

前面项目已经能跑在线上：

```text
Netlify 前端
  -> Railway API
    -> Railway MySQL
```

也已经有了基础排障能力：

- `/health`
- `/ready`
- request logger
- error handler 日志
- Request ID
- 浏览器 Network 到 Railway logs 的排查路径

这一阶段我在这个基础上补了一份部署稳定性 checklist：

```text
docs/reviews/deployment-stability-checklist.md
```

它把上线流程拆成了：

- 部署前检查
- 后端 Railway 部署后验证
- 前端 Netlify 部署后验证
- 数据库和环境变量检查
- 线上 smoke 顺序
- 失败时继续排查还是回滚的判断
- 当前项目的手动回滚预案
- 发布记录模板
- smoke 结果记录模板
- P0 / P1 / P2 故障分级
- Go / No-Go 判断
- 回滚后的复盘问题

这一阶段让我从：

```text
我知道怎么部署
```

往前走了一步，变成：

```text
我知道上线前怎么检查、上线后怎么验证、坏了以后怎么恢复。
```

这是从“能上线”到“能维护上线流程”的变化。

## 2. 部署前 checklist 解决了什么问题

部署前 checklist 解决的是：

    上线前不要只靠记忆。

很多线上问题不是因为代码特别复杂，而是因为一些简单事情漏了：

- 测试没跑
- 类型检查没跑
- 前端没有 build
- Railway 环境变量缺失
- Netlify API 地址还指向 localhost
- CORS 没包含线上前端域名
- Prisma schema 改了但 migration 状态不清楚

checklist 的作用就是把这些容易漏掉的事情显式化。

它不是为了让上线变慢，而是为了挡住最便宜、最常见、最不该发生的问题。

我现在会把部署前检查分成几层：

```text
代码层：test / typecheck / format / build
配置层：Railway 和 Netlify 环境变量
数据库层：schema / migration / 数据风险
验证层：上线后 smoke 怎么跑
```

这让我明白：

    部署稳定性不是某一个工具。
    部署稳定性是一套上线前后的习惯。

## 3. 线上 smoke 解决了什么问题

线上 smoke 解决的是：

    部署后关键用户路径有没有断。

checklist 更偏上线前和上线中的检查。

smoke 是上线后的真实验证。

比如 checklist 可以确认：

- 本地测试通过
- 环境变量看起来正确
- 前端构建成功
- 后端部署成功

但这些都不能完全证明真实用户路径可用。

所以 smoke 要真的走一遍：

1. 打开 Netlify 前端
2. 注册新账号
3. 自动进入 `/projects`
4. 创建 Project
5. 创建 Todo
6. 切换 Todo completed
7. 退出登录
8. 重新登录
9. 刷新页面确认状态正常

这条路径同时验证了：

- 前端部署
- API base URL
- CORS
- 注册
- 登录
- token 保存和携带
- Project API
- Todo API
- MySQL 持久化
- 路由守卫

我现在对 checklist 和 smoke 的区别是：

```text
checklist 更像“出门前检查有没有带钥匙”。
smoke 更像“到了目的地以后确认门真的能打开”。
```

两者都需要。

只做 checklist，可能部署后才发现真实路径断了。

只做 smoke，不做 checklist，则会把太多本来能提前挡住的问题带到线上。

## 4. /health、/ready、requestId 在部署验证里分别怎么用

`/health`、`/ready` 和 requestId 不是互相替代关系。

它们解决的是不同层级的问题。

### /health

`/health` 用来确认：

```text
API 进程是否活着。
```

如果 `/health` 都失败，说明问题可能在：

- Railway deployment
- start command
- 端口配置
- server 启动
- 进程崩溃

它是最基础的生命体征检查。

### /ready

`/ready` 用来确认：

```text
API 的关键依赖是否准备好。
```

当前项目最重要的依赖是 MySQL。

如果 `/health` 成功但 `/ready` 失败，说明 Express 进程可能活着，但业务依赖不正常。

这时优先看：

- `DATABASE_URL`
- Railway MySQL 状态
- Prisma 连接错误
- migration 状态

### requestId

requestId 用来确认：

```text
某一次具体失败请求在后端发生了什么。
```

它不是 health check，也不是 readiness check。

它的价值是在 smoke 或用户操作失败时，把浏览器 Network 里的失败请求和 Railway logs 里的日志串起来。

所以它们可以组成一条排查阶梯：

```text
进程是否活着 -> /health
依赖是否可用 -> /ready
单次请求为什么失败 -> X-Request-Id
```

这个分层很重要。

如果一上来就看 requestId，但服务其实 `/health` 都失败了，就会查错方向。

如果 `/health` 和 `/ready` 都正常，但某个 API 500，那 requestId 才是更精确的线索。

## 5. 回滚预案解决了什么问题

回滚预案解决的是：

    线上坏了以后，怎么先恢复服务。

以前我容易把“回滚”理解成失败。

现在我更应该把它理解成一种恢复手段。

当问题只是非核心体验问题，比如文案、样式、局部空状态，可以继续排查。

但如果影响核心链路，就不应该一直在线上慢慢调：

- 无法注册
- 无法登录
- 无法创建 Project
- 无法创建 Todo
- 大量 500
- `/health` 失败
- `/ready` 失败且短时间无法修复
- 服务反复重启
- 有数据写错风险

这些场景应该优先恢复服务。

当前项目的回滚思路是：

- 前端坏了：优先回滚 Netlify 到上一个成功 deployment。
- 后端坏了：优先 redeploy Railway 上一个成功版本，或回退代码后重新部署。
- 配置错了：修正环境变量后重新部署，并重新跑 `/health`、`/ready` 和 smoke。
- 数据库 migration 出问题：不要盲目回滚代码，先保护数据。

这里的核心原则是：

```text
核心链路坏了，恢复优先。
非核心问题，定位优先。
```

回滚后也不能算结束。

还要复盘：

- 这次 checklist 能不能提前发现问题？
- smoke 有没有覆盖这个路径？
- 是否需要补测试？
- 是否需要补文档？
- 是否需要补自动化？

这样回滚才会变成学习，而不是只是一场惊魂未定的救火。

## 6. 为什么数据库 migration 不能简单回滚

数据库 migration 不能简单回滚，是因为数据库里有真实状态和真实数据。

代码回滚通常比较直接：

```text
回到上一个 commit
重新部署
```

但数据库不一样。

如果 migration 已经执行，它可能已经：

- 新增字段
- 删除字段
- 修改字段类型
- 修改索引
- 修改外键关系
- 改变唯一约束
- 写入或迁移已有数据

这时候简单回滚代码，不一定能恢复系统。

甚至可能出现：

```text
旧代码不认识新表结构。
新表结构已经丢失旧字段。
用户已经写入了新格式数据。
```

所以涉及数据库时，我要先判断：

1. migration 是否已经执行？
2. 表结构是否已经改变？
3. 是否有数据被写入？
4. 是否有数据丢失风险？
5. 是否有备份？
6. 是否可以通过兼容代码修复，而不是直接回滚？

这里最重要的结论是：

```text
代码回滚不等于数据库回滚。
```

部署稳定性里最需要谨慎的不是前端样式，也不是普通 API 代码，而是会改变生产数据结构的 migration。

## 7. 当前部署流程还缺什么

当前部署流程已经有了手动 checklist 和手动 smoke，但还缺几层自动化和系统化能力。

### 缺自动化质量门禁

现在我知道部署前要跑：

- API test
- Web test
- typecheck
- format check
- web build

但它们还主要依赖人手动执行。

后续可以考虑用 GitHub Actions 自动跑这些检查。

### 缺自动化线上 smoke

现在 smoke 是手动操作浏览器。

后续可以考虑把核心链路做成脚本：

- 注册测试账号
- 登录
- 创建 Project
- 创建 Todo
- 清理测试数据

这样部署后可以更快验证。

### 缺外部 uptime monitor

当前 `/health` 和 `/ready` 已经有了，但还没有外部系统定时访问它们。

也就是说，服务挂了以后，仍然可能需要我主动发现。

### 缺结构化发布记录

现在 release 记录模板有了，但还没有真正形成固定习惯。

后续每次重要上线都应该记录：

- 上线内容
- 部署版本
- 是否涉及 migration
- smoke 结果
- 是否出现异常

### 缺自动回滚能力

当前回滚还是手动预案。

这对学习阶段没问题，但真实团队里可能还会有更明确的自动化和权限流程。

不过我现在不急着补这些。

因为当前项目更需要进入下一轮业务功能，用已经建立起来的上线流程去护航真实功能迭代。

## 8. 下一阶段我选择什么

我选择 B：回到业务功能。

原因是：

我已经连续完成了几层生产化能力：

- 线上部署
- 前后端联调
- 前端 smoke
- Request ID
- 线上错误定位
- 生产化监控复盘
- 部署稳定性 checklist
- 回滚预案

这些能力已经能支撑下一轮真实功能开发。

如果现在继续做部署自动化，也有价值，但学习节奏会有点偏基础设施。

我更适合先回到业务功能，做一个能被用户看到的功能，然后再用现在的部署稳定性流程去验证它。

下一阶段我选择：

```text
Activity Log 前端展示
```

原因是 Activity Log 后端已经有基础能力：

```text
GET /projects/:projectId/activity-logs
```

而前端现在还没有把它展示出来。

这会是一个很好的业务功能练习：

- 复用已有 API client 模式
- 练习新的 composable
- 练习新的展示组件
- 理解 Project / Todo 操作如何变成用户可见的动态流
- 把后端审计日志变成产品体验

这一步会把项目从：

```text
用户能创建 Project 和 Todo
```

推进到：

```text
用户能看到这个 Project 发生过什么。
```

而且做完后，还可以用部署 checklist 和线上 smoke 验证它。

这就是更接近真实项目的节奏：

```text
做业务功能 -> 测试 -> 部署 -> smoke -> 复盘
```
