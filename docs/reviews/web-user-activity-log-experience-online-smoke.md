# 用户级 Activity Log 体验优化线上 smoke

## 1. 这次部署验证了什么

这次线上 smoke 验证的是用户级 Activity Log 体验优化是否已经在线上环境生效。

重点不是单纯验证接口存在，而是验证交互时机：

```text
进入 /projects：
  不自动请求 GET /activity-logs

点击“加载最近操作”：
  请求 GET /activity-logs

已经加载过以后继续操作 Project / Todo：
  自动刷新用户级 Activity Log
```

这次线上 smoke 完成后，可以认为用户级 Activity Log 的体验优化已经完成闭环：

```text
本地实现
  -> 自动化测试
    -> 本地 smoke
      -> 线上 smoke
```

## 2. 线上是否没有首屏自动请求

线上验证的关键点之一是：

```text
初始进入 /projects 时，不应该自动请求 GET /activity-logs。
```

这个行为是合理的。

因为“我的最近操作”是辅助面板，不是 `/projects` 首屏必须数据。

首屏不自动请求的好处是：

- 减少不必要的线上 API 调用
- 避免用户还没关注最近操作时就加载全局日志
- 保持 ProjectsPage 的首屏职责更聚焦

当前设计表达的是：

```text
用户没有打开这个面板之前，它不抢请求。
```

## 3. 点击加载后 GET /activity-logs 是否正常

点击“加载最近操作”后，线上可以正常调用：

```text
GET /activity-logs
```

这说明：

- Netlify 已经部署包含体验优化的前端 bundle
- 前端事件绑定正常
- 登录态可以正常携带
- Railway API 仍然可以处理用户级 Activity Log 查询
- CORS 和鉴权链路仍然正常

这一步验证的是：

```text
用户主动表达“我要看最近操作”之后，系统能正确加载数据。
```

## 4. Project / Todo 操作后是否会自动刷新

用户已经加载过“我的最近操作”之后，Project / Todo 操作成功会自动刷新用户级日志。

这让“我的最近操作”从一个手动查询面板，变成更接近真实产品里的最近动态区域。

这个行为的边界也很重要：

```text
只有用户已经加载过它，才自动刷新。
```

也就是说：

- 没加载过：不产生额外请求
- 加载过：后续成功操作自动跟进

这个设计在体验和请求成本之间做了一个比较稳的平衡。

## 5. 文案在线上是否是新版

新版文案的重点是让用户更容易理解这个入口的作用。

idle 文案强调：

```text
跨 Project 的最近操作
```

empty 文案强调：

```text
创建 Project 或 Todo 后，这里会显示记录
```

error 文案强调：

```text
最近操作加载失败，可以稍后重试
```

这些文案比第一版更像产品提示，而不是只把状态告诉用户。

## 6. 如果失败，我看到了什么 requestId

这次线上 smoke 已完成，没有记录需要排查的失败 requestId。

后续如果线上出现问题，可以继续按之前建立的 Request ID 排查方式走：

- 浏览器 Network 看响应头里的 `X-Request-Id`
- Railway logs 搜同一个 requestId
- 对照请求路径、状态码和错误堆栈

常见定位顺序：

- `401`：检查登录态和 Authorization header
- `404`：检查 Railway 后端版本或 API 路由
- `500`：用 `X-Request-Id` 查服务端日志

## 7. 下一步还要优化什么

下一步建议进入：

```text
Activity Log metadata 前端展示
```

原因是用户级 Activity Log 到这里已经完成了：

- 后端查询 API
- 前端入口
- 本地 smoke
- 线上 smoke
- 体验优化
- 体验优化线上 smoke

下一步再继续优化 Activity Log，最有价值的是把日志内容从：

```text
发生了什么
```

推进到：

```text
具体改了什么
```

例如：

- Todo 标题是什么
- 哪些字段发生了变化
- dueDate 是否被修改
- completed 是否发生变化

这正好对应后端已经维护的 `metadata` 字段。
