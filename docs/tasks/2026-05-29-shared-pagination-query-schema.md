# Task: Shared Pagination Query Schema

## 目标

现在分页 query 规则在两个地方重复出现：

```text
apps/api/src/modules/plans/plans.schema.ts
apps/api/src/modules/todos/todos.schema.ts
```

重复内容大概是：

```ts
page: z.coerce.number().int().min(1).default(1),
pageSize: z.coerce.number().int().min(1).max(50).default(10)
```

这一张任务把它抽成一个共享 helper。

你要练的是：

- 把重复 Zod schema 抽到公共文件。
- 保持 plans 的 `difficulty` query 仍然可用。
- 保持 todos 的分页 query 行为不变。
- 用中文 `it(...)` 描述测试意图。

---

## Step 1: 创建共享 pagination schema

创建文件：

```text
apps/api/src/http/pagination-query-schema.ts
```

写入：

```ts
import { z } from "zod";

// 这个 schema 只负责“分页参数”。
//
// 注意它不关心业务资源是什么：
// - Plans 可以分页
// - Todos 可以分页
// - 以后 Projects 也可以分页
//
// 把它放在 src/http，是因为 page/pageSize 来自 HTTP query string，
// 属于 API 边界的通用输入规则。
export const paginationQuerySchema = z.object({
  // URL query 参数天然是字符串。
  //
  // 例如 ?page=2 到 Express 里通常是 "2"。
  // z.coerce.number() 会先尝试把字符串转成数字，再继续校验 int/min/default。
  page: z.coerce.number().int().min(1).default(1),

  // pageSize 限制最大 50。
  //
  // 这是一个基础保护，避免用户通过 ?pageSize=999999 一次拉太多数据。
  pageSize: z.coerce.number().int().min(1).max(50).default(10)
});
```

---

## Step 2: 更新 plans schema

打开：

```text
apps/api/src/modules/plans/plans.schema.ts
```

新增导入：

```ts
import { paginationQuerySchema } from "../../http/pagination-query-schema.js";
```

把 `listPlansQuerySchema` 从：

```ts
export const listPlansQuerySchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10)
});
```

改成：

```ts
export const listPlansQuerySchema = paginationQuerySchema.extend({
  // plans 列表除了分页，还支持按 difficulty 过滤。
  //
  // extend 的意思是：
  // 先复用 paginationQuerySchema 里的 page/pageSize，
  // 再额外加上 plans 自己需要的 difficulty。
  difficulty: z.enum(["easy", "medium", "hard"]).optional()
});
```

学习点：

```text
z.object(...).extend(...) 可以在原 schema 基础上继续添加字段。
```

---

## Step 3: 更新 todos schema

打开：

```text
apps/api/src/modules/todos/todos.schema.ts
```

新增导入：

```ts
import { paginationQuerySchema } from "../../http/pagination-query-schema.js";
```

把：

```ts
export const listTodosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10)
});
```

改成：

```ts
// Todo 列表目前只有分页参数。
//
// 直接复用 paginationQuerySchema，避免 plans/todos 各自维护一份 page/pageSize 规则。
export const listTodosQuerySchema = paginationQuerySchema;
```

顺手检查：

```text
如果 todos.schema.ts 里有没用到的 import，也删掉。
```

---

## Step 4: 给共享 schema 写单元测试

创建文件：

```text
apps/api/tests/unit/pagination-query-schema.test.ts
```

写入：

```ts
import { describe, expect, it } from "vitest";
import { paginationQuerySchema } from "../../src/http/pagination-query-schema.js";

describe("pagination query schema", () => {
  it("不传分页参数时使用默认值", () => {
    const result = paginationQuerySchema.parse({});

    expect(result).toEqual({
      page: 1,
      pageSize: 10
    });
  });

  it("把字符串分页参数转换成数字", () => {
    const result = paginationQuerySchema.parse({
      page: "2",
      pageSize: "20"
    });

    expect(result).toEqual({
      page: 2,
      pageSize: 20
    });
  });

  it("拒绝小于 1 的页码", () => {
    const result = paginationQuerySchema.safeParse({
      page: "0",
      pageSize: "10"
    });

    expect(result.success).toBe(false);
  });

  it("拒绝过大的每页数量", () => {
    const result = paginationQuerySchema.safeParse({
      page: "1",
      pageSize: "51"
    });

    expect(result.success).toBe(false);
  });
});
```

注意：

```text
这张任务开始，测试 it(...) 描述请用中文。
```

---

## Step 5: 补 plans/todos schema 行为测试

你可以继续在同一个测试文件里补，也可以新建模块 schema 测试。

建议新建：

```text
apps/api/tests/unit/list-query-schema.test.ts
```

写入：

```ts
import { describe, expect, it } from "vitest";
import { listPlansQuerySchema } from "../../src/modules/plans/plans.schema.js";
import { listTodosQuerySchema } from "../../src/modules/todos/todos.schema.js";

describe("list query schemas", () => {
  it("plans 列表同时支持分页和 difficulty 过滤", () => {
    const result = listPlansQuerySchema.parse({
      page: "2",
      pageSize: "10",
      difficulty: "easy"
    });

    expect(result).toEqual({
      page: 2,
      pageSize: 10,
      difficulty: "easy"
    });
  });

  it("todos 列表复用分页默认值", () => {
    const result = listTodosQuerySchema.parse({});

    expect(result).toEqual({
      page: 1,
      pageSize: 10
    });
  });
});
```

---

## Step 6: 跑测试

先跑本任务相关测试：

```bash
npm run test -w @learn/api -- tests/unit/pagination-query-schema.test.ts tests/unit/list-query-schema.test.ts
```

再跑类型检查：

```bash
npm run typecheck
```

如果都过，再跑全量：

```bash
npm run test
npm run format:check
npm run build
```

完成后告诉我：

```text
分页 schema 抽取完成了
```

然后我会继续帮你：

- 跑完整验证。
- 检查有没有重复 schema 没删干净。
- 补更细的中文注释。
- 更新任务索引。
- 给下一张任务卡。
