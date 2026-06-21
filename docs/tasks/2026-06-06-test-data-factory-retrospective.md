# Task: 后端测试工程化复盘：测试数据工厂怎么用才不乱

## 背景

你已经完成了两轮测试数据工厂任务：

```text
apps/api/tests/helpers/test-data-factory.ts
apps/api/tests/unit/test-data-factory.test.ts
```

并且已经在 integration tests 里开始使用：

```text
createFactoryUser()
createFactoryProject()
createFactoryTodo()
```

现在先停一下，不急着继续抽更多 helper。

测试 helper 如果没有边界，很容易变成另一个“什么都塞进去”的工具箱。

这张任务不写业务代码，主要做一份复盘，把这些问题讲清楚：

```text
什么时候用 API helper？
什么时候用 test data factory？
什么时候不应该用 factory？
factory 直接走 Prisma 时要注意什么？
```

---

## 你会练到什么

- 区分 API helper 和 data factory
- 解释为什么 factory 可以绕过 HTTP API
- 解释什么时候不能绕过 HTTP API
- 理解测试数据准备和行为断言的边界
- 总结当前项目的测试工程化进度

---

## 任务 1：创建复盘文档

创建文件：

```text
docs/reviews/test-data-factory.md
```

写入以下结构：

```markdown
# 测试数据工厂复盘

## 什么是测试数据工厂？

...

## API helper 和 test data factory 有什么区别？

...

## 什么时候应该走真实 API 准备数据？

...

## 什么时候可以直接用 factory 准备数据？

...

## factory 直接用 Prisma 时要注意什么？

...

## 当前项目里我怎么判断一个测试该用哪种方式？

...
```

---

## 任务 2：结合项目写具体例子

在文档里补这一节：

```markdown
## 项目里的例子

### 适合走 API helper 的场景

...

### 适合走 test data factory 的场景

...

### 不应该用 factory 的场景

...
```

可以参考这些例子：

```text
适合走 API helper：
- 测 POST /projects 是否真的能创建项目
- 测 POST /projects/{projectId}/todos 是否真的能创建 todo
- 测登录后 token 是否能访问受保护接口

适合走 test data factory：
- 测当前用户不能查看别人的 project
- 测当前用户不能删除别人的 todo
- 测列表接口在已有多条数据时如何分页

不应该用 factory：
- 测注册接口时不要用 createFactoryUser 绕过注册
- 测创建 todo 接口时不要用 createFactoryTodo 先创建目标 todo
```

---

## 任务 3：写一条自己的判断公式

在文档最后补一节：

```markdown
## 我的判断公式

...
```

你可以先用这个版本：

```text
如果测试目标是“创建这条数据的 API 是否正确”，就走 API。
如果测试目标是“已有数据下的查询 / 更新 / 删除 / 权限行为”，就用 factory 准备数据。
```

然后用自己的话改一下。

---

## 任务 4：运行验证

跑格式检查：

```bash
npm run format:check
```

如果格式不通过：

```bash
npm run format
npm run format:check
```

---

## 完成标准

- [ ] 新增 `docs/reviews/test-data-factory.md`
- [ ] 能区分 API helper 和 test data factory
- [ ] 能解释什么时候不能用 factory 绕过 API
- [ ] 能结合当前项目举例
- [ ] 写出自己的判断公式
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
测试数据工厂复盘完成了
```
