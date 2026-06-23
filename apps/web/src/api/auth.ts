import type { AuthTokenResult, LoginUserInput } from "@learn/shared";
import { buildApiUrl } from "./api-url";
import { parseApiError } from "./api-error";

export type LoginResponse = {
  success: true;
  data: AuthTokenResult;
};

export type RefreshTokenResponse = {
  success: true;
  data: AuthTokenResult;
};

export async function loginUser(input: LoginUserInput): Promise<LoginResponse> {
  // 注意这里写 /api/auth/login，而不是 api/auth/login。
  //
  // 两者区别：
  // - /api/auth/login：永远从当前站点根路径开始请求
  // - api/auth/login：相对当前页面路径请求
  //
  // 现在页面在首页时两者看起来都能用，但以后如果路由变成 /projects，
  // 相对路径就可能变成 /projects/api/auth/login，容易埋 bug。
  const response = await fetch(buildApiUrl("/auth/login"), {
    method: "POST",
    headers: {
      // HTTP 请求头名字必须是 Content-Type。
      //
      // 你之前写的是 contentType，这是 JS 对象属性名的风格，
      // 但后端 express.json() 看的是 HTTP Header: Content-Type。
      // 如果这个头不对，后端可能不知道请求体是 JSON。
      "Content-Type": "application/json"
    },
    // fetch 不能直接把普通对象当作请求体发送。
    // JSON.stringify 会把 { email, password } 转成 JSON 字符串。
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw await parseApiError(response, "登录失败，请检查邮箱或密码");
  }

  return response.json() as Promise<LoginResponse>;
}

export async function refreshAuthToken(refreshToken: string): Promise<RefreshTokenResponse> {
  const response = await fetch(buildApiUrl("/auth/refresh"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) {
    throw await parseApiError(response, "登录已过期，请重新登录");
  }

  return response.json() as Promise<RefreshTokenResponse>;
}
