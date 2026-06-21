import { clearAuthToken } from "../auth/token-storage";

type ApiErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  // fetch 解析出来的 JSON 在 TypeScript 里是 unknown。
  //
  // unknown 的意思是：“我还不知道它长什么样”。
  // 所以读取 value.error.message 前，要先确认结构真的存在。
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("success" in value) || !("error" in value)) {
    return false;
  }

  const maybeBody = value as {
    success: unknown;
    error: unknown;
  };

  if (maybeBody.success !== false) {
    return false;
  }

  if (typeof maybeBody.error !== "object" || maybeBody.error === null) {
    return false;
  }

  const maybeError = maybeBody.error as {
    code?: unknown;
    message?: unknown;
  };

  return typeof maybeError.code === "string" && typeof maybeError.message === "string";
}

export async function parseApiError(response: Response, fallbackMessage: string): Promise<Error> {
  if (response.status === 401) {
    // 401 表示当前 token 没有通过后端鉴权。
    //
    // 常见原因：
    // - token 过期
    // - token 被手动改坏
    // - 后端 JWT_SECRET 更换后旧 token 失效
    //
    // 这时继续留着旧 token 只会让用户后续请求继续失败，
    // 所以前端应该主动清理它。
    clearAuthToken();
  }

  // 有些响应可能不是 JSON，例如网络代理错误或空响应。
  // 所以这里用 try/catch 包住 response.json()，避免错误处理本身再崩掉。
  try {
    const body: unknown = await response.json();

    if (isApiErrorBody(body)) {
      return new Error(body.error.message);
    }
  } catch {
    // 解析失败时使用 fallbackMessage。
    //
    // catch 里不需要做额外处理，因为这个 helper 的职责是：
    // “尽量读后端错误，读不到就给默认错误”。
  }

  return new Error(fallbackMessage);
}
