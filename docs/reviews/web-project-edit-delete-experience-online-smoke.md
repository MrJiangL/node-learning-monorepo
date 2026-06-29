# Project 编辑删除体验优化线上 smoke

## 1. 这次线上验证了什么

这次线上 smoke 验证的是 Project 编辑 / 删除体验优化是否已经真实跑在线上。

这轮优化不是新增后端能力，而是改了用户实际操作 Project 时的交互：

- 删除确认从浏览器原生 `confirm` 变成页面内确认区
- 取消删除不应该造成任何数据变更
- 确认删除才真正删除 Project
- 保存 Project 时应该有“保存中...”反馈
- 删除 Project 时应该有“删除中...”反馈
- 删除按钮和确认删除按钮应该更像危险操作
- 删除当前选中 Project 后，Todo / Activity Log 状态应该仍然合理

这次线上 smoke 说明这条链路已经完成验证：

```text
Netlify 前端新版本
  -> 页面内 Project 编辑 / 删除交互
    -> Railway API
      -> Railway MySQL
        -> Project 列表 / Todo / Activity Log 状态刷新
```

这一步很重要。

因为体验优化虽然看起来是“前端小交互”，但它包裹的是 Project 编辑 / 删除这种真实数据变更。

只在本地通过还不够，在线上确认一次才算闭环。

## 2. 页面内删除确认在线上是否正常

页面内删除确认在线上验证通过。

现在点击 Project 的“删除”后，预期看到的是当前 Project item 内出现确认区：

```text
确定删除这个 Project 吗？
确认删除
取消删除
```

而不是浏览器原生 `confirm`。

这说明 Netlify 已经部署到了包含体验优化的新前端版本。

这个细节其实也是一个很好的线上版本判断点：

```text
如果线上仍然弹浏览器 confirm，说明用户看到的不是最新构建。
```

现在页面内确认能在线上出现，说明前端资源版本、路由页面和组件实现都已经更新成功。

## 3. 取消删除在线上是否正常

取消删除在线上验证通过。

正确行为是：

```text
点击删除
  -> 出现确认区
点击取消删除
  -> 确认区消失
  -> Project 仍然存在
  -> 不触发 DELETE 请求
```

取消删除是删除功能里非常关键的一半。

删除功能不是只有“确认删除”才重要。

用户很多时候会误点、犹豫、或者只是想看看会发生什么。

取消路径做对，才能让删除操作变得不那么吓人：

```text
用户有机会后悔。
```

这次线上验证通过，说明当前删除确认不是“点删除就删”的危险交互。

## 4. 确认删除在线上是否正常

确认删除在线上验证通过。

正确链路是：

```text
点击确认删除
  -> 前端发送 DELETE /todos? 不对，这里是 DELETE /projects/:id
  -> Railway API 删除 Project
  -> 前端刷新 Project 列表
  -> 被删除的 Project 从列表消失
```

这里要特别注意接口对象：

```text
Project 删除调用的是 DELETE /projects/:id。
Todo 删除调用的是 DELETE /todos/:id。
```

本次 smoke 验证的是 Project 删除。

确认删除成功后，Project 从列表消失，说明线上前后端链路正常：

```text
ProjectListPanel emit deleteProject
  -> ProjectsPage handleDeleteProject
    -> useProjects.deleteProjectFromList
      -> API client DELETE /projects/:id
        -> Railway API
          -> 刷新 Project 列表
```

如果删除的是当前选中的 Project，页面还应该清空选中状态，并让 Todo / Activity Log 回到未选择状态。

这次线上验证通过，说明体验优化没有破坏原来已经做好的状态收口。

## 5. 保存中 / 删除中状态是否符合预期

保存中 / 删除中状态符合当前阶段预期。

这里要注意一个现实情况：

```text
如果线上网络很快，“保存中...”或“删除中...”可能只是一闪而过。
```

这不一定是 bug。

loading 状态的价值在于：

```text
请求慢的时候，用户能知道操作正在进行；
请求进行中时，按钮会 disabled，减少重复点击。
```

所以判断 loading 状态是否有效，不能只看它是不是长期停留在页面上。

更准确的判断是：

- 代码路径里有 `savingProjectId`
- 代码路径里有 `deletingProjectId`
- 请求期间按钮会 disabled
- 文案会切换为“保存中...” / “删除中...”
- 请求结束后状态会清空

当前本地测试已经覆盖这些行为，线上 smoke 也没有发现交互回归。

所以这一项符合预期。

## 6. 如果失败，我看到了什么 requestId

本次线上 smoke 没有记录到需要排查的失败请求。

所以没有需要追踪的 `X-Request-Id`。

如果后续线上 Project 编辑 / 删除失败，仍然按这个路径查：

```text
1. 打开浏览器 DevTools
2. 切到 Network
3. 找到 PATCH /projects/:id 或 DELETE /projects/:id
4. 看 status code
5. 看 response body
6. 看 response headers 里的 X-Request-Id
7. 去 Railway logs 搜同一个 requestId
8. 判断是前端参数、鉴权、后端异常、数据库异常，还是部署版本问题
```

这次没有 requestId 要记录，是一个好结果。

但这条排障路径要继续保留。

因为 Project 编辑 / 删除属于真实数据操作，一旦失败，`X-Request-Id` 是把浏览器现象和 Railway 后端日志串起来的关键线索。

## 7. 下一步还要优化什么

Project 编辑 / 删除这条主线目前已经走完了一个非常完整的闭环：

```text
实现功能
  -> 本地测试
  -> 本地 smoke 复盘
  -> 线上 smoke
  -> 体验优化
  -> 体验优化本地 smoke 复盘
  -> 体验优化线上 smoke
```

所以我不建议继续在 Project 编辑 / 删除上马上做更复杂能力，比如 undo、软删除、二次 modal、批量删除。

这些当然可以做，但现在主线更适合回到 Todo。

我建议下一阶段选择：

```text
Todo dueDate 展示和编辑
```

理由是：

- 后端和 shared 类型里已经有 `dueDate`
- API smoke 里已经验证过 Todo dueDate 更新和清空
- 前端 TodoPanel 目前只展示 title / completed
- `useTodos.saveTodoTitle` 目前只更新 title，还没有把 dueDate 接进去
- 做 dueDate 可以继续练表单、日期输入、PATCH 局部更新和展示格式化

更重要的是，Todo 的 dueDate 是一个真实产品里很自然的字段。

做完后，Todo 就会从：

```text
只有标题和完成状态
```

进一步变成：

```text
有标题、完成状态、截止日期
```

这是比继续打磨 Project 删除更有产品主线价值的一步。

下一张任务建议进入：

```text
docs/tasks/2026-06-28-web-todo-due-date-display-edit.md
```
