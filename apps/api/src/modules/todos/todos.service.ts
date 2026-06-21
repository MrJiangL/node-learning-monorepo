import type { CreateTodoInput, ListSortBy, SortOrder, UpdateTodoInput } from "@learn/shared";
import { AppError } from "../../errors/app-error.js";
import { HTTP_STATUS } from "../../http/http-status.js";
import type { ProjectRepository } from "../projects/projects.repository.js";
import type { TodoRepository } from "./todos.repository.js";
import { ERROR_CODE } from "../../errors/error-code.js";
import type { ActivityLogService } from "../activity-logs/activity-logs.service.js";

type CreateTodoServiceOptions = {
  activityLogService?: ActivityLogService;
};

export function createTodoService(
  todoRepository: TodoRepository,
  projectRepository: ProjectRepository,
  options: CreateTodoServiceOptions = {}
) {
  async function requireOwnedProject(projectId: string, currentUserId: string) {
    // Todo 本身没有 userId。
    //
    // 所以创建/列表 Todo 前，必须先检查它所属的 Project 是否属于当前用户。
    const project = await projectRepository.findById(projectId);

    if (!project || project.userId !== currentUserId) {
      throw new AppError(
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODE.PROJECT_NOT_FOUND,
        "Project was not found"
      );
    }

    return project;
  }

  async function requireOwnedTodo(todoId: string, currentUserId: string) {
    // 更新 Todo 时，URL 里只有 todoId，没有 projectId。
    //
    // 所以这里要先查 Todo，再通过 todo.projectId 查 Project，
    // 最后判断 Project.userId 是否等于当前用户 id。
    const todo = await todoRepository.findById(todoId);

    if (!todo) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, ERROR_CODE.TODO_NOT_FOUND, "Todo was not found");
    }

    const project = await requireOwnedProject(todo.projectId, currentUserId);

    // Todo 日志也要带 Project 快照。
    //
    // 所以这里不能只返回 todo。
    // 因为调用方后面记录 ActivityLog 时，还需要知道这个 Todo 当时属于哪个 Project，
    // 以及这个 Project 当时叫什么名字。
    return { todo, project };
  }

  return {
    async createTodo(projectId: string, input: CreateTodoInput, currentUserId: string) {
      const project = await requireOwnedProject(projectId, currentUserId);
      const todo = await todoRepository.create(input, projectId);

      await options.activityLogService?.record({
        action: "todo.created",
        message: `创建了 Todo ${todo.title}`,
        metadata: {
          todoId: todo.id,
          title: todo.title
        },
        userId: currentUserId,
        projectId: todo.projectId,
        projectSnapshotId: project.id,
        projectSnapshotName: project.name
      });

      return todo;
    },

    async listTodos(
      projectId: string,
      pagination: {
        page: number;
        pageSize: number;
        sortBy: ListSortBy;
        sortOrder: SortOrder;
        completed?: boolean;
        dueAfter?: string;
        dueBefore?: string;
        title?: string;
      },
      currentUserId: string
    ) {
      await requireOwnedProject(projectId, currentUserId);

      // service 不自己切数组，也不自己查数据库。
      //
      // 它只负责业务规则：
      // 1. 当前用户必须拥有这个 Project
      // 2. 通过后，把分页参数交给 repository
      //
      // 这样以后 repository 从 Prisma 换成别的数据库时，
      // service 的权限规则仍然不用改。
      return todoRepository.findAll({
        projectId,
        page: pagination.page,
        pageSize: pagination.pageSize,
        sortBy: pagination.sortBy,
        sortOrder: pagination.sortOrder,
        completed: pagination.completed,
        dueAfter: pagination.dueAfter,
        dueBefore: pagination.dueBefore,
        title: pagination.title
      });
    },

    async updateTodo(id: string, input: UpdateTodoInput, currentUserId: string) {
      const { todo: existingTodo, project } = await requireOwnedTodo(id, currentUserId);

      const todo = await todoRepository.update(id, input);

      if (!todo) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, ERROR_CODE.TODO_NOT_FOUND, "Todo was not found");
      }

      // 只有从“未完成”变成“完成”才记录 todo.completed。
      //
      // 如果 Todo 原本已经 completed=true，再次 PATCH { completed: true }，
      // 业务上更像一次普通更新，不应该重复记录“完成了 Todo”。
      const action =
        input.completed === true && !existingTodo.completed ? "todo.completed" : "todo.updated";

      await options.activityLogService?.record({
        action,
        message:
          action === "todo.completed" ? `完成了 Todo ${todo.title}` : `更新了 Todo ${todo.title}`,
        metadata: {
          todoId: todo.id,
          title: todo.title,
          changedFields: Object.keys(input)
        },
        userId: currentUserId,
        projectId: todo.projectId,
        projectSnapshotId: project.id,
        projectSnapshotName: project.name
      });

      return todo;
    },

    async deleteTodo(id: string, currentUserId: string) {
      // requireOwnedTodo 会做完整权限判断：
      // 1. 按 todoId 找 Todo
      // 2. 用 todo.projectId 找 Project
      // 3. 判断 project.userId 是否等于当前用户
      const { todo: existingTodo, project } = await requireOwnedTodo(id, currentUserId);
      const deletedTodo = await todoRepository.delete(id);

      if (!deletedTodo) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, ERROR_CODE.TODO_NOT_FOUND, "Todo was not found");
      }

      await options.activityLogService?.record({
        action: "todo.deleted",
        message: `删除了 Todo ${existingTodo.title}`,
        metadata: {
          todoId: existingTodo.id,
          title: existingTodo.title
        },
        userId: currentUserId,
        projectId: existingTodo.projectId,
        projectSnapshotId: project.id,
        projectSnapshotName: project.name
      });

      return deletedTodo;
    }
  };
}
