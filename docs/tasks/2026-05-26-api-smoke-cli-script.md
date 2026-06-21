# Task: Build API Smoke CLI Script

## 目标

上一张任务我们把 `docs/api-examples.md` 更新成了手动 curl 文档。

这张任务你要把同一套流程写成一个 Node CLI 脚本：

```text
健康检查 -> 注册 -> 登录 -> 带 token 创建计划 -> 查询计划列表
```

这类脚本通常叫 smoke test script。

它不是正式测试框架里的单元测试，而是一个“快速冒烟检查”：

```text
服务启动后，我运行一个脚本，确认最关键的 API 链路能走通。
```

---

## 你会练到什么

- 用 Node.js 直接调用 HTTP API。
- 用 `fetch` 写 GET / POST 请求。
- 理解 `Authorization: Bearer <token>` 在真实代码里怎么传。
- 学会把重复请求逻辑封装成小函数。
- 学会用脚本模拟一个用户完整操作流程。

---

## Step 1: 新建脚本文件

新建文件：

```text
apps/api/src/scripts/api-smoke.ts
```

如果 `src/scripts` 目录不存在，就先创建这个目录。

---

## Step 2: 写基础配置

先写这些代码：

```ts
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

const testPassword = "password123";
```

学习点：

- `process.env` 是 Node 读取环境变量的方式。
- `??` 表示左边是 `null` 或 `undefined` 时才使用右边默认值。
- 用时间戳生成邮箱，可以让脚本多次运行不冲突。

---

## Step 3: 写一个通用 requestJson 函数

继续写：

```ts
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

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  // fetch 接收完整 URL，所以这里把基础地址和路径拼起来。
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  // 当前 API 所有正常/错误响应都会返回 JSON。
  // 所以这里统一解析一次。
  const body = (await response.json()) as ApiResponse<T>;

  // HTTP 状态码不是 2xx，或者业务响应 success=false，都当成脚本失败。
  //
  // 这样 smoke 脚本能及时提醒我们：
  // 核心 API 链路已经断了。
  if (!response.ok || !body.success) {
    const errorMessage =
      body.success === false
        ? `${body.error.code}: ${body.error.message}`
        : `HTTP ${response.status}`;

    throw new Error(`Request ${path} failed: ${errorMessage}`);
  }

  return body.data;
}
```

学习点：

- `RequestInit` 是 fetch 的配置类型，比如 `method`、`headers`、`body`。
- 这个函数只返回 `data`，让后面的业务流程更干净。
- 如果 API 返回错误，就直接 `throw new Error(...)` 让脚本失败。

---

## Step 4: 定义响应类型

你可以先定义几个最小类型：

```ts
type UserDto = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
};

type LoginResultDto = {
  token: string;
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
```

学习点：

- DTO 可以理解成“接口传输用的数据形状”。
- 这里先写最小类型，不追求抽象。
- `userId` 目前类型上可能是 `null`，因为数据库还允许历史计划没有 owner。

---

## Step 5: 写主流程 main

继续写：

```ts
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

  const authHeaders = {
    Authorization: `Bearer ${login.token}`
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

  console.log(`Plan count visible to current user: ${plans.length}`);

  console.log("API smoke flow completed.");
}
```

学习点：

- `authHeaders` 是登录后才能组装的，因为它需要 token。
- 创建计划时同时需要 `Content-Type` 和 `Authorization`。
- 查询计划只需要 `Authorization`，因为 GET 请求没有 JSON body。

---

## Step 6: 处理脚本错误

文件最后加：

```ts
main().catch((error: unknown) => {
  // CLI 脚本里不要静默吞掉错误。
  //
  // 如果脚本失败，要把错误打印出来，并用非 0 退出码告诉终端：
  // 这次冒烟检查没有通过。
  console.error(error);
  process.exitCode = 1;
});
```

学习点：

- `process.exitCode = 1` 表示脚本失败。
- 它比直接 `process.exit(1)` 更温和，通常更适合学习阶段。

---

## Step 7: 增加 npm script

打开：

```text
apps/api/package.json
```

在 `scripts` 里增加：

```json
"smoke:api": "tsx src/scripts/api-smoke.ts"
```

注意逗号位置。

例如：

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "smoke:api": "tsx src/scripts/api-smoke.ts"
  }
}
```

如果它不是最后一项，记得上一行要有逗号。

---

## Step 8: 手动运行

先开一个终端启动 API：

```bash
npm run dev
```

再开另一个终端运行 smoke 脚本：

```bash
npm run smoke:api -w @learn/api
```

预期输出大概是：

```text
Checking API health...
Health OK: node-learning-api
Registering user: smoke-...@example.com
Registered user id: ...
Logging in...
Logged in as: smoke-...@example.com
Checking current user...
Current user: smoke-...@example.com
Creating a plan...
Created plan: Smoke test plan
Listing plans...
Plan count visible to current user: 1
API smoke flow completed.
```

---

## 完成标准

你完成后告诉我：

```text
API smoke 脚本完成了
```

我会帮你检查：

1. 脚本是否能通过 TypeScript 类型检查。
2. 是否没有把真实 token、数据库密码写进代码。
3. `npm run format:check` 是否通过。
4. `npm run test` 是否还通过。
5. 如果你的服务正在跑，我也可以帮你实际执行一次 `smoke:api`。

---

## 这张任务最重要的一句话

```text
curl 是手动验证；脚本是可重复验证。
```

你现在正在从“会调接口”往“会写工程化验证工具”过渡。
