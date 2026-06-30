# Task: 用户级 Activity Log 体验优化

## 背景

用户级 Activity Log 前端入口已经完成，并且线上 smoke 已经通过。

当前用户可以在 `/projects` 页面看到：

```text
我的最近操作
```

点击后会调用：

```text
GET /activity-logs
```

展示当前登录用户最近的操作记录。

这说明功能链路已经打通。

但当前体验仍然是第一版：

- 需要手动点击“加载最近操作”
- 创建 / 编辑 / 删除 Project 或 Todo 后，需要手动点“刷新最近操作”
- 空状态和错误状态还可以更贴近用户
- 用户级入口和 Project 级 Activity Log 的分工还可以在界面上更清楚

所以这张任务做一个小范围体验优化。

---

## 这张任务只练什么

只优化用户级 Activity Log 的基础体验。

目标是：

```text
让“我的最近操作”更像一个自然跟随页面变化的最近动态区域。
```

先不要做：

- metadata 复杂展示
- 字段 diff 展示
- 无限滚动
- 分页
- 日期范围筛选
- 后端接口改造

---

## 任务 1：操作成功后自动刷新用户级日志

修改：

```text
apps/web/src/pages/ProjectsPage/index.vue
```

当前 Project / Todo 操作成功后，已经有一些地方会刷新 Project 级 Activity Log。

这张任务要补：

```text
如果用户级 Activity Log 已经加载过，
Project / Todo 操作成功后，顺手刷新“我的最近操作”。
```

注意不要一进入页面就强制自动加载。

第一版可以保持：

```text
用户先手动点一次“加载最近操作”
之后页面内操作成功，再自动刷新
```

这样比较克制。

学习点：

```text
不要让附加面板变成页面首屏的必需请求。
但用户已经表达过“我要看最近操作”之后，就可以帮他保持更新。
```

---

## 任务 2：给 useUserActivityLogs 增加 hasLoaded 语义

修改：

```text
apps/web/src/pages/ProjectsPage/composables/useUserActivityLogs.ts
```

可以通过当前状态判断：

```ts
userActivityLogListState.value.status !== "idle";
```

也可以显式返回：

```ts
const hasLoadedUserActivityLogs = computed(() => userActivityLogListState.value.status !== "idle");
```

然后在 ProjectsPage 里做：

```ts
if (hasLoadedUserActivityLogs.value) {
  await loadUserActivityLogs();
}
```

学习点：

```text
自动刷新要有边界。
只有用户已经打开过这个面板，才帮他刷新。
```

---

## 任务 3：优化 UserActivityLogPanel 文案

修改：

```text
apps/web/src/pages/ProjectsPage/components/UserActivityLogPanel/index.vue
```

建议优化几个状态：

### idle

从：

```text
点击加载，查看你最近的所有操作。
```

优化成类似：

```text
加载后可以查看你跨 Project 的最近操作。
```

### empty

从：

```text
你还没有最近操作记录。
```

优化成类似：

```text
还没有最近操作。创建 Project 或 Todo 后，这里会显示记录。
```

### error

保留重试按钮，但文案要说明：

```text
最近操作加载失败，可以稍后重试。
```

不要把技术错误直接作为唯一信息。

学习点：

```text
错误信息可以保留细节，但用户首先需要知道下一步能做什么。
```

---

## 任务 4：补测试

建议更新：

```text
apps/web/src/pages/ProjectsPage/composables/__tests__/useUserActivityLogs.test.ts
apps/web/src/pages/ProjectsPage/components/UserActivityLogPanel/__tests__/UserActivityLogPanel.test.ts
```

如果 ProjectsPage 已经有页面级测试，也可以补一条自动刷新测试。

至少覆盖：

1. 初始状态不应自动请求用户级日志
2. 手动加载成功后，状态进入 success
3. `hasLoadedUserActivityLogs` 能反映是否加载过
4. idle / empty / error 文案符合新体验
5. 点击重试仍然 emit `loadUserActivityLogs`

---

## 验证命令

先跑相关测试：

```bash
npm run test -w @learn/web -- useUserActivityLogs UserActivityLogPanel
```

再跑完整前端验证：

```bash
npm run test -w @learn/web
npm run typecheck -w @learn/web
npm run format:check
npm run build -w @learn/web
```

---

## 完成标准

- [x] 用户级 Activity Log 已加载后，Project / Todo 操作成功会自动刷新
- [x] 初始进入页面不会强制请求 `GET /activity-logs`
- [x] `useUserActivityLogs` 有清晰的 hasLoaded 语义
- [x] idle 文案更清楚
- [x] empty 文案更清楚
- [x] error 文案更清楚并保留重试
- [x] 补 composable 测试
- [x] 补组件测试
- [x] npm run test -w @learn/web 通过
- [x] npm run typecheck -w @learn/web 通过
- [x] npm run format:check 通过
- [x] npm run build -w @learn/web 通过

## 完成记录

- 完成时间：2026-06-29
- 本次更新文件：
  - `apps/web/src/pages/ProjectsPage/index.vue`
  - `apps/web/src/pages/ProjectsPage/composables/useUserActivityLogs.ts`
  - `apps/web/src/pages/ProjectsPage/composables/__tests__/useUserActivityLogs.test.ts`
  - `apps/web/src/pages/ProjectsPage/components/UserActivityLogPanel/index.vue`
  - `apps/web/src/pages/ProjectsPage/components/UserActivityLogPanel/__tests__/UserActivityLogPanel.test.ts`
  - `apps/web/src/pages/ProjectsPage/__tests__/ProjectsPage.test.ts`
- 核心行为：
  - 初始进入 `/projects` 不自动请求用户级 Activity Log。
  - 用户手动加载过“我的最近操作”后，Project / Todo 操作成功会自动刷新用户级日志。
  - `useUserActivityLogs` 新增 `hasLoadedUserActivityLogs`，让自动刷新边界更明确。
  - idle / empty / error 文案更贴近用户操作。
- 验证结果：
  - `npm run test -w @learn/web` 通过：17 files，82 tests
  - `npm run typecheck -w @learn/web` 通过
  - `npm run format:check` 通过
  - `npm run build -w @learn/web` 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-29-web-user-activity-log-experience-smoke-retrospective.md
```
