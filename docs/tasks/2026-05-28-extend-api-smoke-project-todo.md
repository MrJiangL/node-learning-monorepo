# Task: Extend API Smoke With Project And Todo

## 目标

现在 API 已经不只是 Plan 了，还包括：

```text
Auth -> Plan
Auth -> Project -> Todo
```

这一张任务扩展 smoke 脚本，让它不仅检查 Plan 流程，也检查 Project / Todo 的真实 HTTP 流程。

你要练的是：

- 给脚本补 DTO 类型。
- 复用登录后的 Authorization header。
- 用脚本串联多个 API 请求。
- 用简单判断让 smoke 脚本在接口异常时失败。

---

## Step 1: 打开 smoke 脚本

打开：

```text
apps/api/src/scripts/api-smoke.ts
```

你现在已经有：

```text
health -> register -> login -> auth/me -> create plan -> list plans
```

这次要追加：

```text
create project -> list projects -> create todo -> list todos -> toggle todo completed
```

---

## Step 2: 添加 DTO 类型

在 `PlanDto` 后面添加：

```ts
type ProjectDto = {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

type TodoDto = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  dueDate: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
};
```

学习点：

- DTO 是 API 返回给脚本的数据形状。
- 它不一定等于 Prisma model，因为 API 里的 Date 已经变成 string。

---

## Step 3: 创建 Project

在 `Listing plans...` 那段后面追加：

```ts
console.log("Creating a project...");

const project = await requestJson<ProjectDto>("/projects", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...authHeaders
  },
  body: JSON.stringify({
    name: "Smoke test project",
    description: "Created by api-smoke.ts"
  })
});

console.log(`Created project: ${project.name}`);
```

---

## Step 4: 列出 Project

继续追加：

```ts
console.log("Listing projects...");

const projects = await requestJson<ProjectDto[]>("/projects", {
  headers: authHeaders
});

if (!projects.some((item) => item.id === project.id)) {
  throw new Error("Created project was not returned by GET /projects");
}

console.log(`Project count visible to current user: ${projects.length}`);
```

学习点：

- smoke 脚本不是只打印日志。
- 它也应该做少量断言。
- 如果创建出来的 project 没在列表里，说明核心链路断了，脚本应该失败。

---

## Step 5: 创建 Todo

继续追加：

```ts
console.log("Creating a todo...");

const todo = await requestJson<TodoDto>(`/projects/${project.id}/todos`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...authHeaders
  },
  body: JSON.stringify({
    title: "Smoke test todo",
    description: "Created by api-smoke.ts"
  })
});

console.log(`Created todo: ${todo.title}`);
```

---

## Step 6: 列出 Todo

继续追加：

```ts
console.log("Listing todos...");

const todos = await requestJson<TodoDto[]>(`/projects/${project.id}/todos`, {
  headers: authHeaders
});

if (!todos.some((item) => item.id === todo.id)) {
  throw new Error("Created todo was not returned by GET /projects/:projectId/todos");
}

console.log(`Todo count visible in project: ${todos.length}`);
```

---

## Step 7: 切换 Todo 完成状态

继续追加：

```ts
console.log("Toggling todo completed status...");

const completedTodo = await requestJson<TodoDto>(`/todos/${todo.id}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    ...authHeaders
  },
  body: JSON.stringify({
    completed: true
  })
});

if (!completedTodo.completed) {
  throw new Error("Todo completed status was not updated");
}

console.log(`Todo completed: ${completedTodo.completed}`);
```

---

## Step 8: 跑 smoke

先确保本地 API 服务正在跑：

```bash
npm run dev
```

另一个终端运行：

```bash
npm run smoke:api -w @learn/api
```

你应该能看到类似：

```text
Creating a project...
Created project: Smoke test project
Listing projects...
Creating a todo...
Created todo: Smoke test todo
Listing todos...
Toggling todo completed status...
Todo completed: true
API smoke flow completed.
```

---

## 验收标准

完成后告诉我：

```text
API smoke 扩展完成了
```

我会帮你：

- 检查脚本是否覆盖 Project / Todo 主流程。
- 跑 `smoke:api`。
- 跑测试、类型检查、格式检查和构建。
- 然后带你做一次阶段复盘，把 Prisma / Repository / 权限边界串起来。
