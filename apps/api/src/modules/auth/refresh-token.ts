import { createHash, randomBytes } from "node:crypto";

const REFRESH_TOKEN_BYTES = 32;
const REFRESH_TOKEN_EXPIRES_IN_DAYS = 7;

export function createRefreshToken(): string {
  // refresh token 要足够随机，不能用 userId、email、时间戳这种可猜的内容。
  //
  // randomBytes(32) 会生成 32 字节随机值，也就是 256 bit 随机强度。
  // base64url 适合放在 JSON / URL / HTTP body 里：
  // - 不包含 + / 这类普通 base64 里对 URL 不友好的字符
  // - 字符串长度也比 hex 更短
  return randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
}

export function hashRefreshToken(refreshToken: string): string {
  // refresh token 和密码有点像：拿到它的人就能换新的 access token。
  //
  // 所以数据库里不要保存 refresh token 明文。
  // 我们保存 sha256 hash：
  // - 用户请求 refresh/logout 时，把用户传来的 refreshToken 再 hash 一次
  // - 用 hash 去数据库查 session
  //
  // 这样即使数据库泄露，攻击者也不能直接拿 refresh token 调接口。
  return createHash("sha256").update(refreshToken).digest("hex");
}

export function getRefreshTokenExpiresAt(): Date {
  // Date.now() 返回的是当前时间戳 number，不是 Date。
  //
  // Prisma DateTime 字段需要 Date 对象，
  // 所以这里先算出 7 天后的时间戳，再 new Date(...) 包成 Date。
  const expiresInMs = REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;

  return new Date(Date.now() + expiresInMs);
}
