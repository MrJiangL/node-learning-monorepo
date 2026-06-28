# Task: 前端业务功能：Project 编辑和删除入口

## 背景

Activity Log 前端展示已经完成了线上 smoke。

现在 Project 工作台已经支持：

- 注册 / 登录
- 创建 Project
- 选择 Project
- 创建 Todo
- 更新 / 完成 / 删除 Todo
- 查看 Activity Log

但 Project 本身目前只有“创建”和“选择”，还没有前端编辑 / 删除入口。

后端其实已经有 Project 更新和删除能力。

下一步可以把它接到前端：

```text
PATCH /projects/:id
DELETE /projects/:id
```

这会让 Project 工作台更完整。

而且它还能继续验证 Activity Log：

```text
编辑 Project -> project.updated
删除 Project -> project.deleted
```

---

## 这张任务只练什么

只练三件事：

1. 在前端 Project 列表里支持编辑 Project
2. 在前端 Project 列表里支持删除 Project
3. 操作成功后刷新 Project 列表和 Activity Log / Todo 状态

先不要做复杂弹窗，也不要做批量删除。

---

## 任务 1：先阅读现有结构

先看：

```text
apps/web/src/api/projects.ts
apps/web/src/pages/ProjectsPage/composables/useProjects.ts
apps/web/src/pages/ProjectsPage/components/ProjectListPanel/index.vue
apps/web/src/pages/ProjectsPage/components/ProjectListPanel/__tests__/ProjectListPanel.test.ts
apps/web/src/pages/ProjectsPage/index.vue
```

先回答自己：

- Project 创建现在在哪一层调用 API？
- ProjectListPanel 现在只负责展示和 emit，还是自己发请求？
- selectedProjectId 放在哪里？
- 删除当前选中的 Project 后，Todo 和 Activity Log 应该怎么处理？

---

## 任务 2：扩展 Project API client

修改：

```text
apps/web/src/api/projects.ts
```

新增：

```ts
export type UpdateProjectResponse = {
  success: true;
  data: Project;
};

export async function updateProject(
  projectId: string,
  token: string,
  input: UpdateProjectInput
): Promise<UpdateProjectResponse> {
  // PATCH /projects/:id
}

export async function deleteProject(projectId: string, token: string): Promise<void> {
  // DELETE /projects/:id
}
```

`UpdateProjectInput` 可以从 `@learn/shared` 引入。

学习点：

```text
Project API client 只负责 HTTP。
不要在这里处理 selectedProjectId 或页面状态。
```

---

## 任务 3：扩展 useProjects

修改：

```text
apps/web/src/pages/ProjectsPage/composables/useProjects.ts
```

新增：

```ts
saveProject(projectId, input);
deleteProjectFromList(projectId);
```

操作成功后重新 `loadProjects()`。

错误时进入：

```ts
{
  status: "error";
  message: "...";
}
```

学习点：

```text
composable 负责 token、调用 API、刷新列表、处理错误状态。
```

---

## 任务 4：扩展 ProjectListPanel UI

修改：

```text
apps/web/src/pages/ProjectsPage/components/ProjectListPanel/index.vue
```

建议第一版做简单 inline edit：

- 每个 Project 旁边有“编辑”
- 点击后显示 name / description 输入框
- 有“保存”和“取消”
- 每个 Project 有“删除”
- 删除前用 `confirm`

组件只 emit：

```ts
saveProject: [projectId: string, input: { name: string; description?: string }]
deleteProject: [projectId: string]
```

不要在组件里直接调用 API。

---

## 任务 5：接入 ProjectsPage

修改：

```text
apps/web/src/pages/ProjectsPage/index.vue
```

新增 handler：

```ts
async function handleSaveProject(projectId, input) {
  await saveProject(projectId, input);
  await loadActivityLogs(projectId);
}

async function handleDeleteProject(projectId) {
  await deleteProjectFromList(projectId);

  if (selectedProjectId.value === projectId) {
    selectedProjectId.value = null;
    // Todo / ActivityLog 回到 idle
  }
}
```

注意删除当前选中 Project 后：

- selectedProjectId 应该清空
- Todo 面板应该回到未选择 Project 状态
- Activity Log 面板也应该回到未选择 Project 状态

如果当前 composable 没有 reset 方法，可以考虑补：

```ts
resetTodos();
resetActivityLogs();
```

---

## 任务 6：补测试

至少补 ProjectListPanel 测试：

1. 点击编辑后显示编辑表单
2. 保存时 emit `saveProject`
3. 取消时退出编辑状态
4. 点击删除并确认后 emit `deleteProject`
5. 删除但取消 confirm 时不 emit

如果有精力，再补：

```text
apps/web/src/api/__tests__/projects.test.ts
apps/web/src/pages/ProjectsPage/composables/__tests__/useProjects.test.ts
```

---

## 先不要做

这张任务先不要：

- 不要做复杂 modal
- 不要做批量删除
- 不要做软删除
- 不要做 undo
- 不要改后端 API
- 不要改 Activity Log 后端写入逻辑

---

## 验证命令

```bash
npm run test -w @learn/web
npm run typecheck -w @learn/web
npm run format:check
npm run build -w @learn/web
```

---

## 完成标准

- [x] Project API client 支持更新
- [x] Project API client 支持删除
- [x] useProjects 支持保存 Project
- [x] useProjects 支持删除 Project
- [x] ProjectListPanel 支持编辑 UI
- [x] ProjectListPanel 支持删除按钮
- [x] 删除当前选中 Project 后清空 selectedProjectId
- [x] 补 ProjectListPanel 测试
- [x] npm run test -w @learn/web 通过
- [x] npm run typecheck -w @learn/web 通过
- [x] npm run format:check 通过
- [x] npm run build -w @learn/web 通过

## 完成记录

- 完成时间：2026-06-28
- 新增 / 更新 API client：
  - apps/web/src/api/projects.ts
  - apps/web/src/api/**tests**/projects.test.ts
- 更新 composable：
  - apps/web/src/pages/ProjectsPage/composables/useProjects.ts
  - apps/web/src/pages/ProjectsPage/composables/useTodos.ts
  - apps/web/src/pages/ProjectsPage/composables/useActivityLogs.ts
- 更新组件：
  - apps/web/src/pages/ProjectsPage/components/ProjectListPanel/index.vue
  - apps/web/src/pages/ProjectsPage/components/ProjectListPanel/**tests**/ProjectListPanel.test.ts
- 更新页面：
  - apps/web/src/pages/ProjectsPage/index.vue
- 核心行为：
  - ProjectListPanel 支持 inline edit。
  - ProjectListPanel 支持删除前 confirm。
  - 保存 Project 后刷新 Project 列表，并刷新当前 Project 的 Activity Log。
  - 删除当前选中 Project 后清空 selectedProjectId，并把 Todo / Activity Log 状态重置为 idle。
- 验证结果：
  - npm run test -w @learn/web 通过，14 个测试文件、55 个测试
  - npm run typecheck -w @learn/web 通过
  - npm run format:check 通过
  - npm run build -w @learn/web 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-28-web-project-edit-delete-smoke-retrospective.md
```
