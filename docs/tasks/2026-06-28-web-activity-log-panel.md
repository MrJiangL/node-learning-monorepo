# Task: 前端业务功能：展示 Project Activity Log

## 背景

你已经完成了一轮部署稳定性复盘，并选择回到业务功能。

现在后端已经有 Activity Log 能力：

```text
GET /projects/:projectId/activity-logs
```

这个接口表示：

```text
查看当前登录用户某个 Project 下发生过的活动。
```

后端会记录这些动作：

- `project.created`
- `project.updated`
- `project.deleted`
- `todo.created`
- `todo.updated`
- `todo.completed`
- `todo.deleted`

但前端现在还没有展示 Activity Log。

用户只能看到 Project 和 Todo 当前状态，却看不到：

```text
这个 Project 最近发生了什么？
谁创建了 Todo？
Todo 是什么时候完成的？
Project 有没有被更新过？
```

这张任务要把 Activity Log 展示到 Project 工作台里。

---

## 为什么做这个功能

Activity Log 是一个很典型的“从后端能力变成产品体验”的功能。

后端已经把动作记录下来了。

但如果前端不展示，用户就感知不到它的价值。

这张任务会练到：

1. 新增前端 API client
2. 新增 composable 管理 Activity Log 状态
3. 新增展示组件
4. 在选中 Project 后加载对应日志
5. 写组件测试或 composable 测试

这和前面 Todo / Project 的前端练习是一脉相承的。

---

## 这张任务只练什么

只练三件事：

1. 前端调用 Activity Log API
2. 在页面上展示当前 Project 的活动记录
3. 处理 idle / loading / empty / error / success 状态

先不做筛选、分页 UI、无限滚动，也不做复杂时间格式化。

---

## 任务 1：先阅读现有前端结构

先看这些文件：

```text
apps/web/src/pages/ProjectsPage/index.vue
apps/web/src/pages/ProjectsPage/components/ProjectListPanel/index.vue
apps/web/src/pages/ProjectsPage/components/TodoPanel/index.vue
apps/web/src/pages/ProjectsPage/composables/useProjects.ts
apps/web/src/pages/ProjectsPage/composables/useTodos.ts
apps/web/src/api/projects.ts
apps/web/src/api/todos.ts
apps/web/src/api/authenticated-fetch.ts
packages/shared/src/index.ts
```

先回答自己：

- Project / Todo API client 是怎么写的？
- composable 负责什么？
- component 负责什么？
- 页面 `ProjectsPage` 负责什么？
- `ActivityLog` shared type 已经在哪里定义？

学习点：

```text
api client 负责 HTTP。
composable 负责页面状态和业务动作。
component 负责展示和 emit。
page 负责把多个状态和事件编排起来。
```

---

## 任务 2：新增 Activity Log API client

建议新增：

```text
apps/web/src/api/activity-logs.ts
```

建议结构：

```ts
import type { ActivityLog, PaginatedResult } from "@learn/shared";
import { buildApiUrl } from "./api-url";
import { parseApiError } from "./api-error";
import { authenticatedFetch } from "./authenticated-fetch";

export type ListActivityLogsResponse = {
  success: true;
  data: ActivityLog[];
  meta: PaginatedResult<ActivityLog>["meta"];
};

export async function fetchActivityLogs(
  projectId: string,
  token: string
): Promise<ListActivityLogsResponse> {
  const response = await authenticatedFetch(buildApiUrl(`/projects/${projectId}/activity-logs`), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw await parseApiError(response, "加载活动记录失败");
  }

  return response.json() as Promise<ListActivityLogsResponse>;
}
```

学习点：

Activity Log 是 Project 的子资源，所以路径是：

```text
/projects/:projectId/activity-logs
```

不要写成：

```text
/activity-logs
```

---

## 任务 3：新增 useActivityLogs composable

建议新增：

```text
apps/web/src/pages/ProjectsPage/composables/useActivityLogs.ts
```

可以参考 `useTodos.ts`。

建议状态：

```ts
type ActivityLogListState =
  | { status: "idle"; logs: ActivityLog[]; error: null }
  | { status: "loading"; logs: ActivityLog[]; error: null }
  | { status: "success"; logs: ActivityLog[]; error: null }
  | { status: "error"; logs: ActivityLog[]; error: string };
```

建议暴露：

```ts
export function useActivityLogs() {
  const activityLogListState = ref<ActivityLogListState>({
    status: "idle",
    logs: [],
    error: null
  });

  async function loadActivityLogs(projectId: string | null) {
    // 没有选中 Project 时，保持 idle。
    // 有 Project 时，调用 fetchActivityLogs。
  }

  return {
    activityLogListState,
    loadActivityLogs
  };
}
```

学习点：

Activity Log 是“当前选中 Project 的派生数据”。

所以它和 Todo 一样：

