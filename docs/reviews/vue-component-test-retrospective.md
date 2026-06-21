# Vue Component Test Retrospective

## 这次测了哪些组件？

`ProjectListPanel` 测了两类行为：

- 给组件传入 `projectListState.status === "success"` 和 Project 列表时，页面会渲染 Project 名称、描述和“已选择”按钮状态
- 用户填写 Project 创建表单并提交时，组件会 emit `createProject` 事件，并把 `{ name, description }` 作为事件参数交给父组件

`TodoPanel` 测了两类行为：

- 用户填写 Todo 创建表单并提交时，组件会 emit `createTodo` 事件，并把 `{ title }` 作为事件参数交给父组件
- 用户点击“标记完成”按钮时，组件会 emit `toggleTodo` 事件，并把完整的 `todo` 交给父组件

这说明目前组件测试关注的是子组件自己的职责：

```text
props 进来以后怎么展示
用户操作以后 emit 什么事件
```

## mount 是什么？

`mount` 可以把一个 Vue 组件渲染到测试环境里，并返回一个 `wrapper`。

这个 `wrapper` 像是测试里拿到的“组件实例 + DOM 操作工具”：

- 可以用 `wrapper.text()` 查看组件渲染出的文字
- 可以用 `wrapper.get(...)` 找到输入框、表单、按钮
- 可以用 `setValue()` 模拟用户输入
- 可以用 `trigger()` 模拟用户提交表单或点击按钮
- 可以用 `emitted()` 查看组件发出了哪些事件

所以组件测试不是直接调用组件内部函数，而是尽量模拟用户能看到和能操作的东西。

## 为什么 mount 时要传 props？

因为 `ProjectListPanel` 和 `TodoPanel` 是子组件，它们的数据来源不是自己请求后端，而是父组件传进来的 props。

例如 `ProjectListPanel` 需要：

```ts
projectListState;
selectedProjectId;
```

`TodoPanel` 需要：

```ts
todoListState;
selectedProjectId;
```

测试时没有真的父组件，所以我们用 `mount(Component, { props: ... })` 模拟父组件传值。

这也是 `props down` 的测试写法：父组件平时怎么给数据，测试里就怎么给数据。

## DOM 查询

### wrapper.text() 在测什么？

`wrapper.text()` 测的是组件最终渲染出来的用户可见文字。

比如：

```ts
expect(wrapper.text()).toContain("学习 Node");
expect(wrapper.text()).toContain("每天练一点");
expect(wrapper.text()).toContain("已选择");
```

这不是在测试某个内部变量，而是在测试用户能不能看到正确内容。

### wrapper.get('input[name="projectName"]') 在测什么？

这行是在测试里找到 Project 名称输入框。

它依赖的是真实 DOM 上的 `name="projectName"`：

```vue
<input v-model="projectName" name="projectName" />
```

找到以后，测试可以调用：

```ts
await wrapper.get('input[name="projectName"]').setValue("新的 Project");
```

这相当于模拟用户在输入框里输入“新的 Project”。

### 为什么按按钮文字找，比 nth-of-type 更稳定？

`nth-of-type` 依赖按钮在 DOM 里的位置。

如果以后组件里多加一个按钮，或者按钮顺序调整了，`nth-of-type` 可能就会点错按钮。

按按钮文字找更接近用户行为：

```ts
const toggleButton = wrapper.findAll("button").find((button) => button.text() === "标记完成");
```

这表达的是：“找到用户看到的那个标记完成按钮”。

当然，这种写法也依赖按钮文案。如果后面项目变大，更常见的做法是使用更稳定的可访问性查询，或者给关键元素加明确的测试标识。但在当前学习阶段，按文字找已经比按位置找更清楚。

## emitted

### wrapper.emitted("createProject") 在测什么？

它测的是组件有没有向父组件发出 `createProject` 事件，以及事件参数是不是正确。

比如：

```ts
expect(wrapper.emitted("createProject")).toEqual([
  [
    {
      name: "新的 Project",
      description: "新的描述"
    }
  ]
]);
```

这说明 `ProjectListPanel` 没有自己创建 Project，而是把整理好的表单数据交给父组件。

这就是 `events up` 的测试写法：用户在子组件里操作，子组件通过事件通知父组件。

### 为什么组件测试只断言 emit，而不是断言 API 调用？

因为 `ProjectListPanel` 和 `TodoPanel` 的职责不是调用 API。

它们只负责：

- 展示 props
- 收集用户输入
- emit 用户操作

真正调用 API 的逻辑在 `useProjects` 和 `useTodos` 里。

如果组件测试里断言 API 调用，就会把测试范围扩大到 composable 和 API client。这样测试一旦失败，很难判断是组件 emit 错了，还是 API mock 错了，还是 composable 逻辑错了。

当前这组测试的边界应该保持简单：

```text
组件测试测组件。
composable 测试测业务状态和 API 调用。
后端测试测数据库和接口行为。
```

## 这次最容易混淆的点

### 1. 组件测试不是页面测试

组件测试只看一个组件自己的行为。

比如 `TodoPanel` 测试不需要知道 `ProjectsPage` 里有没有 `selectedProjectId`，只需要给它传一个 `selectedProjectId` prop。

### 2. emit 不是“假动作”

emit 是子组件和父组件通信的正式合同。

如果子组件应该 emit `createTodo`，那测试断言 `createTodo` 被 emit，就是在测试真实行为。

### 3. 不请求后端不是偷懒

不请求后端是为了让测试边界清楚。

组件测试越小，失败时越容易定位问题。需要测试 API 时，我们会去写 composable 测试、API client 测试或后端集成测试。

## 我的判断规则

以后写 Vue 组件测试时，可以先问三个问题：

1. 这个组件接收了哪些 props？测试里就准备这些 props。
2. 用户会看到什么？用 `wrapper.text()` 或 DOM 查询断言渲染结果。
3. 用户操作后组件应该告诉父组件什么？用 `wrapper.emitted()` 断言事件和参数。

如果测试里开始出现真实 token、真实 API、真实数据库，就要停一下，问自己：

```text
这还是组件测试吗？
```
