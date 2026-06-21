# Task: Redis 缓存进阶：Project 更新 / 删除后的缓存失效

## 背景

你已经把 Project 列表缓存接进了 API：

```text
GET /projects 会优先读 Redis
POST /projects 创建成功后会清理当前用户的列表缓存
```

现在还剩两个会让列表缓存变旧的操作：

```text
PATCH /projects/:id
DELETE /projects/:id
```

为什么它们也要清缓存？

```text
PATCH 改了 Project name / description，列表缓存里可能还是旧内容。
DELETE 删除了 Project，列表缓存里可能还残留这条 Project。
```

所以这张任务要补：

```text
更新成功后清缓存
删除成功后清缓存
```

---

## 你会练到什么

- 为什么缓存失效要发生在“写操作成功之后”
- 为什么失败的 PATCH / DELETE 不应该清缓存
- 为什么仍然只清当前用户的 Project 列表缓存
- 204 No Content 的接口里怎么做额外副作用
- 怎么用 API 集成测试证明缓存被清理

---

## 核心理解：清缓存的位置

这张任务里，清缓存的位置很重要。

正确顺序：

```text
1. service 更新 / 删除数据库
2. 数据库操作成功
3. 删除当前用户的 Project 列表缓存
4. 返回响应
```

不要反过来：

```text
1. 先清缓存
2. 再更新 / 删除数据库
```

原因是数据库操作可能失败。

如果数据库失败了，缓存其实不需要失效。

---

## 任务 1：PATCH 成功后清理 Project 列表缓存

修改：

```text
apps/api/src/modules/projects/projects.routes.ts
```

找到 `projectsRouter.patch("/:id")` 里的这段：

```ts
const input = updateProjectSchema.parse(request.body);
const project = await projectService.updateProject(
  request.params.id as string,
  input,
  request.user!.id
);

response.json({ success: true, data: project });
```

改成：

```ts
const input = updateProjectSchema.parse(request.body);
const currentUserId = request.user!.id;
const project = await projectService.updateProject(
  request.params.id as string,
  input,
  currentUserId
);

// 更新 Project 后，列表缓存里的 name / description 可能已经过期。
// 只有 updateProject 成功返回后，才清理缓存。
if (options.redisClient) {
  await deleteProjectListCacheByUserId(options.redisClient, currentUserId);
}

response.json({ success: true, data: project });
```

---

## 任务 2：DELETE 成功后清理 Project 列表缓存

继续修改：

```text
apps/api/src/modules/projects/projects.routes.ts
```

找到 `projectsRouter.delete("/:id")` 里的这段：

```ts
await projectService.deleteProject(request.params.id as string, request.user!.id);

// 204 No Content 表示请求成功，但响应体为空。
// 所以这里不要返回 { success: true } 这样的 JSON。
response.status(HTTP_STATUS.NO_CONTENT).send();
```

改成：

```ts
const currentUserId = request.user!.id;

await projectService.deleteProject(request.params.id as string, currentUserId);

// 删除 Project 后，列表缓存里可能还残留已经被删除的项目。
//
// 注意：即使最终返回 204，没有响应体，也仍然可以在 send() 前做清缓存这种副作用。
if (options.redisClient) {
  await deleteProjectListCacheByUserId(options.redisClient, currentUserId);
}

// 204 No Content 表示请求成功，但响应体为空。
// 所以这里不要返回 { success: true } 这样的 JSON。
response.status(HTTP_STATUS.NO_CONTENT).send();
```

---

## 任务 3：给 API 缓存测试补 PATCH / DELETE 用例

修改：

```text
apps/api/tests/integration/projects-cache-api.test.ts
```

把 helper import 改成包含 `createProject`：

```ts
import {
  authHeader,
  cleanupDatabase,
  createProject,
  registerAndLogin
} from "../helpers/api-test-helpers.js";
```

在现有两个测试后面新增：

