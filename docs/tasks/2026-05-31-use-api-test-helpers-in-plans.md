# Task: Use API Test Helpers In Plans Tests

## 目标

你已经把共享 API test helper 用到了：

- `todos.test.ts`
- `projects.test.ts`

这一张继续把它用到：

```text
apps/api/tests/integration/plans.test.ts
```

`plans.test.ts` 是目前集成测试里最长的一个文件，所以这张任务要小心一点：

- 只抽重复 helper。
- 不改测试行为。
- 不顺手重构断言。

---

## Step 1: 修改 plans 集成测试导入

修改：

```text
apps/api/tests/integration/plans.test.ts
```

删除文件顶部本地定义的：

```ts
async function registerAndLogin(...)
function authHeader(...)
```

然后从共享 helper 导入：

```ts
import { authHeader, cleanupDatabase, registerAndLogin } from "../helpers/api-test-helpers.js";
```

保留这些导入：

```ts
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
```

原因：

- `request`：测试里还要直接发 HTTP 请求。
- `createApp`：每个测试仍然要创建 app。
- `prisma`：部分测试会直接查数据库确认数据。

---

## Step 2: 替换 beforeEach

把 `plans.test.ts` 里的数据库清理代码：

```ts
beforeEach(async () => {
  await prisma.plan.deleteMany();
  await prisma.user.deleteMany();
});
```

改成：

```ts
beforeEach(async () => {
  await cleanupDatabase();
});
```

虽然 plans 测试不一定创建 Project / Todo，但统一清理规则可以避免测试之间互相影响。

---

## Step 3: 跑 plans 集成测试

运行：

```bash
npm run test -w @learn/api -- tests/integration/plans.test.ts
```

你要看到：

```text
tests/integration/plans.test.ts passed
```

如果失败，优先检查：

- import 路径是不是 `../helpers/api-test-helpers.js`
- 有没有漏删本地 `registerAndLogin / authHeader`
- 有没有误删 `request / createApp / prisma`

---

## Step 4: 完成后的口令

完成后告诉我：

```text
Plans 测试 helper 复用完成了
```

我会帮你：

1. 跑 plans 集成测试。
2. 跑类型检查、格式检查、构建和完整测试。
3. 看 `plans.test.ts` 有没有保持行为不变。
4. 做一次测试 helper 小阶段复盘。
