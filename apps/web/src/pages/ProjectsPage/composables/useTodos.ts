import type { Todo } from "@learn/shared";
import { ref } from "vue";
import { createTodo, deleteTodo, fetchTodos, updateTodo } from "../../../api/todos";
import { getAuthToken } from "../../../auth/token-storage";

type TodoListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; todos: Todo[] }
  | { status: "error"; message: string };

type CreateTodoFormInput = {
  title: string;
};

type UpdateTodoTitleFormInput = {
  title: string;
};

export function useTodos() {
  const todoListState = ref<TodoListState>({ status: "idle" });

  async function loadTodos(projectId: string) {
    // Todo 是 Project 的子资源。
    //
    // 所以加载 Todo 时必须知道当前 Project 的 id，
    // 对应后端接口是 GET /projects/:projectId/todos。
    const token = getAuthToken();

    if (!token) {
      todoListState.value = {
        status: "error",
        message: "请先登录，再加载 Todo 列表"
      };
      return;
    }

    todoListState.value = { status: "loading" };

    try {
      const result = await fetchTodos(projectId, token);

      todoListState.value = {
        status: "success",
        todos: result.data
      };
    } catch (error) {
      todoListState.value = {
        status: "error",
        message: error instanceof Error ? error.message : "未知错误"
      };
    }
  }

  async function createTodoForProject(projectId: string | null, input: CreateTodoFormInput) {
    const token = getAuthToken();

    if (!token) {
      todoListState.value = {
        status: "error",
        message: "请先登录，再创建 Todo"
      };
      return;
    }

    // 这里允许 projectId 是 null，是因为页面刚进入时还没有选中 Project。
    //
    // composable 在这里兜底处理错误状态，
    // 这样调用方不需要每次都重复写“是否选择 Project”的判断。
    if (!projectId) {
      todoListState.value = {
        status: "error",
        message: "请先选择一个 Project"
      };
      return;
    }

    await createTodo(projectId, token, input);
    await loadTodos(projectId);
  }

  async function toggleTodo(projectId: string | null, todo: Todo) {
    const token = getAuthToken();

    if (!token) {
      todoListState.value = {
        status: "error",
        message: "请先登录，再更新 Todo"
      };
      return;
    }

    if (!projectId) {
      todoListState.value = {
        status: "error",
        message: "请先选择一个 Project"
      };
      return;
    }

    await updateTodo(todo.id, token, {
      completed: !todo.completed
    });

    // 更新成功后重新加载列表。
    //
    // 这样页面展示的数据会重新来自数据库，
    // 不需要前端手动去改数组里某一项的 completed。
    await loadTodos(projectId);
  }

  async function saveTodoTitle(
    projectId: string | null,
    todoId: string,
    input: UpdateTodoTitleFormInput
  ) {
    const token = getAuthToken();

    if (!token) {
      todoListState.value = {
        status: "error",
        message: "请先登录，再更新 Todo"
      };
      return;
    }

    if (!projectId) {
      todoListState.value = {
        status: "error",
        message: "请先选择一个 Project"
      };
      return;
    }

    await updateTodo(todoId, token, input);
    await loadTodos(projectId);
  }

  async function deleteTodoFromProject(projectId: string | null, todoId: string) {
    const token = getAuthToken();

    if (!token) {
      todoListState.value = {
        status: "error",
        message: "请先登录，再删除 Todo"
      };
      return;
    }

    if (!projectId) {
      todoListState.value = {
        status: "error",
        message: "请先选择一个 Project"
      };
      return;
    }

    // deleteTodo 成功时，后端返回 204 No Content。
    //
    // API client 内部已经处理了“不需要 response.json()”这件事，
    // 所以这里直接 await deleteTodo(...) 就可以。
    await deleteTodo(todoId, token);
    await loadTodos(projectId);
  }

  return {
    todoListState,
    loadTodos,
    createTodoForProject,
    toggleTodo,
    saveTodoTitle,
    deleteTodoFromProject
  };
}
