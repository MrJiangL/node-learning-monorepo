import type { Project } from "@learn/shared";
import { ref } from "vue";
import { createProject, fetchProjects } from "../../../api/projects";
import { getAuthToken } from "../../../auth/token-storage";

type ProjectListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; projects: Project[] }
  | { status: "error"; message: string };

type CreateProjectFormInput = {
  name: string;
  description?: string;
};

export function useProjects() {
  const projectListState = ref<ProjectListState>({ status: "idle" });

  async function loadProjects() {
    // composable 可以保存状态，也可以提供修改状态的方法。
    //
    // 页面组件使用它时，不需要知道加载 Project 的完整细节，
    // 只需要调用 loadProjects()。
    const token = getAuthToken();

    if (!token) {
      projectListState.value = {
        status: "error",
        message: "请先登录，再加载 Project 列表"
      };
      return;
    }

    projectListState.value = { status: "loading" };

    try {
      const result = await fetchProjects(token);

      projectListState.value = {
        status: "success",
        projects: result.data
      };
    } catch (error) {
      projectListState.value = {
        status: "error",
        message: error instanceof Error ? error.message : "未知错误"
      };
    }
  }

  async function createProjectFromInput(input: CreateProjectFormInput) {
    const token = getAuthToken();

    if (!token) {
      projectListState.value = {
        status: "error",
        message: "请先登录，再创建 Project"
      };
      return;
    }

    await createProject(token, input);
    await loadProjects();
  }

  return {
    projectListState,
    loadProjects,
    createProjectFromInput
  };
}
