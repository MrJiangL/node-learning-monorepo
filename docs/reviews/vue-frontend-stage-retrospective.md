# Vue Frontend Stage Retrospective

## 1. 我现在已经实现了什么

- 我实现了登录功能：用户输入邮箱和密码后，前端会调用后端登录接口。
- 我实现了 token 保存：登录成功后，把后端返回的 JWT token 存到浏览器 localStorage。
- 我实现了 Project 列表和创建：登录后可以查看当前用户自己的 Project，也可以创建新的 Project。
- 我实现了 Todo 的基础 CRUD：可以创建 Todo、查看 Todo、更新完成状态、编辑标题和删除 Todo。
- 我实现了 Vue Router 拆页：把登录页和 Project 工作台拆成 `/login` 和 `/projects`。
- 我实现了路由前置校验：访问需要登录的页面时，会先检查有没有 token。
- 我实现了 Vite 代理转发：前端请求 `/api/...`，由 Vite 转发到后端接口。
- 我实现了错误响应解析和 token 清理：前端会尽量展示后端返回的错误 message，401 时会清理坏 token。

## 2. 登录链路

用户输入账号密码，点击登录后，会调用登录接口。后端校验成功后返回 token，前端把 token 保存到 localStorage，然后跳转到 Project 工作台。

```text
LoginPage
-> loginUser(input)
-> POST /api/auth/login
-> 后端校验邮箱和密码
-> 返回 token
-> setAuthToken(token)
-> router.push("/projects")
```

我的理解：

- `LoginPage` 负责收集邮箱、密码和展示登录错误。
- `loginUser` 负责发请求，不负责页面跳转。
- `setAuthToken` 负责保存 token，页面不应该到处手写 `"auth_token"`。
- 登录成功后进入 `/projects`，后续请求 Project / Todo 时都依赖这个 token。

## 3. Project / Todo 数据链路

登录成功后，进入 Project 工作台。点击“加载 Projects”时，页面会先从 localStorage 读取 token，再调用 Project API。

```text
ProjectsPage
-> getAuthToken()
-> fetchProjects(token)
-> GET /api/projects
-> Authorization: Bearer <token>
-> 后端 requireAuth 解析当前用户
-> 返回当前用户的 Projects
-> projectListState 更新页面
```

创建 Project 时，前端只传 `name` 和 `description`，不传 `userId`。Project 属于哪个用户由后端根据 token 判断，这样更安全。

Todo 的链路依赖当前选中的 Project：

```text
选择 Project
-> selectedProjectId = project.id
-> fetchTodos(projectId, token)
-> GET /api/projects/:projectId/todos
-> 返回这个 Project 下的 Todo
-> todoListState 更新页面
```

我的理解：

- `selectedProjectId` 表示当前 Todo 操作属于哪个 Project。
- 创建 Todo 前必须先选择 Project，否则不知道 Todo 应该挂在哪个 Project 下。
- 创建、更新、删除 Todo 成功后重新加载列表，是为了让页面展示数据库里的最新状态。

## 4. Vue Router 鉴权链路

```text
访问 /projects
-> router.beforeEach
-> 检查 to.meta.requiresAuth
-> getAuthToken()
-> 没 token：返回 /login
-> 有 token：进入 ProjectsPage
```

我的理解：

- `meta.requiresAuth` 是给路由加的自定义标记。
- `beforeEach` 会在页面切换之前执行。
- 这个守卫只能检查“前端有没有 token”，不能证明 token 一定有效。
- token 是否真的有效，要以后端接口返回结果为准。

前端路由守卫只是体验层拦截，真正的安全边界在后端 `requireAuth`。

## 5. 错误响应和 token 清理

我做了一个统一的 `parseApiError` helper，用来解析后端错误响应。

```text
response.ok === false
-> parseApiError(response, fallbackMessage)
-> 尝试读取后端 JSON
-> 如果有 error.message，就展示后端 message
-> 如果解析失败，就展示 fallbackMessage
```

401 时要清理 token：

- 401 表示当前请求没有通过鉴权。
- 常见原因是 token 过期、token 被改坏，或者后端 JWT secret 变化导致旧 token 失效。
- 如果坏 token 继续留在 localStorage，后续请求还会继续失败。
- 清理 token 后，下次访问受保护页面时更容易回到登录状态。

## 6. 我现在最不熟的 3 个点

1. 我对 Vue 组件拆分还不熟，不太确定哪些状态应该放父组件，哪些逻辑应该交给子组件。
2. 我对 props / emit 的使用还不熟，尤其是子组件怎么通知父组件重新加载数据。
3. 我对前端测试还不熟，现在主要靠手动浏览器验证，还没系统写 Vue 组件测试。

## 7. 下一阶段我想优先练什么

我选择：A. 前端组件拆分

原因：

- 现在 `ProjectsPage` 文件已经比较大。
- 继续加功能前，先拆成小组件会更好维护。
- 拆组件可以顺便练 `props`、`emit`、父子组件职责边界。