```ts
it("PATCH /projects/:id 更新成功后会清理当前用户的 Project 列表缓存", async () => {
  const app = createApp({ projectCacheClient: client });
  const auth = await registerAndLogin(app, "project-cache-api-update@example.com");
  const project = await createProject(app, auth.token, "Old cached project");

  const cacheKey = createProjectListCacheKey({
    userId: auth.user.id,
    page: 1,
    pageSize: 10,
    sortBy: "createdAt",
    sortOrder: "asc"
  });

  await setJson(
    client,
    cacheKey,
    {
      data: [
        {
          id: project.id,
          name: "Old cached project",
          description: null,
          createdAt: "2026-06-08T00:00:00.000Z",
          updatedAt: "2026-06-08T00:00:00.000Z",
          userId: auth.user.id
        }
      ],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1
      }
    },
    60
  );

  const response = await request(app)
    .patch(`/projects/${project.id}`)
    .set(authHeader(auth.token))
    .send({ name: "Updated cached project" });

  expect(response.status).toBe(200);
  expect(await client.get(cacheKey)).toBeNull();
});

it("DELETE /projects/:id 删除成功后会清理当前用户的 Project 列表缓存", async () => {
  const app = createApp({ projectCacheClient: client });
  const auth = await registerAndLogin(app, "project-cache-api-delete@example.com");
  const project = await createProject(app, auth.token, "Project cached before delete");

  const cacheKey = createProjectListCacheKey({
    userId: auth.user.id,
    page: 1,
    pageSize: 10,
    sortBy: "createdAt",
    sortOrder: "asc"
  });

  await setJson(
    client,
    cacheKey,
    {
      data: [
        {
          id: project.id,
          name: "Project cached before delete",
          description: null,
          createdAt: "2026-06-08T00:00:00.000Z",
          updatedAt: "2026-06-08T00:00:00.000Z",
          userId: auth.user.id
        }
      ],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1
      }
    },
    60
  );

  const response = await request(app).delete(`/projects/${project.id}`).set(authHeader(auth.token));

  expect(response.status).toBe(204);
  expect(await client.get(cacheKey)).toBeNull();
});
```

---

## 任务 4：理解 createProject helper 的小影响

这两个测试会先用：

```ts
const project = await createProject(app, auth.token, "...");
```

注意：现在 `POST /projects` 已经会清理缓存。

所以测试里必须在 `createProject` 之后再写入 Redis 缓存：

```text
先创建 Project
再 setJson 写入缓存
再 PATCH / DELETE
最后断言缓存被删除
```

如果顺序反过来，`createProject` 会先把你准备好的缓存删掉，测试就不再能证明 PATCH / DELETE 的行为。

---

## 任务 5：运行验证

先确认 Redis 还活着：

```bash
npm run redis:ping -w @learn/api
```

再跑缓存 API 测试：

```bash
npm run test -w @learn/api -- tests/integration/projects-cache-api.test.ts
```

再跑原本的 Project API 测试：

```bash
npm run test -w @learn/api -- tests/integration/projects.test.ts
```

再跑类型检查：

```bash
npm run typecheck -w @learn/api
```

再跑构建：

```bash
npm run build -w @learn/api
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

- [ ] `PATCH /projects/:id` 更新成功后调用 `deleteProjectListCacheByUserId`
- [ ] `DELETE /projects/:id` 删除成功后调用 `deleteProjectListCacheByUserId`
- [ ] 清缓存使用当前登录用户 `currentUserId`
- [ ] 清缓存发生在 service 写操作成功之后
- [ ] 新增 PATCH 缓存失效 API 测试
- [ ] 新增 DELETE 缓存失效 API 测试
- [ ] 测试描述使用中文
- [ ] `npm run redis:ping -w @learn/api` 输出 `Redis ping result: PONG`
- [ ] `npm run test -w @learn/api -- tests/integration/projects-cache-api.test.ts` 通过
- [ ] `npm run test -w @learn/api -- tests/integration/projects.test.ts` 通过
- [ ] `npm run typecheck -w @learn/api` 通过
- [ ] `npm run build -w @learn/api` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
Project 更新删除缓存失效完成了
```
