# Task: OpenAPI 工程化复盘：文档、Schema 和 Swagger UI 怎么协作

## 背景

你已经连续做了几张 OpenAPI 任务：

```text
docs/openapi.json
GET /openapi.json
GET /docs
Swagger UI
Zod 转 JSON Schema 实验
Project / Todo 核心接口文档
```

现在先做一次复盘。

这张任务不新增代码，主要把 OpenAPI 这条线串起来：

```text
OpenAPI 文档是什么？
Swagger UI 是什么？
Zod schema 能帮什么？
哪些内容仍然需要手写？
```

---

## 你会练到什么

- 区分 OpenAPI JSON 和 Swagger UI
- 理解 `paths` 和 `components.schemas`
- 理解 path -> method -> responses 的层级
- 复盘 `204 No Content` 为什么不写 body
- 理解 Zod 只能辅助 schema，不能替代完整 OpenAPI

---

## 任务 1：创建复盘文档

创建文件：

```text
docs/reviews/openapi-docs-flow.md
```

写入：

```markdown
# OpenAPI 文档工程化复盘

## OpenAPI JSON 和 Swagger UI 有什么区别？

...

## paths 和 components.schemas 分别负责什么？

...

## 为什么 method 必须放在 path 下面？

...

## 为什么 204 不写 response body？

...

## Zod 能帮 OpenAPI 做什么？

...

## Zod 不能替代 OpenAPI 的哪些部分？

...

## 我现在怎么看 API 文档工程化？

...
```

---

## 任务 2：结合这次 patch 结构错误复盘

在文档里补一节：

```markdown
## 这次我踩到的结构问题

...
```

重点写清楚：

```text
错误结构：
paths.patch

正确结构：
paths["/projects/{id}"].patch
```

你可以写成：

```markdown
OpenAPI 的结构是：

path -> method -> details

所以 `patch`、`get`、`delete` 这些 method 不能直接挂在 `paths` 下。
它们必须挂在具体路径下。
```

---

## 任务 3：运行验证

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

- [ ] 新增 `docs/reviews/openapi-docs-flow.md`
- [ ] 能区分 OpenAPI JSON 和 Swagger UI
- [ ] 能解释 `paths` / `components.schemas`
- [ ] 能解释 path -> method -> details
- [ ] 能解释为什么 `204` 不写 body
- [ ] 能解释 Zod 能辅助 schema，但不能替代完整 OpenAPI
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
OpenAPI 文档工程化复盘完成了
```
