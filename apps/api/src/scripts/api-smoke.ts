// 这个脚本会直接请求本地启动的 API 服务。
//
// 默认地址是 http://localhost:3001。
// 如果以后端口变了，可以运行：
//
// API_BASE_URL=http://localhost:4000 npm run smoke:api -w @learn/api
const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3001";

// 用当前时间拼一个邮箱，避免每次运行都撞到“邮箱已存在”。
//
// 例如：
// smoke-1710000000000@example.com
const testEmail = `smoke-${Date.now()}@example.com`;

// 这是 smoke 测试临时用户的学习用密码，不是真实密钥。
// 不要把真实用户密码、JWT token、数据库密码写进脚本。
const testPassword = "password123";

type ApiResponse<T> =
  | {
      success: true;
      data: T;
      meta?: unknown;
    }
  | {
      success: false;
      error: {
        code: string;
        message: string;
      };
    };

type UserDto = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
};

type LoginResultDto = {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
};

type PlanDto = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  difficulty: string;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
};

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

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  // fetch 接收完整 URL，所以这里把基础地址和路径拼起来。
  //
  // path 负责表达“请求哪个 API”，例如 /health 或 /plans。
  // API_BASE_URL 负责表达“请求哪个服务”，例如 http://localhost:3001。
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  // 当前 API 的成功和错误响应都会返回 JSON。
  // 所以这里统一解析一次，再根据 success 判断是否继续。
  const body = (await response.json()) as ApiResponse<T>;

  // HTTP 状态码不是 2xx，或者业务响应 success=false，都当成脚本失败。
  //
  // 这样 smoke 脚本能及时提醒我们：
  // 核心 API 链路已经断了。
  if (!response.ok || !body.success) {
    const errorMessage = !body.success
      ? `${body.error.code}: ${body.error.message}`
      : `HTTP ${response.status}`;

    throw new Error(`Request ${path} failed: ${errorMessage}`);
  }

  // 到这里说明：
  // - HTTP 状态码是 2xx
  // - 响应体 success 是 true
  //
  // 所以调用方只需要关心真正的 data。
  return body.data;
}

async function requestNoContent(path: string, options: RequestInit = {}): Promise<void> {
  // DELETE /projects/:id 使用 204 No Content。
  //
  // 204 的语义是“请求成功，但没有响应体”。
  // 所以这里不能复用 requestJson：它会尝试 response.json()，而空响应体无法解析 JSON。
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (!response.ok) {
    throw new Error(`Request ${path} failed: HTTP ${response.status}`);
  }
}

