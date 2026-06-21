# Task: Vue Create Project

## 目标

这一张补上前端 Project 创建能力：

```text
输入 Project name / description -> POST /projects -> 刷新 Project 列表
```

后端接口是：

```text
POST /projects
```

前端走 Vite proxy：

```text
POST /api/projects
```

你完成后，页面应该能做到：

- 登录后填写 Project name
- description 可填可不填
- 点击按钮创建 Project
- 创建成功后清空表单
- 创建成功后刷新 Project 列表
- 没有 token 时提示先登录

---

## 你会练到什么

- 给已有 API client 增加 `POST` 方法
- 用 `CreateProjectInput` 复用 shared 类型
- 新增表单状态：`projectName` / `projectDescription`
- 提交表单时做前端基础校验
- 创建成功后复用 `handleLoadProjects`

---

## Step 1: 扩展 Project API client

修改：

```text
apps/web/src/api/projects.ts
```

把 import 改成：

```ts
import type { CreateProjectInput, PaginatedResult, Project } from "@learn/shared";
```

增加创建响应类型：

```ts
export type CreateProjectResponse = {
  success: true;
  data: Project;
};
```

增加创建函数：

```ts
export async function createProject(
  token: string,
  input: CreateProjectInput
): Promise<CreateProjectResponse> {
  // POST /projects 创建一个当前登录用户拥有的 Project。
  //
  // userId 不从前端传，后端会从 JWT token 里解析当前用户。
  // 这就是“身份由服务端确认，不相信客户端自报 userId”。
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("创建 Project 失败");
  }

  return response.json() as Promise<CreateProjectResponse>;
}
```

---

## Step 2: 在 App.vue 引入 createProject

修改：

```text
apps/web/src/App.vue
```

把：

```ts
import { fetchProjects } from "./api/projects";
```

改成：

```ts
import { createProject, fetchProjects } from "./api/projects";
```

---

## Step 3: 增加 Project 表单状态

在 `App.vue` 的 `<script setup>` 里增加：

```ts
const projectName = ref("");
const projectDescription = ref("");
```

这两个状态对应创建 Project 表单：

```text
projectName：必填
projectDescription：可选
```

---

## Step 4: 增加创建 Project 函数

继续在 `App.vue` 里增加：

```ts
async function handleCreateProject() {
  const token = getAuthToken();

  if (!token) {
    projectListState.value = {
      status: "error",
      message: "请先登录，再创建 Project"
    };
    return;
  }

  const name = projectName.value.trim();
  const description = projectDescription.value.trim();

  if (!name) {
    projectListState.value = {
      status: "error",
      message: "Project 名称不能为空"
    };
    return;
  }

  await createProject(token, {
    name,
    description: description || undefined
  });

  projectName.value = "";
  projectDescription.value = "";

  await handleLoadProjects();
}
```

这里重点看：

```ts
description: description || undefined;
```

如果用户没有填 description，`description` 是空字符串。
后端的输入类型是：

```ts
description?: string
```

所以这里把空字符串转成 `undefined`，意思是“不传 description”。

---

## Step 5: 在 Project 面板里加创建表单

在 Project 面板的 header 下面，列表上面，加入：

```vue
<form class="project-form" @submit.prevent="handleCreateProject">
  <input v-model="projectName" type="text" placeholder="Project name" />
  <input
    v-model="projectDescription"
    type="text"
    placeholder="Project description"
  />
  <button type="submit">创建 Project</button>
</form>
```

建议放在这里：

```vue
<section class="project-panel">
  <div class="panel-header">
    ...
  </div>

  <!-- 放这里 -->
  <form class="project-form" @submit.prevent="handleCreateProject">
    ...
  </form>

  <p v-if="projectListState.status === 'idle'">...</p>
  ...
</section>
```

---

## Step 6: 补 Project 表单样式

修改：

```text
apps/web/src/style.css
```

追加：

```css
.project-form {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.project-form input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 10px 12px;
  font: inherit;
}

.project-form button {
  justify-self: start;
  border: 0;
  border-radius: 8px;
  padding: 10px 14px;
  background: #2563eb;
  color: white;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}
```

---

## Step 7: 自己验证

打开前端：

```text
http://localhost:5174
```

按顺序测：

1. 登录
2. 填写 Project name
3. 可选填写 description
4. 点击“创建 Project”
5. 确认 Project 出现在列表里
6. 点击“选择”
7. 确认可以继续创建 Todo

---

## Step 8: 你完成后告诉我

你完成后回复：

```text
Vue 创建 Project 完成了
```

我会帮你：

- 跑 `npm run typecheck`
- 跑 `npm run build`
- 跑 `npm run format:check`
- 跑后端测试
- 用浏览器真实登录、创建 Project、选择 Project、创建 Todo
- 补学习型注释
- 更新任务索引
- 给下一张路由拆分任务卡
