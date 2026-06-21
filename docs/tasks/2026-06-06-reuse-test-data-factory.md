# Task: 后端测试工程化：复用测试数据工厂清理集成测试

## 背景

你已经新增了：

```text
apps/api/tests/helpers/test-data-factory.ts
```

现在里面有：

```text
createFactoryUser()
createFactoryProject()
createFactoryTodo()
```

上一张任务只要求你改造一个 `todos.test.ts` 用例。

这张任务继续推进一点，但不要大改。

目标是选 2 到 3 个 integration test，把“准备已有数据”的部分改成 factory，让测试更聚焦行为断言。

---

## 你会练到什么

- 区分“测试创建接口”和“准备已有数据”
- 用 factory 降低测试准备代码噪音
- 保持 integration test 的业务意图清晰
- 避免过度抽象测试 helper
- 继续用中文测试描述理解测试行为

---

## 核心判断规则

先记住这个规则：

```text
如果测试目标是创建接口本身，就不要用 factory 绕过创建接口。
如果测试目标是查询、更新、删除、权限边界，就可以用 factory 准备已有数据。
```

例如：

```text
POST /projects 创建项目
```

这个测试不适合用 `createFactoryProject()` 创建项目，因为它要验证的就是创建接口。

但：

```text
GET /projects/:id 查询项目详情
PATCH /projects/:id 更新项目
DELETE /projects/:id 删除项目
```

这些测试可以先用 factory 准备 project，再验证接口行为。

---

## 任务 1：阅读 Projects 集成测试

打开：

```text
apps/api/tests/integration/projects.test.ts
```

找出 2 个适合改造的测试。

优先选择这些类型：

```text
查询已有 project
更新已有 project
删除已有 project
不能访问别人的 project
分页 / 排序里准备多条 project
```

不要优先改造：

```text
创建 project 的测试
创建 project 同时创建初始 todo 的测试
```

因为这些测试的目标就是验证创建接口。

---

## 任务 2：引入 factory helper

在：

```text
apps/api/tests/integration/projects.test.ts
```

新增 import：

```ts
import { createFactoryProject, createFactoryUser } from "../helpers/test-data-factory.js";
```

如果你要准备 todo，也可以额外引入：

```ts
createFactoryTodo;
```

---

## 任务 3：改造一个“访问别人 project”的测试

找到类似这种测试：

```text
不能访问别人的 project
不能更新别人的 project
不能删除别人的 project
```

把“别人拥有的 project”改成用 factory 创建。

示例写法：

```ts
it("不能访问别人的 project", async () => {
  const app = createApp();
  const currentUser = await registerAndLogin(app, "project-boundary-current@example.com");
  const anotherUser = await createFactoryUser({
    email: "project-boundary-owner@example.com"
  });
  const anotherProject = await createFactoryProject({
    userId: anotherUser.id,
    name: "Private project"
  });

  const response = await request(app)
    .get(`/projects/${anotherProject.id}`)
    .set(authHeader(currentUser.token));

  expect(response.status).toBe(404);
  expect(response.body.error.code).toBe("PROJECT_NOT_FOUND");
});
```

这个测试的重点是：

```text
当前用户不能访问别人的 project。
```

所以别人的 user/project 不一定要走 HTTP API 创建，直接用 factory 准备更清楚。

---

## 任务 4：再改造一个“已有 project 行为”的测试

再找一个适合的测试，比如：

```text
当前用户可以更新自己的 project
当前用户可以删除自己的 project
查询 project 详情
分页列表里准备多条 project
```

如果测试重点不是创建 project，就可以这样准备：

```ts
const auth = await registerAndLogin(app, "project-update-owner@example.com");
const project = await createFactoryProject({
  userId: auth.user.id,
  name: "Old project name",
  description: "Old description"
});
```

然后继续通过 API 验证行为：

```ts
const response = await request(app)
  .patch(`/projects/${project.id}`)
  .set(authHeader(auth.token))
  .send({
    name: "New project name"
  });
```

注意：

```text
factory 只负责准备“已有数据”。
真正要验证的 API 行为仍然要通过 request(app) 发 HTTP 请求。
```

---

## 任务 5：运行验证

先跑 projects 测试：

```bash
npm run test -w @learn/api -- tests/integration/projects.test.ts
```

再跑类型检查：

```bash
npm run typecheck -w @learn/api
```

最后跑格式检查：

```bash
npm run format:check
```

如果格式检查不通过：

```bash
npm run format
npm run format:check
```

---

## 完成标准

- [ ] `projects.test.ts` 至少 2 个测试开始复用 test data factory
- [ ] 没有用 factory 绕过“创建接口本身”的测试
- [ ] 被改造的测试仍然通过 HTTP 请求验证目标行为
- [ ] 测试描述可以保留中文，新增测试描述优先用中文
- [ ] `npm run test -w @learn/api -- tests/integration/projects.test.ts` 通过
- [ ] `npm run typecheck -w @learn/api` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
测试数据工厂复用完成了
```
