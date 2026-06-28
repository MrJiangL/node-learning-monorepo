# Project 编辑删除 smoke 和复盘

## 1. 这次我验证了什么

这次 smoke 复盘验证的是 Project 编辑 / 删除入口这一轮功能是否已经形成一个完整闭环。

这一轮不是只看按钮有没有出现，而是重点看这条链路是否成立：

```text
ProjectListPanel 用户操作
  -> emit 保存 / 删除事件
    -> ProjectsPage 编排当前选中状态
      -> useProjects 调用 API client
        -> 后端 PATCH / DELETE Project
          -> Activity Log 记录 project.updated / project.deleted
            -> 前端刷新 Project 列表和 Activity Log 状态
```

已经完成并通过本地自动化验证的部分包括：

- Project API client 支持 `PATCH /projects/:id`
- Project API client 支持 `DELETE /projects/:id`
- `useProjects` 支持保存 Project
- `useProjects` 支持删除 Project
- `ProjectListPanel` 支持 inline edit
- `ProjectListPanel` 支持删除前确认
- 删除当前选中的 Project 后，页面会清空选中状态
- Todo 和 Activity Log 会回到未选择 Project 的 idle 状态
- 相关前端单元测试、类型检查、格式检查和构建都已经通过

这说明这次功能在代码路径上是闭合的。

不过要注意一个边界：

```text
本次复盘确认的是本地实现和建议 smoke 路径已经收口。
真正线上环境里的 PATCH / DELETE / Activity Log 展示，还需要下一张线上 smoke 任务验证。
```

这是一个很重要的工程习惯：本地通过不等于线上通过，尤其是编辑和删除这种会改真实数据的功能。

## 2. Project 编辑入口解决了什么问题

Project 编辑入口解决的是“创建后不可修正”的问题。

在这之前，Project 工作台已经可以创建 Project，但一旦名字或描述写错，前端没有修改入口。

用户只能绕路：

```text
创建一个新 Project
  -> 重新建 Todo
  -> 旧 Project 留在列表里
```

这显然不符合真实产品使用方式。

现在有了编辑入口后，Project 的生命周期更完整：

```text
创建 Project
  -> 查看 Project
  -> 修改 Project name / description
  -> 继续围绕这个 Project 管理 Todo 和 Activity Log
```

这背后的学习点是：

```text
“更新”不是简单加一个 PATCH 请求。
它会牵动 UI 编辑态、表单临时状态、保存失败状态、列表刷新、当前选中项刷新，以及 Activity Log 重新加载。
```

这一轮实现里，`ProjectListPanel` 只负责展示和 emit，真正的请求仍然放在 composable / page 编排层，这个分层是合理的。

## 3. Project 删除入口解决了什么问题

Project 删除入口解决的是“无效 Project 无法清理”的问题。

在真实使用里，用户会创建测试 Project、误创建 Project，或者某个 Project 已经不再需要。

如果前端不能删除，那么 Project 列表会越来越乱。

现在删除入口补上后，Project 生命周期变成：

```text
创建
  -> 查看
  -> 编辑
  -> 删除
```

这让 Project 模块从“只读 + 新增”进入了真正的 CRUD 阶段。

这次删除入口先使用浏览器 `confirm`，这是一个适合当前阶段的选择：

- 实现成本低
- 可以先验证删除链路
- 不急着引入 modal 状态管理
- 后续仍然可以替换成页面内确认交互

也就是说，当前版本的删除确认不是最终体验，但足够作为第一版业务闭环。

## 4. 删除当前选中 Project 后页面状态是否合理

删除当前选中 Project 后，页面状态处理是合理的。

关键点是：

```text
如果被删除的 Project 正好是 selectedProjectId，
那么 selectedProjectId 必须清空。
```

否则页面会出现一种危险的“幽灵选中状态”：

```text
Project 已经不存在
  -> Todo 面板仍然以为有 Project 被选中
  -> Activity Log 面板仍然以为有 Project 被选中
  -> 后续请求可能打到一个已经删除的 projectId
```

这一轮已经处理了这个状态：

```text
删除当前 Project
  -> selectedProjectId = null
  -> resetTodos()
  -> resetActivityLogs()
```

这个设计的重点不是“清空页面”本身，而是把前端状态重新拉回一个真实世界里存在的状态：

```text
没有选中 Project，就不应该展示某个 Project 的 Todo 和 Activity Log。
```

这类状态收口非常重要。

很多前端 bug 不是 API 不通，而是删除、切换、失败之后页面还残留旧状态。

## 5. Activity Log 是否能记录 project.updated / project.deleted

从后端能力和这次前端接入路径来看，Project 编辑 / 删除应该能够触发对应 Activity Log：

```text
编辑 Project -> project.updated
删除 Project -> project.deleted
```

前端这一轮做对的一点是：

```text
保存当前 Project 后，会重新加载当前 Project 的 Activity Log。
```

这意味着用户编辑 Project 后，不需要刷新页面，就应该能看到“更新 Project”一类的日志。

删除 Project 稍微特殊一点。

如果删除的是当前选中的 Project，页面会清空选中状态，因此 Activity Log 面板会回到未选择状态。

这时候不能直接在已删除 Project 的面板里继续看日志，因为：

```text
Project 已删除
当前页面已经没有合法的 selectedProjectId
```

后续如果想更完整地展示 `project.deleted`，可以考虑做一个更高层级的 Activity Log 视图，例如：

```text
用户级 Activity Log
  -> 不依赖某个仍然存在的 Project
  -> 可以看到 Project 删除历史
```

但这不是当前阶段必须做的。

当前阶段最重要的是：

- Project 更新时能记录 `project.updated`
- Project 删除时后端能记录 `project.deleted`
- 前端删除后不会继续停留在已删除 Project 的状态里

下一张线上 smoke 会重点验证线上是否真的能看到这些行为。

## 6. 下一阶段我选择什么

我建议下一阶段选择：

```text
A. 部署上线和线上 smoke
```

原因很直接：

Project 编辑和删除属于用户可见、会修改真实数据的功能。

这种功能不适合只停在本地测试通过。

更稳的节奏是：

```text
本地功能完成
  -> 本地测试 / typecheck / build 通过
  -> 部署到 Netlify
  -> 在线上创建临时 Project
  -> 编辑它
  -> 验证 project.updated
  -> 取消删除一次
  -> 确认删除一次
  -> 验证页面状态收口
  -> 如失败，用 X-Request-Id 串到 Railway logs
```

这会把前面几轮学过的东西串起来：

- 前端业务功能
- 后端写接口
- Activity Log
- 线上部署
- smoke 验证
- Request ID 排障
- deployment checklist

所以这一步不是“又部署一次”。

它是在练一个更接近真实工作的节奏：

```text
只要一个线上数据变更功能上线，就要用 checklist 做一次可追踪的 smoke。
```

下一张任务建议进入：

```text
docs/tasks/2026-06-28-web-project-edit-delete-online-smoke.md
```
