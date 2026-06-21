# Task: 测试金字塔强化：Service 单元测试里的协作者断言

## 背景

你已经写过不少 service 单元测试。

当前 `projects.service.test.ts` 里已经能验证：

```text
当前用户可以查看 / 删除 / 更新自己的 Project
当前用户不能查看 / 删除 / 更新别人的 Project
```

但现在这些测试主要断言：

```text
service 最后抛出了什么错误
```

下一步要练一个更细的测试设计点：

```text
当权限不通过时，service 不应该继续调用 repository.update / repository.delete。
```

这叫协作者断言。

service 单元测试不只关心结果，也可以关心：

```text
service 有没有正确调用它依赖的 repository。
```

---

## 你会练到什么

- fake repository 不只是返回数据，还可以记录调用
- service unit test 如何验证“不应该发生的副作用”
- 为什么权限失败时不能继续执行 update / delete
- 如何写更有业务含义的中文测试描述
- 如何避免把 service 单元测试写成 API 集成测试

---

## 任务 1：打开 Project service 测试

打开：

```text
apps/api/tests/unit/projects.service.test.ts
```

重点看：

```text
createFakeProjectRepository()
```

它现在已经记录了：

```ts
created;
createdWithTodos;
```

这说明 fake repository 不只是模拟数据库，也可以记录 service 有没有正确调用它。

---

## 任务 2：给 fake repository 增加调用记录

在 `createFakeProjectRepository()` 的返回类型里增加：

```ts
deletedIds: string[];
updatedCalls: Array<{ id: string; input: UpdateProjectInput }>;
```

你需要先从 shared 类型里引入 `UpdateProjectInput`。

文件开头原来类似：

```ts
import type {
  CreateProjectInput,
  CreateProjectWithTodosInput,
  Project,
  ProjectWithTodos,
  Todo
} from "@learn/shared";
```

改成：

```ts
import type {
  CreateProjectInput,
  CreateProjectWithTodosInput,
  Project,
  ProjectWithTodos,
  Todo,
  UpdateProjectInput
} from "@learn/shared";
```

然后在 fake repository 内部增加：

```ts
const deletedIds: string[] = [];
const updatedCalls: Array<{ id: string; input: UpdateProjectInput }> = [];
```

最后 return 对象里暴露出来：

```ts
return {
  created,
  createdWithTodos,
  deletedIds,
  updatedCalls,
  ...
};
```

---

## 任务 3：记录 delete / update 调用

在 fake repository 的 `delete(id)` 里，真正删除前记录：

```ts
deletedIds.push(id);
```

示例：

```ts
async delete(id) {
  deletedIds.push(id);

  const project = projects.find((item) => item.id === id);

  if (!project) {
    return null;
  }

  projects = projects.filter((item) => item.id !== id);
  return project;
}
```

在 `update(id, input)` 里，真正更新前记录：

```ts
updatedCalls.push({ id, input });
```

示例：

```ts
async update(id, input) {
  updatedCalls.push({ id, input });

  const project = projects.find((item) => item.id === id);

  if (!project) {
    return null;
  }

  ...
}
```

这两个数组不是业务逻辑需要的，是测试观察点。

---

## 任务 4：补一个“不能删除别人 Project 时不会调用 delete”的测试

在 `describe("project service 权限和归属规则", () => { ... })` 里新增：

```ts
it("不能删除别人的 Project 时，不会调用 repository.delete", async () => {
  const repository = createFakeProjectRepository();
  const service = createProjectService(repository);

  const createdProject = await service.createProject({ name: "Private project" }, "user-2");

  await expect(service.deleteProject(createdProject.id, "user-1")).rejects.toMatchObject({
    statusCode: 404,
    code: "PROJECT_NOT_FOUND"
  });

  expect(repository.deletedIds).toEqual([]);
});
```

这个测试和已有的“不能删除别人的 Project”很像，但多了一层断言：

```text
权限失败后，service 没有继续调用 repository.delete。
```

---

## 任务 5：补一个“不能更新别人 Project 时不会调用 update”的测试

继续新增：

```ts
it("不能更新别人的 Project 时，不会调用 repository.update", async () => {
  const repository = createFakeProjectRepository();
  const service = createProjectService(repository);

  const createdProject = await service.createProject({ name: "Private project" }, "user-2");

  await expect(
    service.updateProject(
      createdProject.id,
      {
        name: "Hacked project"
      },
      "user-1"
    )
  ).rejects.toMatchObject({
    statusCode: 404,
    code: "PROJECT_NOT_FOUND"
  });

  expect(repository.updatedCalls).toEqual([]);
});
```

这能验证：

```text
service 在权限判断失败后，没有继续做写操作。
```

---

## 任务 6：运行验证

先跑 Project service 单元测试：

```bash
npm run test -w @learn/api -- tests/unit/projects.service.test.ts
```

再跑 API 类型检查：

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

- [ ] fake repository 增加 `deletedIds`
- [ ] fake repository 增加 `updatedCalls`
- [ ] `delete(id)` 会记录删除调用
- [ ] `update(id, input)` 会记录更新调用
- [ ] 新增中文测试：不能删除别人的 Project 时，不会调用 `repository.delete`
- [ ] 新增中文测试：不能更新别人的 Project 时，不会调用 `repository.update`
- [ ] `npm run test -w @learn/api -- tests/unit/projects.service.test.ts` 通过
- [ ] `npm run typecheck -w @learn/api` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
Service 协作者断言完成了
```
