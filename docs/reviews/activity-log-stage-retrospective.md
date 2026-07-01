# Activity Log 阶段总复盘

## 1. 这条功能线最终完成了什么

Activity Log 这条功能线最终完成了一条很完整的产品工程闭环。

它不只是“多一张日志表”，而是从后端业务事件一路走到了前端产品体验：

- 后端能记录 Project / Todo 操作
- Activity Log 有稳定的 action 类型
- metadata 有运行时 schema 约束
- Project 删除后仍然能通过快照读懂历史日志
- 支持 Project 级查询
- 支持用户级查询
- 前端有 Project 级 Activity Log 面板
- 前端有用户级“我的最近操作”入口
- action 显示成中文
- 时间格式化展示
- metadata 摘要展示
- changedFields 字段名中文化
- 完成了多轮本地 smoke 和线上 smoke

这条线最终解决的问题是：

```text
用户不只知道当前状态是什么，
还可以回看自己或某个 Project 最近发生了什么。
```

这让应用从“状态管理”进一步变成“状态 + 历史解释”。

## 2. 后端 Activity Log 是怎么设计的

后端 Activity Log 的核心不是简单写入字符串，而是记录结构化业务事件。

一条日志至少包含：

- 谁做的：`userId`
- 做了什么：`action`
- 对哪个 Project 发生：`projectId`
- 当时 Project 的快照：`projectSnapshotId` / `projectSnapshotName`
- 给用户看的描述：`message`
- 给后续展示用的结构化上下文：`metadata`
- 什么时候发生：`createdAt`

这个设计的重点是：

```text
Activity Log 是业务事件，不是普通调试日志。
```

调试日志主要给开发者排查问题。

Activity Log 主要给用户和产品功能解释历史。

所以它必须稳定、可查询、可展示，并且尽量不因为业务实体变化而失去意义。

## 3. 为什么 Project 删除后还需要快照

Project 删除是这条线里很关键的设计点。

如果 Activity Log 只依赖当前还存在的 Project，那么 Project 一旦删除，历史日志就会失去上下文。

用户会看到一条日志，但不知道它原来属于哪个 Project。

所以后端保留了：

```text
projectSnapshotId
projectSnapshotName
```

这个设计让日志在 Project 删除后仍然能解释自己。

学习点是：

```text
业务实体可以删除。
历史事件不能只依赖当前实体是否还存在。
```

这也是审计日志、活动记录、操作历史这类功能常见的设计原则。

## 4. action / metadata schema 解决了什么问题

`action` 解决的是“发生了哪类事情”。

例如：

```text
project.created
project.updated
project.deleted
todo.created
todo.updated
todo.completed
todo.deleted
```

metadata 解决的是“这件事还有哪些上下文”。

例如：

```text
Todo：学习 dueDate
变更字段：标题、截止日期
```

如果 metadata 只是：

```ts
Record<string, unknown>;
```

短期能跑，但长期容易变成“谁都能塞任何东西”的口袋。

所以后端加了 metadata schema。

它的价值不是防用户乱传，因为 Activity Log 不是用户直接提交的资源。

它真正保护的是：

```text
我们自己的业务代码以后写错日志结构。
```

schema 把 action 和 metadata 绑定起来，让每类事件有自己的结构契约。

## 5. 查询 API 为什么分 Project 级和用户级

Project 级和用户级查询不是重复功能，而是两个不同视角。

Project 级查询回答：

```text
这个 Project 最近发生了什么？
```

它适合放在 Project 详情上下文里，让用户聚焦当前 Project 的历史。

用户级查询回答：

```text
我最近做了什么？
```

它适合做“我的最近操作”，让用户跨 Project 回看自己的行为。

这两个视角都重要。

Project 级更聚焦。

用户级更全局。

尤其在 Project 删除后，用户级 Activity Log 还能作为找回历史上下文的入口。

## 6. 前端展示是怎么一步步产品化的

前端展示是逐步产品化的。

第一版只是把数据接出来：

```text
message
action
createdAt
```

然后逐步优化：

1. action 从英文枚举变成中文文案
2. createdAt 从 ISO 字符串变成格式化时间
3. 增加用户级“我的最近操作”入口
4. 用户加载过最近操作后，Project / Todo 操作成功自动刷新
5. metadata 从结构化字段变成用户可读摘要
6. changedFields 从英文字段名变成中文字段名

这条路径很典型：

```text
先打通数据。
再让数据可读。
再让交互顺手。
最后让语言更像产品。
```

## 7. 线上 smoke 和 Request ID 排障给了我什么经验

这条线经历了多次线上 smoke。

线上 smoke 的意义是确认真实链路：

```text
Netlify 前端
  -> Railway API
    -> Railway MySQL
      -> Activity Log 数据
```

本地测试只能证明代码逻辑。

线上 smoke 才能证明：

- 前端部署的是最新 bundle
- API base URL 指向正确
- 登录 token 能正确携带
- CORS 正常
- Railway API 正常
- 数据库里真实数据能被展示
- 旧数据不会把页面打坏

Request ID 的经验也很重要。

如果线上失败，可以从浏览器响应头拿到 `X-Request-Id`，再去 Railway logs 搜同一个请求。

这让排障从“凭感觉猜”变成“沿着请求链路查”。

## 8. 如果重新做一遍，我会怎么设计

如果重新做一遍，我会仍然保留现在这条总体路径：

```text
后端模型
  -> 写入集成
    -> 查询 API
      -> Project 删除快照
        -> metadata schema
          -> 前端展示
            -> 用户级入口
              -> 体验优化
                -> 线上 smoke
```

但我会更早明确两件事：

第一，metadata 不只是“可选附加字段”。

它应该从一开始就被当成前端展示能力的一部分。

第二，Project 级和用户级查询可以更早一起规划。

因为它们本质上是同一类日志的两个产品视角。

先只做 Project 级没问题，但脑子里要提前留出用户级入口的位置。

## 9. 当前还可以继续优化什么

当前 Activity Log 已经够用，但还可以继续深挖：

- 展示修改前 / 修改后的值
- 把 changedFields 变成更自然的整句文案
- Activity Log 筛选 UI
- Activity Log 分页或无限滚动
- 用户级 Activity Log 独立页面
- 更多 action 类型
- 更细的 metadata 展示组件

但这些都属于更细的产品打磨。

以当前学习节奏看，Activity Log 已经完成了足够完整的一轮。

继续深挖的边际学习收益会变小。

## 10. 下一阶段我选择什么

下一阶段选择：

```text
A. 暂时收束 Activity Log，进入下一组业务功能
```

选择原因：

- Activity Log 已经完成从后端到前端的完整闭环。
- 多轮本地测试、本地 smoke、线上 smoke 都已经走过。
- 当前功能已经足够支撑真实产品里的“最近操作 / 操作历史”能力。
- 继续深挖会进入更细的展示打磨。
- 现在更值得进入下一组业务功能，继续扩大项目能力边界。

下一组业务功能建议选择：

```text
Todo priority 优先级展示和编辑
```

原因是它能继续复用之前学过的完整路径：

```text
后端字段
  -> API 入参和响应
    -> 前端表单
      -> 列表展示
        -> 测试
          -> smoke
```

同时它又比 Activity Log 更贴近普通业务功能，适合作为下一阶段的练习入口。
