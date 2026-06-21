# Vue Component Split Retrospective

## 1. 我拆出了哪些组件

这次我拆出了两个组件：

- `ProjectListPanel`：负责 Project 区域的展示、创建表单、Project 列表和选择按钮。
- `TodoPanel`：负责 Todo 区域的展示、创建表单、编辑框、完成状态按钮和删除按钮。

父组件 `ProjectsPage` 还保留业务逻辑和数据状态：

- 读取 token
- 调用 Project / Todo API
- 保存 Project 列表状态
- 保存 Todo 列表状态
- 保存当前选中的 Project id
- 处理退出登录

## 2. props 是什么

props 是父组件传给子组件的数据。

这次拆分里：

- `ProjectListPanel` 通过 props 接收 `projectListState` 和 `selectedProjectId`。
- `TodoPanel` 通过 props 接收 `selectedProjectId` 和 `todoListState`。

我的理解：

- props 主要用来传数据，不是主要用来传方法。
- 子组件应该把 props 当成只读数据。
- 如果子组件想改变父组件的数据，不应该直接改 props，而是 emit 一个事件给父组件。

## 3. emit 是什么

emit 是子组件向父组件发事件。

它不是“调用外界方法”，更准确地说是：

```text
子组件告诉父组件：用户做了某个动作，请你处理
```

这次拆分里：

- `ProjectListPanel` emit `loadProjects`，父组件去加载 Project。
- `ProjectListPanel` emit `createProject`，父组件去调用创建 Project API。
- `ProjectListPanel` emit `selectProject`，父组件保存选中的 Project 并加载 Todo。
- `TodoPanel` emit `createTodo`，父组件去调用创建 Todo API。
- `TodoPanel` emit `toggleTodo`，父组件去调用更新 Todo API。
- `TodoPanel` emit `saveTodoTitle`，父组件去调用更新 Todo API。
- `TodoPanel` emit `deleteTodo`，父组件去调用删除 Todo API。

我的理解：

- emit 传的是“事件”和“事件参数”。
- 真正怎么处理事件，由父组件决定。
- 这样子组件就不用知道 token、API、路由这些业务细节。

## 4. ProjectListPanel 的状态归属

放在子组件里的状态：

- `projectName`
- `projectDescription`

原因：

- 这两个状态只服务于 Project 创建表单。
- 父组件不需要知道用户输入过程。
- 父组件只需要在用户提交时拿到最终的 `{ name, description }`。

放在父组件里的状态：

- `projectListState`
- `selectedProjectId`

原因：

- `projectListState` 来自后端 API，是业务数据。
- `selectedProjectId` 不只影响 Project 区域，还会影响 Todo 列表加载。

## 5. TodoPanel 的状态归属

放在子组件里的状态：

- `todoTitle`
- `editingTodoId`
- `editingTodoTitle`

原因：

- `todoTitle` 只服务于 Todo 创建输入框。
- `editingTodoId` 和 `editingTodoTitle` 只影响 TodoPanel 内部编辑 UI。
- 父组件不需要知道用户正在输入什么，只需要知道用户点击保存后的结果。

放在父组件里的状态：

- `todoListState`
- `selectedProjectId`

原因：

- `todoListState` 是后端返回的业务数据。
- `selectedProjectId` 决定 Todo 属于哪个 Project，也决定创建 / 更新 / 删除后应该重新加载哪个 Project 的 Todo。

## 6. 父组件 ProjectsPage 现在负责什么

`ProjectsPage` 现在更像一个业务容器组件。

它负责：

- 读取 token
- 调用 `fetchProjects`
- 调用 `createProject`
- 调用 `fetchTodos`
- 调用 `createTodo`
- 调用 `updateTodo`
- 调用 `deleteTodo`
- 保存 `projectListState`
- 保存 `todoListState`
- 保存 `selectedProjectId`
- 处理退出登录
- 把数据通过 props 传给子组件
- 响应子组件 emit 出来的事件

## 7. 我现在对组件拆分的理解

我现在理解组件拆分不是简单地复制粘贴模板。

拆组件之前要先判断状态属于谁：

- 如果状态只影响一个输入框或一个局部 UI，适合放子组件。
- 如果状态来自后端、影响多个区域、或者和 API 调用有关，适合放父组件。

子组件不应该直接知道太多业务细节。
子组件更适合做展示和收集用户操作，然后通过 emit 把用户意图告诉父组件。

## 8. 下一阶段我想练什么

我选择：A. composables

原因：

- 现在 `ProjectListPanel` 和 `TodoPanel` 已经拆出来了。
- `ProjectsPage` 里的模板变清楚了，但业务逻辑还是很多。
- 下一步可以把 Project / Todo 的业务逻辑抽成 `useProjects` / `useTodos`。
- 这样可以继续练 Vue 的组合式 API，也能让页面组件更像一个组装入口。
