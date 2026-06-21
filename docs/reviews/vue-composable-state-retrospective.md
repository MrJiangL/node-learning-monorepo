# Vue Composable State Retrospective

## 当前结构

`ProjectsPage` 现在负责把页面上的几块逻辑接起来：

- 调用 `useProjects()`，拿到 Project 列表状态和 Project 操作方法
- 调用 `useTodos()`，拿到 Todo 列表状态和 Todo 操作方法
- 保存 `selectedProjectId`，表示当前页面选中了哪个 Project
- 把 `projectListState` 和 `selectedProjectId` 传给 `ProjectListPanel`
- 把 `todoListState` 和 `selectedProjectId` 传给 `TodoPanel`
- 接收子组件 emit 出来的事件，再把参数转交给 composable
- 处理退出登录和路由跳转

`ProjectListPanel` 现在负责 Project 区域的展示和用户输入：

- 根据 `projectListState` 显示空状态、错误状态、Project 列表
- 根据 `selectedProjectId` 显示某个 Project 是否已选择
- 收集创建 Project 的表单输入
- 通过 `emit("loadProjects")` 通知父组件加载 Project
- 通过 `emit("selectProject", project.id)` 通知父组件选择 Project
- 通过 `emit("createProject", input)` 通知父组件创建 Project
- 通过 `emit("logout")` 通知父组件退出登录

`TodoPanel` 现在负责 Todo 区域的展示和用户输入：

- 根据 `selectedProjectId` 判断是否显示 Todo 创建表单
- 根据 `todoListState` 显示加载状态、错误状态、空状态、Todo 列表
- 管理 Todo 创建输入框的临时内容
- 管理当前正在编辑的 Todo id 和编辑中的标题
- 通过 `emit("createTodo", input)` 通知父组件创建 Todo
- 通过 `emit("toggleTodo", todo)` 通知父组件切换 Todo 完成状态
- 通过 `emit("saveTodoTitle", todoId, input)` 通知父组件保存 Todo 标题
- 通过 `emit("deleteTodo", todoId)` 通知父组件删除 Todo

`useProjects` 现在负责 Project 业务状态和 Project API：

- 保存 `projectListState`
- 从本地读取 token
- token 不存在时设置错误状态
- 调用 `fetchProjects`
- 调用 `createProject`
- 创建成功后重新加载 Project 列表
- 捕获 API 错误并转换成页面能展示的错误状态

`useTodos` 现在负责 Todo 业务状态和 Todo API：

- 保存 `todoListState`
- 从本地读取 token
- token 不存在时设置错误状态
- 在 Project 未选择时设置错误状态
- 调用 `fetchTodos`
- 调用 `createTodo`
- 调用 `updateTodo`
- 调用 `deleteTodo`
- 创建、更新、删除成功后重新加载当前 Project 下的 Todo 列表
- 捕获 API 错误并转换成页面能展示的错误状态

## 页面状态

### selectedProjectId 为什么还留在 ProjectsPage？

`selectedProjectId` 不只是 Todo 的状态，它是整个 Project 工作台页面的选择状态。

它同时影响两块 UI：

- `ProjectListPanel` 需要它来判断哪个 Project 按钮显示“已选择”
- `TodoPanel` 需要它来判断是否显示 Todo 创建表单

所以它更适合留在 `ProjectsPage`。页面组件的职责不是完全没有状态，而是保留那些负责“页面编排”的状态。

### 如果把 selectedProjectId 放进 useTodos，会有什么问题？

如果把 `selectedProjectId` 放进 `useTodos`，Todo 逻辑会变得好像更集中，但边界会变模糊。

主要问题有三个：

- `ProjectListPanel` 也需要知道哪个 Project 被选中，这样 `useTodos` 就会开始影响 Project 区域
- `useTodos` 会从“Todo 业务模块”变成“页面选择状态模块”
- 以后如果页面增加别的区域也依赖当前 Project，大家都要去问 `useTodos`，命名和职责都会变奇怪

所以更清晰的做法是：`selectedProjectId` 留在页面，`useTodos` 的函数通过参数接收当前 Project id。

