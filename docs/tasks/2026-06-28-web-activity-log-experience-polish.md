# Task: Activity Log 体验优化：中文 action 和时间格式化

## 背景

你已经完成了 Activity Log 前端展示第一版。

现在页面能展示：

- `message`
- `action`
- `createdAt`

但当前展示还有一点偏开发者视角：

```text
todo.completed
2026-06-28T11:30:00.000Z
```

这些信息对调试很清楚，但对真实用户不够自然。

这张任务要做一个小而清晰的产品化优化：

```text
把 action 映射成中文，把 createdAt 格式化成更容易读的时间。
```

---

## 为什么做这张任务

第一版 Activity Log 解决的是：

```text
用户能不能看到发生过什么。
```

这一版优化解决的是：

```text
用户能不能更容易读懂发生过什么。
```

这是产品体验里很常见的一步：

1. 第一版先把数据打通。
2. 第二版再把数据变成人能读懂的界面。

---

## 这张任务只练什么

只练三件事：

1. 把 Activity Log action 显示成中文
2. 把 createdAt 从 ISO 字符串格式化成本地时间
3. 调整 ActivityLogPanel 测试

先不要做分页、筛选、无限滚动，也不要解析复杂 metadata。

---

## 任务 1：抽取 action 文案 helper

建议新增：

```text
apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/activity-log-display.ts
```

写一个函数：

```ts
import type { ActivityLogAction } from "@learn/shared";

const actionLabelMap: Record<ActivityLogAction, string> = {
  "project.created": "创建 Project",
  "project.updated": "更新 Project",
  "project.deleted": "删除 Project",
  "todo.created": "创建 Todo",
  "todo.updated": "更新 Todo",
  "todo.completed": "完成 Todo",
  "todo.deleted": "删除 Todo"
};

export function formatActivityLogAction(action: ActivityLogAction): string {
  return actionLabelMap[action];
}
```

学习点：

```text
后端 action 是稳定契约。
前端 label 是展示文案。
这两者不要混在一起。
```

---

## 任务 2：抽取时间格式化 helper

同一个文件里可以先写：

```ts
export function formatActivityLogTime(createdAt: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(createdAt));
}
```

第一版先做简单本地格式化。

先不要做：

- 刚刚
- 3 分钟前
- 昨天
- timezone 复杂处理

学习点：

```text
时间格式化先做稳定、简单、可测试的版本。
```

---

## 任务 3：更新 ActivityLogPanel

修改：

```text
apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/index.vue
```

把原来的：

```vue
<span>{{ log.action }}</span>
<time>{{ log.createdAt }}</time>
```

改成：

```vue
<span>{{ formatActivityLogAction(log.action) }}</span>
<time :datetime="log.createdAt">{{ formatActivityLogTime(log.createdAt) }}</time>
```

message 仍然作为主信息展示。

学习点：

```text
message 是用户最想读的内容。
action label 是辅助分类。
time 是上下文。
```

---

## 任务 4：补 helper 测试

建议新增：

```text
apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/__tests__/activity-log-display.test.ts
```

覆盖：

1. `todo.completed` 显示成 `完成 Todo`
2. `project.created` 显示成 `创建 Project`
3. `formatActivityLogTime` 会把 ISO 字符串格式化成中文日期时间

注意：

时间格式化可能受环境影响。

测试里可以只断言包含年份、月份、日期、小时、分钟这些关键片段，避免过度依赖具体分隔符。

---

## 任务 5：更新 ActivityLogPanel 测试

修改：

```text
apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/__tests__/ActivityLogPanel.test.ts
```

原来断言：

```text
todo.completed
2026-06-28T11:30:00.000Z
```

现在应该断言：

```text
完成 Todo
2026
06
28
```

但 `datetime` 属性仍然保留原始 ISO 字符串。

学习点：

```text
展示文本可以用户友好。
机器可读属性仍然可以保留原始值。
```

---

## 先不要做

这张任务先不要：

- 不要做分页
- 不要做 action 筛选
- 不要做无限滚动
- 不要做相对时间
- 不要解析 metadata 生成复杂描述
- 不要改后端 action 枚举

先把第一层展示体验打磨好。

---

## 验证命令

先跑 Activity Log 相关测试：

```bash
npm run test -w @learn/web -- ActivityLogPanel activity-log-display
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

- [x] 新增 action 中文映射 helper
- [x] 新增 createdAt 时间格式化 helper
- [x] ActivityLogPanel 使用中文 action
- [x] ActivityLogPanel 使用格式化后的时间
- [x] 保留 time 的 datetime 原始值
- [x] 补 helper 测试
- [x] 更新 ActivityLogPanel 测试
- [x] npm run test -w @learn/web 通过
- [x] npm run typecheck -w @learn/web 通过
- [x] npm run format:check 通过
- [x] npm run build -w @learn/web 通过

## 完成记录

- 完成时间：2026-06-28
- 已有实现：
  - apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/activity-log-display.ts
  - apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/index.vue
- 本次补充测试：
  - apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/**tests**/activity-log-display.test.ts
  - apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/**tests**/ActivityLogPanel.test.ts
- 核心行为：
  - `todo.completed` 展示为 `完成 Todo`。
  - `project.created` 展示为 `创建 Project`。
  - `createdAt` 展示为格式化后的本地时间。
  - `<time datetime="...">` 仍保留原始 ISO 字符串，方便机器读取。
- 验证结果：
  - npm run test -w @learn/web 通过，13 个测试文件、44 个测试
  - npm run typecheck -w @learn/web 通过
  - npm run format:check 通过
  - npm run build -w @learn/web 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-28-web-activity-log-experience-smoke-retrospective.md
```
