# Project 编辑删除线上 smoke

## 1. 这次线上验证了什么

这次线上 smoke 验证的是 Project 编辑 / 删除入口是否已经从“本地可用”进入“线上可用”。

验证对象不是单个按钮，而是完整线上链路：

```text
Netlify 前端
  -> 用户登录态
    -> Project 列表
      -> PATCH /projects/:id
      -> DELETE /projects/:id
        -> Railway API
          -> Railway MySQL
            -> Activity Log
              -> 前端状态刷新
```

这一轮的重点是确认：

- 线上页面能看到 Project 编辑 / 删除入口
- 线上可以编辑 Project name / description
- 编辑成功后列表能展示新内容
- 删除前取消不会误删数据
- 删除确认后 Project 会从列表消失
- 删除当前选中 Project 后，Todo / Activity Log 不会残留旧数据
- 整个过程中没有出现需要排查的线上错误

这一步完成后，Project 工作台的主生命周期已经比较完整：

```text
创建 Project
  -> 查看 Project
  -> 编辑 Project
  -> 删除 Project
```

这也说明前面做的部署稳定性 checklist、Request ID、线上 smoke 这些能力不是孤立练习，而是已经开始服务真实功能上线。

## 2. Project 编辑在线上是否正常

Project 编辑在线上验证通过。

这说明当前线上版本至少打通了这条路径：

```text
点击编辑
  -> 进入 inline edit 状态
  -> 修改 name / description
  -> 点击保存
  -> 前端发送 PATCH /projects/:id
  -> 后端更新 Project
  -> 前端刷新 Project 列表
```

这里最有价值的点不是“PATCH 请求能成功”本身，而是用户视角的结果是对的：

```text
保存后，列表里看到的是更新后的 Project。
```

这说明 UI 状态和后端数据没有脱节。

如果只看 Network 成功，但页面还显示旧名称，那仍然是体验上的失败。

这一轮线上 smoke 通过，说明当前实现已经满足第一版 Project 编辑能力。

## 3. Project 删除取消是否正常

Project 删除取消路径验证通过。

删除功能有一个很容易被忽略的分支：

```text
用户点了删除
  -> 但在确认框里选择取消
```

这个分支必须保证：

- 不发送真正的删除动作，或者即使有 UI 交互也不能造成数据变化
- Project 仍然留在列表里
- 当前选中状态不应被错误清空
- Todo / Activity Log 不应因为取消删除而重置

这次线上 smoke 已经覆盖取消路径，说明删除入口不是“点了按钮就立刻删”的危险实现。

这一点很重要。

删除功能的第一原则不是“删得快”，而是：

```text
用户明确确认之前，不要破坏数据。
```

## 4. Project 删除确认是否正常

Project 删除确认路径验证通过。

确认删除后，Project 会从列表中消失，说明线上这条链路已经打通：

```text
点击删除
  -> confirm 确认
  -> 前端发送 DELETE /projects/:id
  -> 后端删除 Project
  -> 前端刷新 Project 列表
```

这意味着前端不只是“乐观地把 Project 从列表里拿掉”，而是能和线上后端删除接口配合完成一次真实数据变更。

这类功能上线后最怕两种问题：

```text
前端显示删除成功，但后端其实失败了
后端删除成功，但前端还残留旧 Project
```

这次 smoke 通过，说明当前线上表现没有出现这两类状态错位。

## 5. 删除当前选中 Project 后页面状态是否合理

删除当前选中 Project 后，页面状态是合理的。

正确状态应该是：

```text
selectedProjectId = null
Todo 回到未选择 Project 状态
Activity Log 回到未选择 Project 状态
```

原因是：

```text
被删除的 Project 已经不存在。
页面不能继续拿这个 projectId 去展示 Todo 或 Activity Log。
```

如果这里没有处理好，用户会看到一种很别扭的状态：

```text
左侧 Project 已经没了
右侧却还显示它的 Todo / Activity Log
```

更糟的是，后续操作可能继续带着一个已经删除的 projectId 发请求。

这次线上 smoke 能确认页面没有残留已删除 Project 的数据，说明之前补的 `resetTodos()` 和 `resetActivityLogs()` 在线上行为里是有价值的。

这是一类典型前端状态一致性问题。

CRUD 功能做到后面，难点往往不在“发请求”，而在：

```text
数据变化之后，页面里所有依赖这份数据的状态都要一起收口。
```

## 6. Activity Log 是否符合预期

Activity Log 在线上表现符合当前阶段预期。

编辑 Project 时，因为 Project 仍然存在，Activity Log 应该能展示更新类记录，例如：

```text
更新 Project
```

或者对应的中文 action 文案。

删除 Project 时，情况更特殊：

```text
Project 删除成功
  -> 当前 selectedProjectId 清空
  -> Activity Log 面板回到未选择状态
```

所以删除后不一定能继续在当前 Project 面板里看到 `project.deleted`。

这不是 bug，而是当前信息架构决定的：

```text
现在的 Activity Log 面板是 Project 详情的一部分。
Project 被删除后，就没有这个 Project 详情上下文了。
```

如果后续想让用户看到“某个 Project 被删除了”的历史记录，更合理的产品形态不是强行停留在已删除 Project 页面，而是新增：

```text
用户级 Activity Log
```

也就是不依赖某个仍然存在的 Project，而是从用户视角看所有操作历史。

当前阶段先不做这个，是合理取舍。

## 7. 如果失败，我看到了什么 requestId

本次线上 smoke 没有记录到需要排查的失败请求。

所以没有需要追踪的 `X-Request-Id`。

如果后续 Project 编辑 / 删除在线上失败，仍然按这个路径查：

```text
1. 打开浏览器 Network
2. 找到 PATCH /projects/:id 或 DELETE /projects/:id
3. 查看 status code
4. 查看 response body
5. 查看 response headers 里的 X-Request-Id
6. 去 Railway logs 搜同一个 requestId
7. 判断是鉴权、参数、后端异常、数据库异常，还是 CORS / 部署版本问题
```

这次没有 requestId 要记录，是一个好结果。

但排障路径保留在文档里，后面再遇到线上问题就不会慌。

## 8. 下一步还要优化什么

我建议下一步进入：

```text
Project 编辑删除体验优化
```

原因是 Project 编辑 / 删除主链路已经完成：

```text
本地实现
  -> 本地测试
  -> smoke 复盘
  -> 线上 smoke
```

下一步不急着再堆新业务功能。

更值得补的是把这个已经可用的功能打磨成更像产品的体验：

- 把浏览器 `confirm` 改成页面内确认
- 保存时显示 saving 状态，避免重复点击
- 删除时显示 deleting 状态，避免重复删除
- 编辑输入为空时给出更明确的提示
- 删除按钮在视觉上和普通按钮区分开
- 保存失败时保留用户输入，别让用户白填

这个方向的学习价值很高。

因为它会让你看到：

```text
功能可用
```

和：

```text
产品体验稳定、可理解、可恢复
```

之间还隔着一层很重要的前端工程。

所以我建议下一张任务是：

```text
docs/tasks/2026-06-28-web-project-edit-delete-experience-polish.md
```
