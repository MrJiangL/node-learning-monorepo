# Task: 用户级 Activity Log 前端入口

## 背景

用户级 Activity Log 查询 API 已经完成。

现在后端有两个 Activity Log 查询视角：

```text
GET /projects/:projectId/activity-logs
```

适合 Project 详情页，展示当前选中 Project 的操作记录。

```text
GET /activity-logs
```

适合用户级视角，展示当前登录用户自己的所有操作记录。

现在前端仍然只有 Project 详情里的 Activity Log 面板：

```text
选择 Project
  -> 查看这个 Project 的 Activity Log
```

下一步要补一个用户级 Activity Log 前端入口，让用户不用先选 Project，也能看到最近所有操作。

---

## 这张任务只练什么

只做第一版用户级 Activity Log 前端入口。

目标是：

```text
在 ProjectsPage 里增加一个“我的最近操作”区域。
```

它调用：

```text
GET /activity-logs
```

展示当前用户最近 Activity Log。

先不要做：

- 独立路由页面
- 无限滚动
- action 筛选 UI
- 时间范围筛选 UI
- metadata 精细展示
- 导出日志

第一版先把入口接通。

---

## 任务 1：扩展前端 API client

修改：

```text
apps/web/src/api/activity-logs.ts
```

当前已有：

```ts
fetchActivityLogs(projectId, token);
```

它调用：

```text
GET /projects/:projectId/activity-logs
```

新增：

```ts
export async function fetchUserActivityLogs(token: string): Promise<ListActivityLogsResponse> {
  // GET /activity-logs
}
```

学习点：

```text
Project 级 Activity Log 和用户级 Activity Log 返回数据形状一样，
但 URL 表达的是不同视角。
```

---

## 任务 2：新增 composable

可以新增：

```text
apps/web/src/pages/ProjectsPage/composables/useUserActivityLogs.ts
```

或者复用 / 扩展 `useActivityLogs`。

我建议第一版新增 `useUserActivityLogs`，避免和 Project 级 Activity Log 混在一起。

建议状态：

```ts
type UserActivityLogListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; logs: ActivityLog[] }
  | { status: "error"; message: string };
```

提供：

```ts
loadUserActivityLogs();
```

未登录时进入错误状态：

```text
请先登录，再加载最近操作
```

---

## 任务 3：新增用户级 Activity Log 组件

可以新增：

```text
apps/web/src/pages/ProjectsPage/components/UserActivityLogPanel/index.vue
```

第一版展示：

- 标题：我的最近操作
- 按钮：加载最近操作 / 刷新
- idle 状态提示
- loading 状态
- error 状态
- 空状态
- 日志列表

日志展示可以复用现有 helper：

```text
apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/activity-log-display.ts
```

也就是继续使用：

```ts
formatActivityLogAction(log.action);
formatActivityLogTime(log.createdAt);
```

---

## 任务 4：接入 ProjectsPage

修改：

```text
apps/web/src/pages/ProjectsPage/index.vue
```

新增：

```ts
const { userActivityLogListState, loadUserActivityLogs } = useUserActivityLogs();
```

在页面里渲染：

```vue
<UserActivityLogPanel
  :user-activity-log-list-state="userActivityLogListState"
  @load-user-activity-logs="loadUserActivityLogs"
/>
```

第一版不要求每次 Project / Todo 操作后自动刷新用户级日志。

可以让用户手动点击“刷新”。

这样范围更小。

---

## 任务 5：补测试

至少补：

```text
apps/web/src/api/__tests__/activity-logs.test.ts
apps/web/src/pages/ProjectsPage/composables/__tests__/useUserActivityLogs.test.ts
apps/web/src/pages/ProjectsPage/components/UserActivityLogPanel/__tests__/UserActivityLogPanel.test.ts
```

建议覆盖：

1. `fetchUserActivityLogs` 调用 `/activity-logs`
2. `fetchUserActivityLogs` 带 Authorization header
3. `useUserActivityLogs` 没有 token 时进入错误状态
4. `useUserActivityLogs` 有 token 时进入 success 状态
5. UserActivityLogPanel idle / loading / error / empty 状态
6. UserActivityLogPanel 能展示 action 中文文案和格式化时间
7. 点击加载按钮会 emit `loadUserActivityLogs`

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

- [x] 新增 `fetchUserActivityLogs`
- [x] 新增 `useUserActivityLogs`
- [x] 新增 UserActivityLogPanel
- [x] ProjectsPage 展示“我的最近操作”
- [x] 用户级 Activity Log 能调用 `GET /activity-logs`
- [x] 用户级 Activity Log 能展示 action 中文文案
- [x] 用户级 Activity Log 能展示格式化时间
- [x] 补 API client 测试
- [x] 补 composable 测试
- [x] 补组件测试
- [x] npm run test -w @learn/web 通过
- [x] npm run typecheck -w @learn/web 通过
- [x] npm run format:check 通过
- [x] npm run build -w @learn/web 通过

## 完成记录

- 完成时间：2026-06-29
- 本次更新文件：
  - `apps/web/src/api/activity-logs.ts`
  - `apps/web/src/api/__tests__/activity-logs.test.ts`
  - `apps/web/src/pages/ProjectsPage/composables/useUserActivityLogs.ts`
  - `apps/web/src/pages/ProjectsPage/composables/__tests__/useUserActivityLogs.test.ts`
  - `apps/web/src/pages/ProjectsPage/components/UserActivityLogPanel/index.vue`
  - `apps/web/src/pages/ProjectsPage/components/UserActivityLogPanel/__tests__/UserActivityLogPanel.test.ts`
  - `apps/web/src/pages/ProjectsPage/index.vue`
- 核心行为：
  - 新增用户级 Activity Log API client，调用 `GET /activity-logs`
  - 新增独立的 `useUserActivityLogs` 状态管理
  - 新增“我的最近操作”面板
  - 支持手动加载和刷新最近操作
  - 复用 action 中文文案和时间格式化 helper
  - 展示 `projectSnapshotName`，让用户知道日志来自哪个 Project
- 验证结果：
  - `npm run test -w @learn/web` 通过：16 files，78 tests
  - `npm run typecheck -w @learn/web` 通过
  - `npm run format:check` 通过
  - `npm run build -w @learn/web` 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-29-web-user-activity-log-smoke-retrospective.md
```
