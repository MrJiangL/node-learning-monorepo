# Task: Vue Frontend Stage Retrospective

## 目标

这一张不写新功能，做一次前端阶段复盘。

你已经从一个空的 Vite Vue 项目走到了：

```text
登录
读取 token
Project 列表
Project 创建
Todo 列表
Todo 创建 / 更新 / 删除
Vue Router 拆页
错误响应解析
401 token 清理
```

现在最重要的不是继续加功能，而是把这条链路讲清楚。
如果你能用自己的话解释出来，后面学组件拆分、Pinia、前端测试都会顺很多。

---

## 你会练到什么

- 复盘 Vue 的 `ref` 状态如何驱动页面
- 复盘 API client 和页面组件的职责边界
- 复盘 token 从登录到鉴权请求的完整流向
- 复盘 Vue Router 守卫在什么时候执行
- 复盘错误响应为什么要集中解析
- 找出你现在还不稳的 3 个点

---

## Step 1: 创建复盘文档

创建：

```text
docs/reviews/vue-frontend-stage-retrospective.md
```

先写入这个结构：

```md
# Vue Frontend Stage Retrospective

## 1. 我现在已经实现了什么

## 2. 登录链路

## 3. Project / Todo 数据链路

## 4. Vue Router 鉴权链路

## 5. 错误响应和 token 清理

## 6. 我现在最不熟的 3 个点

## 7. 下一阶段我想优先练什么
```

---

## Step 2: 写“我现在已经实现了什么”

在第 1 节写 5 到 8 条。

可以参考这个格式，但要换成你自己的理解：

```md
## 1. 我现在已经实现了什么

- 我实现了登录页，可以把邮箱和密码提交给后端 `/auth/login`。
- 登录成功后，前端会保存后端返回的 JWT token。
- 我实现了 Project 工作台，可以加载当前用户自己的 Project。
- 我实现了 Todo 的创建、完成状态切换、标题编辑和删除。
- 我把原来的单页 `App.vue` 拆成了 `/login` 和 `/projects` 两个路由页面。
```

---

## Step 3: 画登录链路

在第 2 节写这个流程，并补充你自己的解释：

````md
## 2. 登录链路

```text
LoginPage
-> loginUser(input)
-> POST /api/auth/login
-> 后端校验邮箱和密码
-> 返回 token
-> setAuthToken(token)
-> router.push("/projects")
```
````

我的理解：

- `LoginPage` 只负责收集表单状态和处理页面跳转。
- `loginUser` 只负责发登录请求。
- `setAuthToken` 负责把 token 存到 localStorage。

````

注意 Markdown 里有代码块嵌套。
如果你写的时候觉得麻烦，可以把里面的流程写成普通列表。

---

## Step 4: 复盘 Project / Todo 数据链路

在第 3 节回答这些问题：

```md
## 3. Project / Todo 数据链路

### 加载 Project 时发生了什么？

- 页面从哪里拿 token？
- token 放进了哪个 HTTP header？
- 后端为什么知道“当前用户是谁”？
- 返回数据后，前端更新了哪个 ref？

### 创建 Todo 时发生了什么？

- 为什么必须先选择一个 Project？
- `selectedProjectId` 的作用是什么？
- 创建成功后为什么要重新加载 Todo 列表？
````

你不需要写很长，但每个问题都尽量写一句自己的理解。

---

## Step 5: 复盘 Vue Router 鉴权链路

在第 4 节写：

````md
## 4. Vue Router 鉴权链路

```text
访问 /projects
-> router.beforeEach
-> 检查 to.meta.requiresAuth
-> getAuthToken()
-> 没 token：返回 /login
-> 有 token：进入 ProjectsPage
```
````

我的理解：

- `meta.requiresAuth` 是给路由加的自定义标记。
- `beforeEach` 在页面切换前执行。
- 这个守卫只能检查“前端有没有 token”，不能证明 token 一定有效。
- token 是否真的有效，还要以后端接口返回结果为准。

````

最后这句很重要：

```text
前端路由守卫只能做体验层拦截，真正的安全边界在后端 requireAuth。
````

---

## Step 6: 复盘错误响应和 token 清理

在第 5 节写：

```md
## 5. 错误响应和 token 清理

### parseApiError 做了什么？

- 它尝试读取后端返回的 JSON。
- 如果 JSON 符合 `{ success: false, error: { code, message } }`，就使用后端 message。
- 如果读取失败，就使用 fallbackMessage。

### 为什么 401 要清理 token？

- 401 表示当前请求没有通过鉴权。
- 如果 token 已经坏了，继续留在 localStorage 只会让后续请求继续失败。
- 清理 token 后，下次访问受保护页面会更容易回到登录状态。
```

---

## Step 7: 写“不熟的 3 个点”

在第 6 节写你自己的真实感受。

可以从这些里面选：

```md
## 6. 我现在最不熟的 3 个点

1. 我对 TypeScript 的 `unknown` 类型还不熟。
2. 我对 Vue Router 的执行时机还不熟。
3. 我对 API client 和页面组件的边界还不熟。
```

这里不要写“都懂了”。
学习复盘的价值就是定位下一步。

---

## Step 8: 选择下一阶段方向

在第 7 节从这 3 个方向里选一个：

```md
## 7. 下一阶段我想优先练什么

我选择：A / B / C

A. 前端组件拆分
B. Vue 组合式函数 composables
C. 前端测试 Vitest
```

我的建议是：

```text
优先选 A：前端组件拆分
```

原因是你现在 `ProjectsPage` 已经比较大了。
先拆组件，你会更直观地理解 props、emit、状态放哪里。

---

## Step 9: 跑格式检查

完成后运行：

```bash
npm run format
npm run format:check
```

---

## 完成后告诉我

完成后你直接说：

```text
Vue 前端阶段复盘完成了
```

我会帮你：

- 检查复盘有没有关键理解偏差
- 帮你补充遗漏点
- 更新任务索引
- 根据你选择的 A / B / C 给下一张任务卡
