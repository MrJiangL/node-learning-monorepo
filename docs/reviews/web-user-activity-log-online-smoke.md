# 用户级 Activity Log 前端入口线上 smoke

## 1. 这次部署验证了什么

这次线上 smoke 验证的是：

```text
用户级 Activity Log 前端入口是否已经能在线上真实环境可用。
```

它不是只验证一个组件能不能渲染，而是验证整条线上链路：

```text
Netlify 前端
  -> Railway API
    -> Railway MySQL
      -> 用户级 Activity Log 数据
```

这次验证完成后，可以认为用户级 Activity Log 已经从“本地功能”进入了“线上可用功能”阶段。

## 2. 线上是否能看到“我的最近操作”

线上 `/projects` 页面已经可以看到“我的最近操作”入口。

这个入口的产品意义是：

```text
用户不用先选中某一个 Project，也能查看自己最近做过什么。
```

这和 Project 级 Activity Log 形成了互补：

- Project 级入口回答：这个 Project 发生了什么？
- 用户级入口回答：我最近做了什么？

现在两个视角都已经有线上入口。

## 3. GET /activity-logs 是否正常

线上 smoke 已经完成，说明前端入口可以调用用户级 Activity Log API。

这条 API 的关键点是：

```text
GET /activity-logs
```

它应该使用当前登录 token 识别用户，而不是从 query 或 body 里信任客户端传入的 `userId`。

这次线上 smoke 的价值在于确认：

- Netlify 前端已经部署到包含用户级入口的版本
- 前端能携带登录态访问后端
- Railway API 已经包含 `GET /activity-logs`
- CORS、鉴权、路由和数据库查询链路在线上能跑通

## 4. 最近操作是否能展示中文 action 和格式化时间

用户级 Activity Log 复用了已有展示 helper。

所以线上展示应该具备：

- action 中文文案
- 格式化后的时间
- 日志 message
- Project 快照名或兜底文案

这说明之前做的 Activity Log 体验优化不是只服务 Project 级面板，也可以复用到用户级入口。

这里的设计方向是对的：

```text
后端 action 保持稳定枚举。
前端负责把枚举翻译成用户能读懂的文案。
```

## 5. 如果失败，我看到了什么 requestId

这次线上 smoke 已完成，没有记录需要排查的失败 requestId。

后续如果 `GET /activity-logs` 在线上失败，优先按状态码定位：

- `401`：检查登录态和 Authorization header
- `404`：检查 Railway 后端是否部署了用户级 Activity Log API
- `500`：从响应头拿 `X-Request-Id`，去 Railway logs 搜同一个 requestId

Request ID 的价值是把浏览器里的失败请求和后端日志串起来。

这条能力之前已经打好，现在可以继续作为线上排障的默认动作。

## 6. 下一步还要优化什么

下一步建议先做：

```text
用户级 Activity Log 体验优化
```

原因是线上链路已经打通，接下来应该让这个入口更顺手。

优先级比较高的优化是：

- Project / Todo 操作成功后，自动刷新用户级最近操作
- 空状态文案更具体
- 错误状态提示用户可以重试
- 用户级入口和 Project 级入口在视觉层级上更清楚

暂时不急着做 metadata 展示。

metadata 展示会更深入，但也会带来更多展示规则。当前更适合先把用户级入口的基础体验磨顺。
