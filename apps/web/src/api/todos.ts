import type { CreateTodoInput, PaginatedResult, Todo, UpdateTodoInput } from "@learn/shared";
import { parseApiError } from "./api-error";
import { authenticatedFetch } from "./authenticated-fetch.ts";

export type ListTodosResponse = {
  success: true;
  data: Todo[];
  meta: PaginatedResult<Todo>["meta"];
};

export type CreateTodoResponse = {
  success: true;
  data: Todo;
};

export type UpdateTodoResponse = {
  success: true;
  data: Todo;
};

export async function fetchTodos(projectId: string, token: string): Promise<ListTodosResponse> {
  // Todo 列表是 Project 的子资源。
  //
  // projectId 放在 URL 里：
  // /projects/:projectId/todos
  //
  // 后端 service 会继续校验这个 Project 是否属于当前登录用户。
  const response = await authenticatedFetch(`/api/projects/${projectId}/todos`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw await parseApiError(response, "加载 Todo 列表失败");
  }

  return response.json() as Promise<ListTodosResponse>;
}

export async function createTodo(
  projectId: string,
  token: string,
  input: CreateTodoInput
): Promise<CreateTodoResponse> {
  const response = await authenticatedFetch(`/api/projects/${projectId}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw await parseApiError(response, "创建 Todo 失败");
  }

  return response.json() as Promise<CreateTodoResponse>;
}

export async function updateTodo(
  todoId: string,
  token: string,
  input: UpdateTodoInput
): Promise<UpdateTodoResponse> {
  // PATCH 表示局部更新。
  //
  // 这里我们只传 { completed: true/false }，
  // 后端会只更新 completed，不会覆盖 title / dueDate 等其他字段。
  const response = await authenticatedFetch(`/api/todos/${todoId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw await parseApiError(response, "更新 Todo 状态失败");
  }

  return response.json() as Promise<UpdateTodoResponse>;
}

export async function deleteTodo(todoId: string, token: string): Promise<void> {
  // DELETE /todos/:id 删除一条 Todo。
  //
  // 后端成功时返回 204 No Content。
  // 204 的意思是“成功，但没有响应体”，所以这里不需要 response.json()。
  const response = await authenticatedFetch(`/api/todos/${todoId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw await parseApiError(response, "删除 Todo 失败");
  }
}
