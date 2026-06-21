# Task: Zod Input Boundary Practice

## 目标

下一阶段我们定为：

```text
Prisma + Zod + 测试设计强化
```

第一张先练 Zod。

原因很简单：后端所有外部输入都要先过边界校验。

你现在已经会照着写：

```ts
z.string().trim().min(1).optional();
```

但还需要真正分清：

```text
optional / nullable / transform / coerce
```

这一张任务不新增业务接口，先写一个纯 Zod 练习文件和测试文件。

你要练的是：

- `optional()`：字段可以不传。
- `nullable()`：字段可以明确传 `null`。
- `transform()`：把输入转换成业务需要的类型。
- `z.coerce.number()`：把 query string 里的数字字符串转成 number。
- 为什么不要直接用 `z.coerce.boolean()` 处理 `"false"`。

---

## Step 1: 新建练习文件

创建：

```text
apps/api/src/exercises/zod-input-boundary.ts
```

先写这个骨架：

```ts
import { z } from "zod";

export const updateProfileSchema = z.object({
  // TODO: name 可选；如果传了，要 trim，不能为空，最多 40 个字符。
  name: z.string(),

  // TODO: bio 可选；如果传 null，表示清空简介；如果传字符串，要 trim，最多 160 个字符。
  bio: z.string(),

  // TODO: website 可选；如果传空字符串或只有空格，转换成 null；否则 trim 后保留字符串。
  website: z.string()
});

export const listQuerySchema = z.object({
  // TODO: page 来自 query string，默认 1，必须是正整数。
  page: z.string(),

  // TODO: pageSize 来自 query string，默认 10，最小 1，最大 50。
  pageSize: z.string(),

  // TODO: completed 只能接受 "true" / "false"；没传表示不过滤。
  // 注意：不要直接用 z.coerce.boolean()。
  completed: z.string()
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;
```

这份骨架故意是错的。你下一步通过测试把它修好。

---

## Step 2: 新建测试文件

创建：

```text
apps/api/tests/unit/zod-input-boundary.test.ts
```

写入：

```ts
import { describe, expect, it } from "vitest";
import { listQuerySchema, updateProfileSchema } from "../../src/exercises/zod-input-boundary.js";

describe("Zod 输入边界练习", () => {
  it("updateProfileSchema 会 trim 可选 name", () => {
    const result = updateProfileSchema.parse({
      name: "  Lin  "
    });

    expect(result).toEqual({
      name: "Lin"
    });
  });

  it("updateProfileSchema 允许不传 name", () => {
    const result = updateProfileSchema.parse({});

    expect(result.name).toBeUndefined();
  });

  it("updateProfileSchema 拒绝空 name", () => {
    expect(() =>
      updateProfileSchema.parse({
        name: "   "
      })
    ).toThrow();
  });

  it("bio 支持 null 表示清空", () => {
    const result = updateProfileSchema.parse({
      bio: null
    });

    expect(result.bio).toBeNull();
  });

  it("website 会把空字符串转换成 null", () => {
    const result = updateProfileSchema.parse({
      website: "   "
    });

    expect(result.website).toBeNull();
  });

  it("website 会 trim 非空字符串", () => {
    const result = updateProfileSchema.parse({
      website: "  https://example.com  "
    });

    expect(result.website).toBe("https://example.com");
  });

  it("listQuerySchema 会把 page 和 pageSize 转成数字并填默认值", () => {
    const result = listQuerySchema.parse({});

    expect(result).toEqual({
      page: 1,
      pageSize: 10
    });
  });

  it("listQuerySchema 会解析 completed=true", () => {
    const result = listQuerySchema.parse({
      completed: "true"
    });

    expect(result.completed).toBe(true);
  });

  it("listQuerySchema 会解析 completed=false", () => {
    const result = listQuerySchema.parse({
      completed: "false"
    });

    expect(result.completed).toBe(false);
  });

  it("listQuerySchema 拒绝非法 completed", () => {
    expect(() =>
      listQuerySchema.parse({
        completed: "yes"
      })
    ).toThrow();
  });
});
```

---

## Step 3: 先跑测试，看到失败

运行：

```bash
npm run test -w @learn/api -- tests/unit/zod-input-boundary.test.ts
```

第一次失败是正常的。

你这次的任务不是马上写对，而是看失败信息，判断 schema 应该怎么改。

---

## Step 4: 你要自己修 schema

可以参考这些提示，但不要直接复制答案。

### name

你需要：

```text
string -> trim -> min -> max -> optional
```

### bio

你需要：

```text
string -> trim -> max -> nullable -> optional
```

注意：

```text
optional 是可以不传。
nullable 是可以传 null。
```

### website

你需要 `transform`。

语义是：

```text
没传 -> undefined
空字符串 -> null
非空字符串 -> trim 后的字符串
```

### page / pageSize

query string 里的数字通常是字符串：

```text
?page=2&pageSize=20
```

Express 读到的是：

```ts
{
  page: "2",
  pageSize: "20"
}
```

所以你需要：

```ts
z.coerce.number();
```

### completed

不要写：

```ts
z.coerce.boolean();
```

因为：

```ts
Boolean("false") === true;
```

你应该用：

```text
enum(["true", "false"]) -> transform
```

---

## Step 5: 完成后跑验证

先跑单个测试：

```bash
npm run test -w @learn/api -- tests/unit/zod-input-boundary.test.ts
```

然后跑：

```bash
npm run typecheck
npm run format:check
```

---

## 完成后你告诉我

你完成后直接发：

```text
Zod 输入边界练习完成了
```

我会帮你：

- 看 schema 写法有没有问题。
- 补详细中文注释。
- 跑 focused test / typecheck / format。
- 更新任务索引。
- 给你下一张 Prisma 查询专项任务卡。