async function main() {
  console.log("Checking API health...");

  const health = await requestJson<{ status: string; service: string }>("/health");
  console.log(`Health OK: ${health.service}`);

  console.log(`Registering user: ${testEmail}`);

  const user = await requestJson<UserDto>("/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      name: "Smoke Test User"
    })
  });

  console.log(`Registered user id: ${user.id}`);

  console.log("Logging in...");

  const login = await requestJson<LoginResultDto>("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword
    })
  });

  console.log(`Logged in as: ${login.user.email}`);

  // 登录成功后，后端会返回 accessToken 和 refreshToken。
  //
  // 后续访问 /auth/me 和 /plans 时，用 accessToken 放进 Authorization header。
  // refreshToken 用来换新的 accessToken，这个 smoke 脚本暂时不演示自动刷新。
  const authHeaders = {
    Authorization: `Bearer ${login.accessToken}`
  };

  console.log("Checking current user...");

  const currentUser = await requestJson<UserDto>("/auth/me", {
    headers: authHeaders
  });

  console.log(`Current user: ${currentUser.email}`);

  console.log("Creating a plan...");

  const plan = await requestJson<PlanDto>("/plans", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders
    },
    body: JSON.stringify({
      title: "Smoke test plan",
      description: "Created by api-smoke.ts",
      difficulty: "easy"
    })
  });

  console.log(`Created plan: ${plan.title}`);

  console.log("Listing plans...");

  const plans = await requestJson<PlanDto[]>("/plans", {
    headers: authHeaders
  });

  if (!plans.some((item) => item.id === plan.id)) {
    throw new Error("Created plan was not returned by GET /plans");
  }

  console.log(`Plan count visible to current user: ${plans.length}`);

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

  console.log("Getting project detail...");

  // 这里覆盖 GET /projects/:id。
  //
  // 它验证的不只是“能按 id 查到 Project”，还验证当前登录用户可以读取自己的 Project。
  // 如果 route 没接上，或者 service 权限判断写错，这里会让 smoke 失败。
  const projectDetail = await requestJson<ProjectDto>(`/projects/${project.id}`, {
    headers: authHeaders
  });

  if (projectDetail.id !== project.id) {
    throw new Error("Created project detail was not returned by GET /projects/:id");
  }

  console.log(`Project detail loaded: ${projectDetail.name}`);

  console.log("Updating project...");

  const updatedProject = await requestJson<ProjectDto>(`/projects/${project.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders
    },
    body: JSON.stringify({
      name: "Smoke test project updated",
      description: "Updated by api-smoke.ts"
    })
  });

  // 这里覆盖 PATCH /projects/:id。
  //
  // 这个检查验证：
  // - route 已经挂载
  // - request body 通过了 Zod 校验
  // - service 做完当前用户权限判断
  // - repository 真正把 name / description 写进数据库
  if (
    updatedProject.id !== project.id ||
    updatedProject.name !== "Smoke test project updated" ||
    updatedProject.description !== "Updated by api-smoke.ts"
  ) {
    throw new Error("Project update did not return expected values");
  }

  console.log(`Project updated: ${updatedProject.name}`);

  console.log("Listing projects...");

  // requestJson 统一只返回响应体里的 data。
  //
  // GET /projects 的完整响应虽然包含 meta：
  // { success: true, data: ProjectDto[], meta: {...} }
  //
  // 但这个 smoke 脚本现在只需要确认“刚创建的 project 能被列表查到”，
  // 所以这里继续把返回值当作 ProjectDto[] 使用即可。
  const projects = await requestJson<ProjectDto[]>("/projects", {
    headers: authHeaders
  });

  if (!projects.some((item) => item.id === project.id)) {
    throw new Error("Created project was not returned by GET /projects");
  }

  console.log(`Project count visible to current user: ${projects.length}`);

  console.log("Creating a todo...");

  const todo = await requestJson<TodoDto>(`/projects/${project.id}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders
    },
    body: JSON.stringify({
      title: "Smoke test todo",
      description: "Created by api-smoke.ts",
      dueDate: "2026-05-15"
    })
  });

  console.log(`Created todo: ${todo.title}`);

  console.log("Listing todos...");

  const todos = await requestJson<TodoDto[]>(`/projects/${project.id}/todos`, {
    headers: authHeaders
  });

  if (!todos.some((item) => item.id === todo.id)) {
    throw new Error("Created todo was not returned by GET /projects/:projectId/todos");
  }

  console.log(`Todo count visible in project: ${todos.length}`);

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

  console.log("Updating todo title and dueDate...");

  const updatedTodo = await requestJson<TodoDto>(`/todos/${todo.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders
    },
    body: JSON.stringify({
      title: "Smoke test todo updated",
      dueDate: "2026-06-01"
    })
  });

  // 这里覆盖 PATCH /todos/:id 的局部更新能力。
  //
  // completed 上一步已经改成 true，这一步没有传 completed。
  // 如果 PATCH 实现错误地把没传的字段重置了，这里就能发现。
  if (
    updatedTodo.title !== "Smoke test todo updated" ||
    !updatedTodo.dueDate?.includes("2026-06-01") ||
    !updatedTodo.completed
  ) {
    throw new Error("Todo title/dueDate update did not return expected values");
  }

  console.log(`Todo updated: ${updatedTodo.title}`);

  console.log("Listing completed todos...");

  // 这里验证这张任务新增的 completed query。
  //
  // requestJson 仍然只返回响应体 data，所以这里拿到的是 TodoDto[]。
  // 如果后端把 ?completed=true 解析错了，或者 repository 没有把 completed 放进 where，
  // 下面的断言就会失败。
  const completedTodos = await requestJson<TodoDto[]>(
    `/projects/${project.id}/todos?completed=true`,
    {
      headers: authHeaders
    }
  );

  if (!completedTodos.some((item) => item.id === todo.id)) {
    throw new Error("Completed todo was not returned by completed filter");
  }

  if (completedTodos.some((item) => !item.completed)) {
    throw new Error("Completed filter returned an incomplete todo");
  }

  console.log(`Completed todo count visible in project: ${completedTodos.length}`);

  console.log("Listing todos by dueDate range...");

  // 这里验证 dueAfter / dueBefore 的范围过滤。
  //
  // 上面已经把 Todo 的 dueDate 更新成 2026-06-01，
  // 所以它应该能被 2026-05-30 到 2026-06-05 这个范围查出来。
  const dueDateTodos = await requestJson<TodoDto[]>(
    `/projects/${project.id}/todos?dueAfter=2026-05-30&dueBefore=2026-06-05`,
    {
      headers: authHeaders
    }
  );

  if (!dueDateTodos.some((item) => item.id === todo.id)) {
    throw new Error("Todo was not returned by dueDate range filter");
  }

  console.log(`Due date filtered todo count visible in project: ${dueDateTodos.length}`);

  console.log("Clearing todo dueDate...");

  const clearedDueDateTodo = await requestJson<TodoDto>(`/todos/${todo.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders
    },
    body: JSON.stringify({
      dueDate: null
    })
  });

  // 这个检查放在 dueDate 范围查询之后。
  //
  // 因为一旦清空 dueDate，这条 Todo 就不应该再出现在 dueDate 范围查询结果里。
  // smoke 脚本的顺序也属于测试逻辑的一部分，顺序错了会制造“假失败”。
  if (clearedDueDateTodo.dueDate !== null) {
    throw new Error("Todo dueDate was not cleared");
  }

  console.log("Todo dueDate cleared.");

  console.log("Listing todos by title search...");

  // 这里验证 title=... 的模糊搜索。
  //
  // 上面创建的 Todo 标题是 "Smoke test todo"，
  // 所以 title=Smoke 应该能把它查出来。
  const titleSearchTodos = await requestJson<TodoDto[]>(
    `/projects/${project.id}/todos?title=Smoke`,
    {
      headers: authHeaders
    }
  );

  if (!titleSearchTodos.some((item) => item.id === todo.id)) {
    throw new Error("Todo was not returned by title search");
  }

  console.log(`Title search todo count visible in project: ${titleSearchTodos.length}`);

  console.log("Deleting todo...");

  await requestNoContent(`/todos/${todo.id}`, {
    method: "DELETE",
    headers: authHeaders
  });

  const todosAfterDelete = await requestJson<TodoDto[]>(`/projects/${project.id}/todos`, {
    headers: authHeaders
  });

  if (todosAfterDelete.some((item) => item.id === todo.id)) {
    throw new Error("Deleted todo was still returned by GET /projects/:projectId/todos");
  }

  console.log("Todo deleted and no longer visible in list.");

  console.log("Deleting project...");

  await requestNoContent(`/projects/${project.id}`, {
    method: "DELETE",
    headers: authHeaders
  });

  const projectsAfterDelete = await requestJson<ProjectDto[]>("/projects", {
    headers: authHeaders
  });

  if (projectsAfterDelete.some((item) => item.id === project.id)) {
    throw new Error("Deleted project was still returned by GET /projects");
  }

  console.log("Project deleted and no longer visible in list.");
  console.log("API smoke flow completed.");
}

main().catch((error: unknown) => {
  // CLI 脚本里不要静默吞掉错误。
  //
  // 如果脚本失败，要把错误打印出来，并用非 0 退出码告诉终端：
  // 这次冒烟检查没有通过。
  console.error(error);
  process.exitCode = 1;
});
