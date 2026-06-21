import type { CreateProjectInput, PaginatedResult, Project } from "@learn/shared";
import { parseApiError } from "./api-error";
import { authenticatedFetch } from "./authenticated-fetch.ts";

export type ListProjectsResponse = {
  success: true;
  data: Project[];
  meta: PaginatedResult<Project>["meta"];
};

export type CreateProjectResponse = {
  success: true;
  data: Project;
};

export async function fetchProjects(token: string): Promise<ListProjectsResponse> {
  // /api/projects 会由 Vite proxy 转发到后端 /projects。
  //
  // 这个接口受 requireAuth 保护，所以必须带 Authorization header。
  const response = await authenticatedFetch("/api/projects", {
    headers: {
      // Bearer token 是后端 requireAuth 当前支持的格式。
      //
      // 注意 Bearer 和 token 中间必须有一个空格。
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw await parseApiError(response, "加载 Project 列表失败，请确认你已经登录");
  }

  return response.json() as Promise<ListProjectsResponse>;
}

export async function createProject(
  token: string,
  input: CreateProjectInput
): Promise<CreateProjectResponse> {
  // POST /projects 创建一个当前登录用户拥有的 Project。
  //
  // userId 不从前端传，后端会从 JWT token 里解析当前用户。
  // 这就是“身份由服务端确认，不相信客户端自报 userId”。
  const response = await authenticatedFetch("/api/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw await parseApiError(response, "创建 Project 失败");
  }

  return response.json() as Promise<CreateProjectResponse>;
}
