# Activity Log 前端展示线上 smoke

## 1. 这次部署验证了什么

这次验证的是 Activity Log 前端展示和体验优化是否已经真正跑在线上。

线上地址：

```text
https://scintillating-pavlova-dc76e0.netlify.app/projects
```

截图里可以确认：

- 已经进入 `/projects` 页面
- Project 列表能加载
- 当前选中了 Project：`钱234`
- Todo 列表能加载
- 当前 Project 下有 Todo：`312312`
- Activity Log 面板能显示
- Activity Log 能显示 Project / Todo 的创建记录
- action 已经是中文文案
- 时间已经是格式化后的本地时间

这说明这条线上链路是通的：

```text
Netlify 前端
  -> Railway API
    -> Railway MySQL
      -> Activity Log API
        -> ActivityLogPanel 展示
```

这次 smoke 的核心不是“页面能打开”，而是确认一个新前端功能真的在线上生效。

## 2. 线上 Activity Log 是否能正常加载

能正常加载。

截图中 Activity Log 面板已经出现，并且展示了两条日志：

```text
创建了 Todo 312312
创建了项目 钱234
```

这说明：

- 前端已经部署了包含 ActivityLogPanel 的新版本
- 选中 Project 后，前端会请求 Activity Log
- 后端 Activity Log API 能返回数据
- 当前登录用户能读取自己 Project 下的 Activity Log
- Railway MySQL 里的日志数据能被正确读取

这里最关键的是：

```text
Activity Log 不只是本地测试通过，而是已经在线上真实数据里展示出来。
```

## 3. 中文 action 是否正常展示

中文 action 正常展示。

截图里可以看到：

```text
创建 Todo
创建 Project
```

这说明前端的 action 映射已经在线上生效。

之前原始 action 会是：

```text
todo.created
project.created
```

现在用户看到的是：

```text
创建 Todo
创建 Project
```

这一步很重要。

因为 `todo.created` 是开发者和系统能理解的枚举，而“创建 Todo”才是用户更容易读懂的产品文案。

当前线上表现符合预期：

```text
后端仍然返回稳定 action。
前端负责把 action 翻译成中文展示文案。
```

这个分层是对的。

## 4. 时间格式化是否正常展示

时间格式化正常展示。

截图里时间显示为：

```text
2026/06/28 19:53
```

它不是原始 ISO 字符串：

```text
2026-06-28Txx:xx:xx.000Z
```

这说明 `formatActivityLogTime` 在线上已经生效。

现在用户看到的是更自然的本地日期时间，而不是偏调试风格的机器时间。

这一点说明 Activity Log 已经从“把 API 数据原样显示出来”进一步变成了“面向用户展示”。

## 5. 如果失败，我看到了什么 requestId

这次截图里没有看到失败请求，也没有需要记录的 `X-Request-Id`。

所以本次 smoke 不需要进入 requestId 排障流程。

如果后续线上 Activity Log 请求失败，我会按这个顺序查：

1. 打开浏览器 Network。
2. 找到 `/projects/:projectId/activity-logs` 请求。
3. 看 status 是 401、404、500，还是 CORS error。
4. 看 response body。
5. 读取 response header 里的 `X-Request-Id`。
6. 去 Railway logs 搜同一个 requestId。
7. 如果有 error handler 日志，再看 errorName、errorMessage、stack。

这次 smoke 没走到这一步，是好事。

但排障路径已经清楚。

## 6. 下一步还要优化什么

Activity Log 这一轮已经完成了一个比较完整的小闭环：

```text
后端已有日志能力
  -> 前端展示 Activity Log
  -> action 中文化
  -> 时间格式化
  -> 线上 smoke 验证
```

下一步不建议继续在 Activity Log 上马上做分页、筛选、metadata 展示。

原因是：

当前 Activity Log 已经从“无”到“可用”，再到“线上可用”。

继续深挖当然可以，但项目主线更适合回到业务功能，让产品能力继续往前走。

我建议下一阶段选择：

```text
继续业务功能：Project 编辑 / 删除前端入口
```

理由是：

- 后端已经有 Project 更新 / 删除接口
- 前端目前能创建 Project，但不能编辑或删除 Project
- 这是 Project 工作台里很自然的下一步
- 做完后仍然可以继续用 Activity Log 验证 `project.updated` 和 `project.deleted`

也就是说，下一步业务功能还能反过来继续验证 Activity Log。

这比继续单独打磨 Activity Log 更有产品主线价值。
