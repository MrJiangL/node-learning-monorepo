import type {
  CreateProjectInput,
  CreateProjectWithTodosInput,
  ListSortBy,
  SortOrder,
  UpdateProjectInput
} from "@learn/shared";
import { AppError } from "../../errors/app-error.js";
import { HTTP_STATUS } from "../../http/http-status.js";
import type { ProjectRepository } from "./projects.repository.js";
import { ERROR_CODE } from "../../errors/error-code.js";
import type { ActivityLogService } from "../activity-logs/activity-logs.service.js";

type CreateProjectServiceOptions = {
  activityLogService?: ActivityLogService;
};

export function createProjectService(
  projectRepository: ProjectRepository,
  options: CreateProjectServiceOptions = {}
) {
  return {
    async createProject(input: CreateProjectInput, currentUserId: string) {
      const project = await projectRepository.create(input, currentUserId);

      await options.activityLogService?.record({
        action: "project.created",
        message: `创建了项目 ${project.name}`,
        metadata: {
          projectName: project.name
        },
        userId: currentUserId,
        projectId: project.id,
        // 这里的 project 来自 projectRepository.create 的返回值。
        //
        // 创建成功后，我们手里已经有完整 Project，
        // 所以可以把当时的 id/name 作为日志快照保存下来。
        projectSnapshotId: project.id,
        projectSnapshotName: project.name
      });

      return project;
    },

    createProjectWithTodos(input: CreateProjectWithTodosInput, currentUserId: string) {
      // 和普通 createProject 一样，userId 必须来自当前登录用户。
      //
      // body 里的 name / description / todos 是用户可以提交的数据；
      // currentUserId 是 requireAuth 从 JWT 里解析出的身份。
      // 两者不能混在一起。
      return projectRepository.createWithTodos(input, currentUserId);
    },

    listProjects(
      pagination: { page: number; pageSize: number; sortBy: ListSortBy; sortOrder: SortOrder },
      currentUserId: string
    ) {
      // 列表接口只返回当前用户自己的 Project。
      //
      // 这条规则不要交给前端控制：
      // 前端传什么 query 都不应该决定能看到谁的数据。
      return projectRepository.findAll({
        userId: currentUserId,
        page: pagination.page,
        pageSize: pagination.pageSize,
        sortBy: pagination.sortBy,
        sortOrder: pagination.sortOrder
      });
    },

    async getProjectById(id: string, currentUserId: string) {
      // repository.findById 只负责“按 id 查 Project”。
      //
      // 它不知道当前登录用户是谁，所以不能在 repository 里判断归属。
      // service 拿到 project 后，再用 project.userId 和 currentUserId 做业务权限判断。
      const project = await projectRepository.findById(id);

      if (!project || project.userId !== currentUserId) {
        // 这里统一返回 404，而不是：
        // - 不存在返回 404
        // - 不属于当前用户返回 403
        //
        // 这样可以避免向调用方泄露“这个 projectId 是否真实存在”。
        throw new AppError(
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODE.PROJECT_NOT_FOUND,
          "Project was not found"
        );
      }

      return project;
    },

    async deleteProject(id: string, currentUserId: string) {
      // 删除前先查一次 Project。
      //
      // 这一步不是为了删除，而是为了做权限判断：
      // 当前用户只能删除自己的 Project。
      const project = await projectRepository.findById(id);

      if (!project || project.userId !== currentUserId) {
        throw new AppError(
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODE.PROJECT_NOT_FOUND,
          "Project was not found"
        );
      }

      await options.activityLogService?.record({
        action: "project.deleted",
        message: `删除了项目 ${project.name}`,
        metadata: {
          projectName: project.name
        },
        userId: currentUserId,
        projectId: project.id,
        projectSnapshotId: project.id,
        projectSnapshotName: project.name
      });

      const deletedProject = await projectRepository.delete(id);

      if (!deletedProject) {
        throw new AppError(
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODE.PROJECT_NOT_FOUND,
          "Project was not found"
        );
      }

      // ActivityLog.projectId 现在是可空外键。
      //
      // 删除 Project 后，数据库会把 ActivityLog.projectId 自动设置成 null。
      // 但 projectSnapshotId / projectSnapshotName 会继续保留删除前的历史事实。
      return deletedProject;
    },

    async updateProject(id: string, input: UpdateProjectInput, currentUserId: string) {
      // 更新前先查 Project，是为了做权限判断。
      //
      // repository 不知道当前登录用户是谁，所以不能把归属校验放在 repository。
      const project = await projectRepository.findById(id);

      if (!project || project.userId !== currentUserId) {
        throw new AppError(
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODE.PROJECT_NOT_FOUND,
          "Project was not found"
        );
      }

      const updatedProject = await projectRepository.update(id, input);

      if (!updatedProject) {
        throw new AppError(
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODE.PROJECT_NOT_FOUND,
          "Project was not found"
        );
      }

      await options.activityLogService?.record({
        action: "project.updated",
        message: `更新了项目 ${updatedProject.name}`,
        metadata: {
          projectName: updatedProject.name,
          changedFields: Object.keys(input)
        },
        userId: currentUserId,
        projectId: updatedProject.id,
        // 这里用 updatedProject，是因为日志想表达“更新后的项目叫什么”。
        //
        // 如果以后要记录更新前后的对比，可以在 metadata 里同时保存 oldName/newName。
        projectSnapshotId: updatedProject.id,
        projectSnapshotName: updatedProject.name
      });

      return updatedProject;
    }
  };
}
