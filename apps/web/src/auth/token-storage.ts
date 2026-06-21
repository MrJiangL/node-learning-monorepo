const AUTH_TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export function getAuthToken(): string | null {
  // localStorage 是浏览器提供的小型持久化存储。
  //
  // 登录页会把 accessToken 保存成 auth_token。
  // 业务 API 请求时会读取这个 token，放进 Authorization header。
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string) {
  // 保存 accessToken 的 key 只应该在这个文件里出现。
  //
  // 这样以后如果想把 auth_token 改成 learn_auth_token，
  // 只需要改这里，不需要全项目搜索替换。
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  // 退出登录、refresh 失败、用户手动切换账号时，
  // accessToken 和 refreshToken 都应该一起清理。
  //
  // 如果只清 accessToken，不清 refreshToken，
  // 前端后续仍然可能拿旧 refreshToken 尝试刷新登录态。
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  // refreshToken 不直接用于访问业务 API。
  //
  // 它只在 accessToken 失效后，用来请求 /auth/refresh。
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string) {
  // 后端现在启用了 refresh token rotation。
  //
  // 每次 /auth/refresh 成功后都会返回新的 refreshToken，
  // 所以前端必须覆盖保存最新值。
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}
