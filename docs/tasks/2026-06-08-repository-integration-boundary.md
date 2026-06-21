# Task: 测试金字塔强化：Repository integration test 边界

## 背景

上一张任务你练的是 service unit test：

```text
service 发现权限不通过时，不应该继续调用 repository.delete / repository.update。
```

那一层用的是 fake repository，因为 service 单元测试的重点不是 MySQL，而是业务流程：

```text
先查 Project -> 判断归属 -> 决定是否继续写入
```

这一张任务要切到 repository integration test。

repository integration test 的重点是：

```text
真实 Prisma repository 写出来的查询和数据库行为是否正确。
```

所以这一层要碰真实 MySQL / Prisma，但不要测 Express、JWT、HTTP 状态码、service 权限判断。

---

## 你会练到什么

- repository integration test 和 service unit test 的区别
- 为什么 repository 测试可以直接用 Prisma 准备数据
- 为什么 repository 层找不到数据通常返回 `null`，不是抛 HTTP 404
- 如何验证 `findAll` 的分页和用户隔离是数据库查询行为，而不是 service 行为
- 如何给测试写中文描述

---

## 任务 1：打开 Project Prisma repository 测试

打开：

```text
apps/api/tests/unit/projects.prisma-repository.test.ts
```

虽然文件夹叫 `unit`，但这个文件实际是 integration test，因为它会连接真实 Prisma / MySQL。

重点看三个东西：

```ts
beforeEach(async () => {
  await prisma.todo.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
});
```

这个负责每个测试前清空数据，避免测试互相污染。

```ts
async function createTestUser(email: string) {
  return prisma.user.create(...)
}
```

这个负责直接准备用户数据，不走注册接口。

```ts
const repository = createPrismaProjectRepository();
```

这才是当前测试真正要测的对象。

---

## 任务 2：把一个英文测试描述改成中文

找到这个测试：

```ts
it("creates a project for the provided user", async () => {
```

改成：

```ts
it("给指定用户创建 Project", async () => {
```

再找到：

```ts
it("lists only projects owned by the provided user", async () => {
```

改成：

```ts
it("列表只返回指定用户自己的 Project", async () => {
```

这一步不是为了“翻译好看”，而是为了以后你扫测试报告时能快速理解业务规则。

---

## 任务 3：新增一个分页边界测试

在已有的：

```ts
it("分页返回当前用户的 projects", async () => {
  ...
});
```

后面新增一个测试。

测试名：

```ts
it("分页超出数据范围时返回空列表和正确 meta", async () => {
```

完整测试代码：

```ts
it("分页超出数据范围时返回空列表和正确 meta", async () => {
  const repository = createPrismaProjectRepository();
  const owner = await createTestUser("project-empty-page-owner@example.com");

  await repository.create({ name: "Project 1" }, owner.id);
  await repository.create({ name: "Project 2" }, owner.id);

  const result = await repository.findAll({
    userId: owner.id,
    page: 2,
    pageSize: 2,
    sortBy: "createdAt",
    sortOrder: "asc"
  });

  expect(result.data).toEqual([]);
  expect(result.meta).toEqual({
    page: 2,
    pageSize: 2,
    total: 2,
    totalPages: 1
  });
});
```

这个测试验证的是 repository 查询行为：

```text
当前用户只有 2 条数据，每页 2 条，请求第 2 页时，data 应该是空数组。
```

但是 `meta.total` 仍然应该是 2，因为总数没有变。

---

## 任务 4：给这个测试补学习型注释

在 `const result = await repository.findAll(...)` 前面加注释：

```ts
// 这里故意请求第 2 页。
//
// 当前用户只有 2 条 Project，pageSize 也是 2，
// 所以第 1 页刚好放完全部数据，第 2 页应该没有任何 data。
//
// 但 meta.total 仍然要表示“数据库里匹配条件的总数量”，不能因为当前页为空就变成 0。
```

这个点很重要：

```text
data 是当前页数据。
meta.total 是符合条件的总数据量。
```

它们不是同一个概念。

---

## 任务 5：运行验证

先跑 Project repository 测试：

```bash
npm run test -w @learn/api -- tests/unit/projects.prisma-repository.test.ts
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

- [ ] 两个英文 `it(...)` 描述改成中文
- [ ] 新增中文测试：分页超出数据范围时返回空列表和正确 meta
- [ ] 新测试使用 `createPrismaProjectRepository()`
- [ ] 新测试只验证 repository 行为，不引入 Express / Supertest / JWT
- [ ] 新测试断言 `data` 是空数组
- [ ] 新测试断言 `meta.total` 仍然是 2
- [ ] `npm run test -w @learn/api -- tests/unit/projects.prisma-repository.test.ts` 通过
- [ ] `npm run typecheck -w @learn/api` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
Repository integration 边界完成了
```
