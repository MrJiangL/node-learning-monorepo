import { z } from "zod";

// Zod 练习场
//
// 这个文件是专门给你动手改的，不属于正式业务代码。
// 练习方式：
// 1. 运行 `npm run lab:zod -w @learn/api`，先看到失败。
// 2. 根据失败信息修改下面的 schema。
// 3. 再运行同一个命令，直到全部通过。
//
// 注意：下面的 schema 故意写得很宽松。
// 你的任务是把它们改严格，让它们符合 labs/zod-lab.test.ts 里的测试。

export const learnerProfileSchema = z.object({
  // 练习 1：
  // username 应该是一个去掉前后空格后的字符串。
  // 长度至少 2，最多 20。
  username: z.string().trim().min(2).max(20),

  // 练习 2：
  // email 应该是合法邮箱，并且最终结果要统一转成小写。
  email: z.string().email().toLowerCase(),

  // 练习 3：
  // level 只能是 "beginner" | "intermediate" | "advanced"。
  level: z.enum(["beginner", "intermediate", "advanced"])
});

export const createStudyTaskSchema = z.object({
  // 练习 4：
  // title 需要去掉前后空格，不能为空，最多 80 个字符。
  title: z.string().trim().min(1).max(80),

  // 练习 5：
  // minutes 应该是整数，最少 5，最多 240。
  minutes: z.number().int().min(5).max(240),

  // 练习 6：
  // tags 是可选数组。
  // 如果传了 tags，每个 tag 都要去掉空格、至少 1 个字符、最多 20 个字符。
  tags: z.array(z.string().trim().min(1).max(20)).optional()
});

export type LearnerProfile = z.infer<typeof learnerProfileSchema>;
export type CreateStudyTaskInput = z.infer<typeof createStudyTaskSchema>;