## Composable

### useProjects 为什么适合管理 projectListState？

`projectListState` 和 Project API 强相关。

加载 Project 时需要：

- 读取 token
- 处理未登录
- 设置 loading
- 请求后端
- 设置 success
- 捕获错误并设置 error

这些逻辑如果都放在页面里，页面会越来越胖，而且 Project 业务逻辑会散落在模板附近。放进 `useProjects` 后，页面只需要知道：

```ts
const { projectListState, loadProjects, createProjectFromInput } = useProjects();
```

这让页面更像“组装器”，而不是所有业务细节的堆放处。

### useTodos 为什么每个动作都需要 projectId？

Todo 是 Project 的子资源。

后端接口本身就是这样设计的：

```text
GET /projects/:projectId/todos
POST /projects/:projectId/todos
```

即使 `PATCH /todos/:id` 和 `DELETE /todos/:id` 不把 `projectId` 放在 URL 里，前端更新或删除成功后也需要重新加载“当前 Project 下的 Todo 列表”。所以 `useTodos` 的这些动作都需要知道当前 Project 是谁。

这也是为什么 `projectId` 作为参数传进去比较好：它让 `useTodos` 不直接拥有页面选择状态，但仍然能完成 Todo 业务动作。

### 创建、更新、删除 Todo 后为什么重新 loadTodos？

重新加载列表是为了让前端展示的数据重新来自后端数据库，而不是前端自己猜。

比如切换完成状态时，前端可以手动把数组里的 `completed` 改成相反值，但这样会带来几个问题：

- 如果后端更新失败，前端可能显示了错误状态
- 如果后端对数据做了额外处理，前端本地状态可能和数据库不一致
- 如果列表未来有排序、分页、过滤，本地手动改数组会越来越复杂

当前学习阶段用“操作成功后重新加载列表”最直观，也最稳。

## 组件测试

### ProjectListPanel 测试为什么不请求后端？

因为 `ProjectListPanel` 的职责不是请求后端。

它只负责：

- 接收 `projectListState`
- 根据 props 渲染 UI
- 收集表单输入
- emit 事件给父组件

如果组件测试里请求后端，就把组件测试、composable、API client、后端服务混在一起了。这样测试失败时，很难判断到底是组件坏了，还是 API 坏了。

### TodoPanel 测试为什么断言 emit，而不是断言数据库变化？

`TodoPanel` 不知道数据库，也不应该知道数据库。

用户点击“标记完成”时，`TodoPanel` 的责任只是：

```ts
emit("toggleTodo", todo);
```

至于这个事件会不会调用 `updateTodo`，会不会修改数据库，那是父组件、`useTodos` 和后端测试负责的事情。

组件测试断言 emit，正好对应了组件自己的职责边界。

### wrapper.text() 和 wrapper.emitted() 分别在验证什么？

`wrapper.text()` 验证的是“用户能不能看到正确内容”。

例如 Project 名称、Project 描述、按钮文字、Todo 标题，都可以通过 `wrapper.text()` 检查。

`wrapper.emitted()` 验证的是“组件有没有向父组件发出正确事件”。

例如：

```ts
wrapper.emitted("createProject");
wrapper.emitted("createTodo");
wrapper.emitted("toggleTodo");
```

这类断言关注的是组件和父组件之间的通信合同。

## 我的判断规则

以后遇到一段 Vue 逻辑，可以先这样判断：

1. 如果这段逻辑只影响一个子组件内部的 UI，比如输入框内容、编辑模式、弹出提示，就放在子组件。
2. 如果这段逻辑会影响多个子组件的协作，比如当前选中的 Project，就放在页面组件。
3. 如果这段逻辑和某个业务资源的 API、loading、error、重新加载列表强相关，就放在 composable。

还有一个更简单的问题可以帮助判断：

```text
如果把这个逻辑拿走，哪个模块最不像自己？
```

如果拿走后子组件不知道怎么展示，就放子组件。
如果拿走后页面不知道怎么串联几个区域，就放页面。
如果拿走后业务动作和 API 状态散得到处都是，就放 composable。
