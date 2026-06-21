import { z } from "zod";

// 注册接口是一个系统边界：所有来自 HTTP body 的数据都不可信。
//
// Zod 在这里负责把“外部输入”先变成“后端可以相信的输入”：
// - email 必须是真正的邮箱格式
// - password 至少 8 位，避免太弱
// - name 可以不传，但如果传了就不能是空字符串
export const registerUserSchema = z.object({
  email: z.string().trim().email("Email must be valid").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  name: z.string().trim().min(1).max(100).optional()
});

export const loginUserSchema = z.object({
  // 登录时仍然要验证 email 格式，避免无意义的数据库查询。
  email: z.string().trim().email("Email must be valid").max(255),

  // 登录不要求 min(8)，只要求用户传了密码。
  // 真正的“密码是否正确”由 service 里的 verifyPassword() 判断。
  password: z.string().min(1, "Password is required").max(100)
});

export const refreshTokenSchema = z.object({
  // refreshToken 来自 HTTP body，仍然属于外部输入。
  //
  // 这里先只校验“必须是非空字符串”：
  // - 它是不是我们签发过的 token，要去数据库查 session 才知道
  // - 它有没有过期 / 被撤销，也要由 service 层根据 session 判断
  refreshToken: z.string().min(1, "Refresh token is required")
});
