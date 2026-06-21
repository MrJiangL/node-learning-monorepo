import { z } from "zod";

export const updateProfileSchema = z.object({
  // name 是“可选更新字段”：
  //
  // - optional()：允许 PATCH / profile 时不传 name，表示“不修改 name”
  // - trim()：把用户输入两边的空格去掉，避免 "  Lin  " 直接进入业务层
  // - min(1)：trim 之后不能为空，避免 "   " 这种看起来有内容、实际为空的输入
  // - max(40)：给输入设置边界，避免过长文本进入数据库或页面展示
  name: z.string().trim().min(1, "name 不能为空").max(40, "name 最多 40 个字符").optional(),

  // bio 同时使用 optional() 和 nullable()，这两个含义不一样：
  //
  // - optional()：字段可以不传，表示“不修改 bio”
  // - nullable()：字段可以明确传 null，表示“把 bio 清空”
  //
  // 这也是很多 PATCH 接口会用到的区别：
  // - undefined：没有提供这个字段
  // - null：提供了这个字段，并且值就是空
  bio: z.string().trim().max(160, "bio 最多 160 个字符").nullable().optional(),

  // website 的目标语义是：
  //
  // - 不传：结果是 undefined，表示“不修改 website”
  // - 传空字符串或全空格：结果是 null，表示“清空 website”
  // - 传正常字符串：先 trim，再保留字符串
  //
  // transform() 适合处理这种“输入类型和业务语义不完全一致”的场景。
  website: z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? null : value))
    .optional()
});

export const listQuerySchema = z.object({
  // URL query 参数通常是字符串。
  //
  // 例如 ?page=2 到 Express 里通常会变成 "2"。
  // z.coerce.number() 会先把 "2" 尝试转成 2，然后再执行 int/min/default。
  page: z.coerce.number().int().min(1).default(1),

  // pageSize 也来自 query string。
  //
  // max(50) 是后端常见保护：避免用户一次请求太多数据。
  pageSize: z.coerce.number().int().min(1).max(50).default(10),

  // completed 是可选过滤条件。
  //
  // 这里不要写 z.coerce.boolean()，因为 JavaScript 里：
  // Boolean("false") === true
  //
  // 所以我们明确只接受 "true" / "false"，再自己转换成真正的 boolean。
  completed: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional()
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;