```text
没有 selectedProjectId，就不应该请求。
选中 Project 后，再加载对应数据。
```

---

## 任务 4：新增 ActivityLogPanel 组件

建议新增：

```text
apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/index.vue
```

它接收：

```ts
selectedProjectId: string | null;
activityLogListState: ActivityLogListState;
```

它展示：

- idle：请先选择一个 Project
- loading：正在加载活动记录
- empty：这个 Project 还没有活动记录
- error：展示错误文案和重试按钮
- success：展示日志列表

日志列表先简单展示：

```text
message
action
createdAt
```

可以先不把 metadata 做复杂解析。

学习点：

组件不应该自己发请求。

它只负责：

- 根据 state 展示不同 UI
- 用户点击重试时 emit `load-activity-logs`

---

## 任务 5：接入 ProjectsPage

修改：

```text
apps/web/src/pages/ProjectsPage/index.vue
```

引入：

```ts
import ActivityLogPanel from "./components/ActivityLogPanel/index.vue";
import { useActivityLogs } from "./composables/useActivityLogs";
```

在页面里：

```ts
const { activityLogListState, loadActivityLogs } = useActivityLogs();
```

选中 Project 时，同时加载 Todo 和 Activity Log：

```ts
async function handleSelectProject(projectId: string) {
  selectedProjectId.value = projectId;
  await Promise.all([loadTodos(projectId), loadActivityLogs(projectId)]);
}
```

创建、更新、删除 Todo 后，Activity Log 也应该刷新。

第一版可以先在对应 handler 里调用：

```ts
await loadActivityLogs(selectedProjectId.value);
```

注意：

```text
Todo 操作成功后，Activity Log 才需要刷新。
```

如果 Todo 创建失败，不要假装日志刷新成功。

---

## 任务 6：补测试

建议至少补组件测试：

```text
apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/__tests__/ActivityLogPanel.test.ts
```

覆盖：

1. 未选择 Project 时显示 idle 文案
2. loading 时显示加载文案
3. empty 时显示空状态
4. error 时显示错误文案和重试按钮
5. success 时展示日志 message / action
6. 点击重试会 emit `load-activity-logs`

如果还有精力，再补：

```text
apps/web/src/api/__tests__/activity-logs.test.ts
apps/web/src/pages/ProjectsPage/composables/__tests__/useActivityLogs.test.ts
```

但第一版至少要有组件测试。

---

## 先不要做

这张任务先不要：

- 不要做分页 UI
- 不要做 action 筛选 UI
- 不要做无限滚动
- 不要做复杂时间格式化
- 不要解析所有 metadata 展示细节
- 不要把 Activity Log 写入逻辑放到前端

先把“能看到当前 Project 的活动记录”打通。

---

## 验证命令

先跑前端测试：

```bash
npm run test -w @learn/web
```

再跑类型检查和格式检查：

```bash
npm run typecheck -w @learn/web
npm run format:check
```

如果改动了页面结构，也跑一次 build：

```bash
npm run build -w @learn/web
```

---

## 完成标准

- [x] 新增 Activity Log API client
- [x] 新增 useActivityLogs composable
- [x] 新增 ActivityLogPanel 组件
- [x] ProjectsPage 选中 Project 后会加载 Activity Log
- [x] Todo 操作后会刷新 Activity Log
- [x] 覆盖 idle / loading / empty / error / success 状态
- [x] 补 ActivityLogPanel 测试
- [x] npm run test -w @learn/web 通过
- [x] npm run typecheck -w @learn/web 通过
- [x] npm run format:check 通过
- [x] npm run build -w @learn/web 通过

## 完成记录

- 完成时间：2026-06-28
- 新增 API client：apps/web/src/api/activity-logs.ts
- 新增 composable：apps/web/src/pages/ProjectsPage/composables/useActivityLogs.ts
- 新增组件：apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/index.vue
- 新增测试：
  - apps/web/src/api/**tests**/activity-logs.test.ts
  - apps/web/src/pages/ProjectsPage/composables/**tests**/useActivityLogs.test.ts
  - apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/**tests**/ActivityLogPanel.test.ts
- 页面接入：apps/web/src/pages/ProjectsPage/index.vue
- 样式更新：apps/web/src/style.css
- 核心行为：
  - 选中 Project 后同时加载 Todo 和 Activity Log。
  - Todo 创建、完成状态切换、标题更新、删除成功后刷新 Activity Log。
  - ActivityLogPanel 覆盖未选择 Project、loading、empty、error、success 状态。
- 验证结果：
  - npm run test -w @learn/web 通过，12 个测试文件、41 个测试
  - npm run typecheck -w @learn/web 通过
  - npm run format:check 通过
  - npm run build -w @learn/web 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-28-web-activity-log-smoke-retrospective.md
```
