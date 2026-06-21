import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

export type AuthTokenPayload = {
  // sub 是 JWT 标准字段 subject。
  // 这里放用户 id，后续鉴权中间件会用它查询当前用户。
  sub: string;

  // email 不是鉴权的唯一依据，只是方便调试和展示。
  // 真正定位用户应优先用 sub。
  email: string;
};

export function signAuthToken(payload: AuthTokenPayload): string {
  // JWT_SECRET 是签名密钥，必须来自环境变量。
  // 任何知道这个 secret 的人都能伪造 token，所以真实项目不能硬编码在源码里。
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "1h"
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  // jwt.verify 会做两件事：
  // 1. 检查 token 签名是不是用同一个 JWT_SECRET 签出来的。
  // 2. 检查 expiresIn 这类时间规则，例如 token 是否过期。
  //
  // 如果 token 无效或过期，它会抛异常。
  // middleware 会捕获这个异常，并统一转换成 401 INVALID_TOKEN。
  const payload = jwt.verify(token, env.JWT_SECRET);

  // jsonwebtoken 的返回类型比较宽：
  // - 可能是 string
  // - 也可能是 object
  //
  // 我们自己的 signAuthToken() 签出来的是 object payload，
  // 并且要求里面必须有 sub 和 email。
  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string"
  ) {
    throw new Error("Invalid auth token payload");
  }

  return {
    sub: payload.sub,
    email: payload.email
  };
}
