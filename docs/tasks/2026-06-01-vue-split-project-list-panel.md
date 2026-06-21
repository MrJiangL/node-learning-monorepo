# Task: Vue Split ProjectListPanel

## 目标

这一张开始练 Vue 组件拆分。

现在 `ProjectsPage` 里同时负责：

```text
Project 列表
Project 创建表单
Project 选择
Todo 列表和操作
退出登录
```

文件已经开始变大了。
这张任务只拆 Project 区域，先不要拆 Todo。

目标是创建一个子组件：

```text
apps/web/src/pages/ProjectsPage/ProjectListPanel.vue
```

让它负责：

```text
展示 Project header
展示加载按钮
展示退出登录按钮
展示创建 Project 表单
展示 Project 列表
点击选择 Project 时通知父组件
点击加载 Projects 时通知父组件
点击退出登录时通知父组件
提交创建 Project 时通知父组件
```

父组件 `ProjectsPage/index.vue` 继续负责：

```text
保存状态
调用 API
处理 token
处理路由跳转
加载 Todo
```

---

## 你会练到什么

- Vue 子组件如何接收 `props`
- Vue 子组件如何通过 `emit` 通知父组件
- 什么逻辑适合放父组件
- 什么 UI 适合拆成子组件
- 为什么不要一拆组件就把所有逻辑都搬进去

---

## Step 1: 创建 ProjectListPanel.vue

创建：

```text
apps/web/src/pages/ProjectsPage/ProjectListPanel.vue
```

写入：

```vue
<script setup lang="ts">
import { ref } from "vue";
import type { Project } from "@learn/shared";

type ProjectListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; projects: Project[] }
  | { status: "error"; message: string };

const props = defineProps<{
  projectListState: ProjectListState;
  selectedProjectId: string | null;
}>();

const emit = defineEmits<{
  loadProjects: [];
  logout: [];
  selectProject: [projectId: string];
  createProject: [input: { name: string; description?: string }];
}>();

const projectName = ref("");
const projectDescription = ref("");

function handleSubmitCreateProject() {
  const name = projectName.value.trim();
  const description = projectDescription.value.trim();

  if (!name) {
    // 这里先用浏览器 alert 降低学习成本。
    //
    // 真正项目里更常见的是把表单错误做成组件状态，
    // 但当前任务重点是 props / emit，不把范围扩太大。
    alert("Project 名称不能为空");
    return;
  }

  emit("createProject", {
    name,
    description: description || undefined
  });

  projectName.value = "";
  projectDescription.value = "";
}
</script>

<template>
  <section class="project-panel">
    <div class="panel-header">
      <h2>Projects</h2>
      <div class="toolbar">
        <button type="button" @click="emit('loadProjects')">
          {{ props.projectListState.status === "loading" ? "加载中..." : "加载 Projects" }}
        </button>
        <button type="button" @click="emit('logout')">退出登录</button>
      </div>
    </div>

    <form class="project-form" @submit.prevent="handleSubmitCreateProject">
      <input v-model="projectName" name="projectName" type="text" placeholder="Project name" />
      <input
        v-model="projectDescription"
        name="projectDescription"
        type="text"
        placeholder="Project description"
      />
      <button type="submit">创建 Project</button>
    </form>

    <p v-if="props.projectListState.status === 'idle'">登录后可以加载你的 Project。</p>
    <p v-if="props.projectListState.status === 'error'" class="error">
      {{ props.projectListState.message }}
    </p>

    <p
      v-if="
        props.projectListState.status === 'success' && props.projectListState.projects.length === 0
      "
    >
      你还没有 Project。
    </p>

    <ul v-if="props.projectListState.status === 'success'" class="project-list">
      <li
        v-for="project in props.projectListState.projects"
        :key="project.id"
        :class="{ selected: props.selectedProjectId === project.id }"
      >
        <strong>{{ project.name }}</strong>
        <span>{{ project.description ?? "暂无描述" }}</span>
        <button type="button" @click="emit('selectProject', project.id)">
          {{ props.selectedProjectId === project.id ? "已选择" : "选择" }}
        </button>
      </li>
    </ul>
  </section>
</template>
```

---

## Step 2: 在父组件 import 子组件

修改：

```text
apps/web/src/pages/ProjectsPage/index.vue
```

增加 import：

```ts
import ProjectListPanel from "./ProjectListPanel.vue";
```

---

## Step 3: 修改 handleCreateProject 的参数

现在 `projectName` / `projectDescription` 会搬到子组件里。
所以父组件不再需要这两个 ref。

删除：

```ts
const projectName = ref("");
const projectDescription = ref("");
```

把 `handleCreateProject` 改成接收子组件 emit 过来的 input：

```ts
async function handleCreateProject(input: { name: string; description?: string }) {
  const token = getAuthToken();

  if (!token) {
    projectListState.value = {
      status: "error",
      message: "请先登录，再创建 Project"
    };
    return;
  }

  // Project 的归属由 token 决定，不需要也不允许前端传 userId。
  //
  // 子组件只负责收集表单数据，真正调用 API 仍然放在父组件。
  await createProject(token, input);

  await handleLoadProjects();
}
```

注意这次父组件不再做 `name.trim()`。
因为表单输入已经在子组件里处理过了。

---

## Step 4: 替换 Project 模板

在 `ProjectsPage/index.vue` 的 `<template>` 里，删除整个 Project section：

```vue
<section class="project-panel">
  ...
</section>
```

换成：

```vue
<ProjectListPanel
  :project-list-state="projectListState"
  :selected-project-id="selectedProjectId"
  @load-projects="handleLoadProjects"
  @logout="handleLogout"
  @select-project="handleSelectProject"
  @create-project="handleCreateProject"
/>
```

这里的重点：

```text
父组件传数据给子组件：props
子组件通知父组件做事：emit
```

---

## Step 5: 跑检查

完成后运行：

```bash
npm run format
npm run typecheck
npm run build
```

如果你想自己浏览器验证：

```bash
npm run dev:api
npm run dev:web
```

然后验证：

```text
/login 登录成功后进入 /projects
点击加载 Projects 正常
创建 Project 正常
点击选择 Project 后 Todo 区域出现
退出登录正常
```

---

## 完成后告诉我

完成后你直接说：

```text
ProjectListPanel 组件拆分完成了
```

我会帮你：

- 跑格式检查、类型检查、构建
- 浏览器验证 Project 创建和选择
- 检查 props / emit 有没有理解偏差
- 补学习型中文注释
- 更新任务索引
- 给下一张 TodoPanel 拆分任务卡
