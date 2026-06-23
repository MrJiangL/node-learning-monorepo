import { buildApiUrl } from "./api-url";

export type HealthResponse = {
  success: true;
  data: {
    status: string;
    service: string;
  };
};

export async function fetchHealth(): Promise<HealthResponse> {
  // 前端只请求 /api/health。
  //
  // 开发环境下，Vite proxy 会把请求转发到后端 /health。
  // 这样浏览器看到的是同源请求，第一步不用先处理 CORS。
  const response = await fetch(buildApiUrl("/health"));

  if (!response.ok) {
    throw new Error("后端健康检查请求失败");
  }

  return response.json() as Promise<HealthResponse>;
}
