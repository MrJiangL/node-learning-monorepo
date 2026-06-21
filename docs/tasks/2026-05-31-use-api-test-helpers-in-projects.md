# Task: Use API Test Helpers In Projects Tests

## 目标

上一张任务你已经把 `todos.test.ts` 里的重复测试准备代码抽到了：

```text
apps/api/tests/helpers/api-test-helpers.ts
```

这一张继续做同一件事，但范围仍然控制得很小：

```text
只改 projects 集成测试
```

这张任务的目标不是新增 API，而是继续练“测试工程化”：

- 测试 helper 负责准备数据和登录。
- 测试文件专注描述业务行为。
- 每次只改一个测试文件，降低风险。

---

## Step 1: 修改 projects 集成测试导入

修改：

```text
apps/api/tests/integration/projects.test.ts
```

找到文件顶部这些本地 helper：

```ts
async function registerAndLogin(...)
function authHeader(...)
async function createProject(...)
```

把它们删除。

然后从共享 helper 导入：

```ts
import {
  authHeader,
  cleanupDatabase,
  createProject,
  registerAndLogin
} from "../helpers/api-test-helpers.js";
```

注意：`projects.test.ts` 仍然需要保留：

```ts
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
```

因为这个文件里还有很多测试会直接发 HTTP 请求，也有一些地方直接查数据库确认结果。

---

## Step 2: 替换 beforeEach

把 `projects.test.ts` 里的：

```ts
beforeEach(async () => {
  await prisma.todo.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
});
```

改成：

```ts
beforeEach(async () => {
  await cleanupDatabase();
});
```

这样清理规则只维护一份。

---

## Step 3: 跑 projects 集成测试

运行：

```bash
npm run test -w @learn/api -- tests/integration/projects.test.ts
```

你要看到：

```text
tests/integration/projects.test.ts passed
```

如果失败，优先看这几类问题：

- import 路径是不是 `../helpers/api-test-helpers.js`
- 是否还有重复定义的 `registerAndLogin / authHeader / createProject`
- 是否误删了 `request / createApp / prisma` 这些仍然需要的导入

---

## Step 4: 完成后的口令

完成后告诉我：

```text
Projects 测试 helper 复用完成了
```

我会帮你：

1. 跑 projects 集成测试。
2. 跑类型检查、格式检查、构建和完整测试。
3. 看测试文件是否比之前更聚焦。
4. 决定是否继续抽 `plans.test.ts`，还是先做一次测试 helper 小复盘。
