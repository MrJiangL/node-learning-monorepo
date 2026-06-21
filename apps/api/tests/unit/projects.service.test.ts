import type {
  CreateProjectInput,
  CreateProjectWithTodosInput,
  Project,
  ProjectWithTodos,
  Todo,
  UpdateProjectInput
} from "@learn/shared";
import { describe, expect, it } from "vitest";
import type { ProjectRepository } from "../../src/modules/projects/projects.repository.js";
import { createProjectService } from "../../src/modules/projects/projects.service.js";
import {
  ActivityLogService,
  RecordActivityLogInput
} from "../../src/modules/activity-logs/activity-logs.service.js";

function createFakeProjectRepository(): ProjectRepository & {
  // 这个字段不是业务代码需要的，而是测试需要的。
  //
  // 我们用它记录 service 调用 repository.create 时，
  // 有没有把 currentUserId 正确传下去。
  created: Array<{ input: CreateProjectInput; userId: string }>;
  createdWithTodos: Array<{ input: CreateProjectWithTodosInput; userId: string }>;
  // 这两个字段专门用来做“协作者断言”。
  //
  // 它们不关心最终数据库里有没有数据，而是关心 service 有没有继续调用
  // repository.delete / repository.update。权限失败时，这两个数组应该保持为空。
  deletedIds: string[];
  updatedCalls: Array<{ id: string; input: UpdateProjectInput }>;
} {
  // 用内存数组模拟 Project 表。
  //
  // service 单元测试不关心 Prisma 怎么写 MySQL，
  // 只关心 service 有没有正确调用 repository。
  let projects: Project[] = [];
  const created: Array<{ input: CreateProjectInput; userId: string }> = [];
  const createdWithTodos: Array<{ input: CreateProjectWithTodosInput; userId: string }> = [];

  // fake repository 可以像一个很轻量的 spy：
  // 一边提供内存数据行为，一边记录 service 调用过哪些 repository 方法。
  const deletedIds: string[] = [];
  const updatedCalls: Array<{ id: string; input: UpdateProjectInput }> = [];

  return {
    created,
    createdWithTodos,
    deletedIds,
    updatedCalls,
    async create(input, userId) {
      // 记录 service 有没有把 currentUserId 正确传下来。
      created.push({ input, userId });

      const now = new Date().toISOString();
      const project: Project = {
        id: crypto.randomUUID(),
        name: input.name,
        description: input.description ?? null,
        createdAt: now,
        updatedAt: now,
        userId
      };

      projects.push(project);
      return project;
    },

    async findAll(filter) {
      const filteredProjects = projects.filter((project) => project.userId === filter.userId);
      const sortedProjects = [...filteredProjects].sort((left, right) => {
        const leftTime = new Date(left.createdAt).getTime();
        const rightTime = new Date(right.createdAt).getTime();

        return filter.sortOrder === "asc" ? leftTime - rightTime : rightTime - leftTime;
      });

      const startIndex = (filter.page - 1) * filter.pageSize;
      const pageProjects = sortedProjects.slice(startIndex, startIndex + filter.pageSize);

      return {
        data: pageProjects,
        meta: {
          page: filter.page,
          pageSize: filter.pageSize,
          total: filteredProjects.length,
          totalPages: Math.ceil(filteredProjects.length / filter.pageSize)
        }
      };
    },

    async createWithTodos(input, userId): Promise<ProjectWithTodos> {
      createdWithTodos.push({ input, userId });

      const now = new Date().toISOString();
      const project: Project = {
        id: crypto.randomUUID(),
        name: input.name,
        description: input.description ?? null,
        createdAt: now,
        updatedAt: now,
        userId
      };

      const todos: Todo[] = input.todos.map((todoInput) => ({
        id: crypto.randomUUID(),
        title: todoInput.title,
        description: todoInput.description ?? null,
        completed: false,
        dueDate: todoInput.dueDate ?? null,
        createdAt: now,
        updatedAt: now,
        projectId: project.id
      }));

      projects.push(project);

      return { project, todos };
    },

    async findById(id) {
      return projects.find((project) => project.id === id) ?? null;
    },
    async delete(id) {
      // 先记录调用，再模拟删除。
      // 这样测试可以判断 service 是否真的走到了 repository.delete 这一层。
      deletedIds.push(id);
      const project = projects.find((item) => item.id === id);

      if (!project) {
        return null;
      }

      projects = projects.filter((item) => item.id !== id);
      return project;
    },
    async update(id, input) {
      // update 也是一样：这个记录点帮助我们验证权限失败时没有发生写操作。
      updatedCalls.push({ id, input });
      const project = projects.find((item) => item.id === id);

      if (!project) {
        return null;
      }

      const updatedProject: Project = {
        ...project,
        name: input.name ?? project.name,
        description: input.description ?? project.description,
        updatedAt: new Date().toISOString()
      };

      projects = projects.map((item) => (item.id === id ? updatedProject : item));

      return updatedProject;
    }
  };
}

function createFakeActivityLogService(): ActivityLogService & {
  recorded: RecordActivityLogInput[];
} {
  const recorded: RecordActivityLogInput[] = [];

  return {
    recorded,
    async record(input) {
      recorded.push(input);

      return {
        id: crypto.randomUUID(),
        action: input.action,
        message: input.message,
        metadata: input.metadata ?? null,
        createdAt: new Date().toISOString(),
        userId: input.userId,
        projectId: input.projectId,
        projectSnapshotId: input.projectSnapshotId,
        projectSnapshotName: input.projectSnapshotName ?? null
      };
    },
    async listProjectLogs() {
      return {
        data: [],
        meta: {
          page: 1,
          pageSize: 10,
          total: 0,
          totalPages: 0
        }
      };
    }
  };
}

describe("project service 权限和归属规则", () => {
  it("当前用户创建 Project 时，会把 currentUserId 传给 repository", async () => {
    const repository = createFakeProjectRepository();
    const service = createProjectService(repository);

    const project = await service.createProject(
      {
        name: "Backend depth"
      },
      "user-1"
    );

    expect(project).toMatchObject({
      name: "Backend depth",
      userId: "user-1"
    });

    expect(repository.created).toEqual([
      {
        input: { name: "Backend depth" },
        userId: "user-1"
      }
    ]);
  });

  it("列表只返回当前用户自己的 Project", async () => {
    const repository = createFakeProjectRepository();
    const service = createProjectService(repository);

    await service.createProject({ name: "User 1 project" }, "user-1");
    await service.createProject({ name: "User 2 project" }, "user-2");

    const result = await service.listProjects(
      {
        page: 1,
        pageSize: 10,
        sortBy: "createdAt",
        sortOrder: "asc"
      },
      "user-1"
    );

    expect(result.data.map((project) => project.name)).toEqual(["User 1 project"]);
    expect(result.meta.total).toBe(1);
  });

  it("创建 Project 和初始 Todo 时，会把 currentUserId 传给 repository", async () => {
    const repository = createFakeProjectRepository();
    const service = createProjectService(repository);

    const result = await service.createProjectWithTodos(
      {
        name: "Transaction service",
        todos: [{ title: "First todo" }]
      },
      "user-1"
    );

    expect(result.project).toMatchObject({
      name: "Transaction service",
      userId: "user-1"
    });
    expect(result.todos.map((todo) => todo.title)).toEqual(["First todo"]);
    expect(repository.createdWithTodos).toEqual([
      {
        input: {
          name: "Transaction service",
          todos: [{ title: "First todo" }]
        },
        userId: "user-1"
      }
    ]);
  });

  it("当前用户可以查看自己的 Project 详情", async () => {
    const repository = createFakeProjectRepository();
    const service = createProjectService(repository);

    const createdProject = await service.createProject({ name: "Owned project" }, "user-1");

    const project = await service.getProjectById(createdProject.id, "user-1");

    expect(project).toMatchObject({
      id: createdProject.id,
      name: "Owned project",
      userId: "user-1"
    });
  });

  it("不能查看别人的 Project 详情", async () => {
    const repository = createFakeProjectRepository();
    const service = createProjectService(repository);

    const createdProject = await service.createProject({ name: "Private project" }, "user-2");

    await expect(service.getProjectById(createdProject.id, "user-1")).rejects.toMatchObject({
      statusCode: 404,
      code: "PROJECT_NOT_FOUND"
    });
  });

  it("查看不存在的 Project 时返回 PROJECT_NOT_FOUND", async () => {
    const repository = createFakeProjectRepository();
    const service = createProjectService(repository);

    await expect(service.getProjectById("missing-project-id", "user-1")).rejects.toMatchObject({
      statusCode: 404,
      code: "PROJECT_NOT_FOUND"
    });
  });

  it("当前用户可以删除自己的 Project", async () => {
    const repository = createFakeProjectRepository();
    const service = createProjectService(repository);

    const createdProject = await service.createProject({ name: "Delete me" }, "user-1");

    const deletedProject = await service.deleteProject(createdProject.id, "user-1");

    expect(deletedProject.id).toBe(createdProject.id);

    await expect(service.getProjectById(createdProject.id, "user-1")).rejects.toMatchObject({
      statusCode: 404,
      code: "PROJECT_NOT_FOUND"
    });
  });

  it("不能删除别人的 Project", async () => {
    const repository = createFakeProjectRepository();
    const service = createProjectService(repository);

    const createdProject = await service.createProject({ name: "Private project" }, "user-2");

    await expect(service.deleteProject(createdProject.id, "user-1")).rejects.toMatchObject({
      statusCode: 404,
      code: "PROJECT_NOT_FOUND"
    });
  });
  it("当前用户可以更新自己的 Project", async () => {
    const repository = createFakeProjectRepository();
    const service = createProjectService(repository);

    const createdProject = await service.createProject({ name: "Old project" }, "user-1");

    const updatedProject = await service.updateProject(
      createdProject.id,
      {
        name: "New project",
        description: "New description"
      },
      "user-1"
    );

    expect(updatedProject).toMatchObject({
      id: createdProject.id,
      name: "New project",
      description: "New description",
      userId: "user-1"
    });
  });

  it("不能更新别人的 Project", async () => {
    const repository = createFakeProjectRepository();
    const service = createProjectService(repository);

    const createdProject = await service.createProject({ name: "Private project" }, "user-2");

    await expect(
      service.updateProject(
        createdProject.id,
        {
          name: "Hacked project"
        },
        "user-1"
      )
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "PROJECT_NOT_FOUND"
    });
  });

  it("不能删除别人的 Project 时，不会调用 repository.delete", async () => {
    const repository = createFakeProjectRepository();
    const service = createProjectService(repository);

    const createdProject = await service.createProject({ name: "Private project" }, "user-2");

    await expect(service.deleteProject(createdProject.id, "user-1")).rejects.toMatchObject({
      statusCode: 404,
      code: "PROJECT_NOT_FOUND"
    });

    expect(repository.deletedIds).toEqual([]);
  });

  it("删除 Project 成功前会记录 project.deleted 活动日志", async () => {
    const repository = createFakeProjectRepository();
    const activityLogService = createFakeActivityLogService();
    const service = createProjectService(repository, { activityLogService });

    const project = await service.createProject({ name: "Delete with log" }, "user-1");
    activityLogService.recorded.length = 0;

    await service.deleteProject(project.id, "user-1");

    expect(activityLogService.recorded).toEqual([
      {
        action: "project.deleted",
        message: "删除了项目 Delete with log",
        metadata: {
          projectName: "Delete with log"
        },
        userId: "user-1",
        projectId: project.id,
        projectSnapshotId: project.id,
        projectSnapshotName: "Delete with log"
      }
    ]);
  });

  it("删除 Project 时会在 repository.delete 之前记录 Activity Log", async () => {
    const repository = createFakeProjectRepository();
    const activityLogService = createFakeActivityLogService();
    const service = createProjectService(repository, { activityLogService });

    const project = await service.createProject({ name: "Delete order" }, "user-1");
    activityLogService.recorded.length = 0;

    const deleteCallsWhenRecording: string[][] = [];
    const originalRecord = activityLogService.record;

    activityLogService.record = async (input) => {
      // 这个断言记录的是“调用顺序”。
      //
      // 如果 project.deleted 日志在 repository.delete 之后才写，
      // deleteCallsWhenRecording 里就会看到被删除的 projectId。
      deleteCallsWhenRecording.push([...repository.deletedIds]);
      return originalRecord(input);
    };

    await service.deleteProject(project.id, "user-1");

    expect(deleteCallsWhenRecording).toEqual([[]]);
    expect(repository.deletedIds).toEqual([project.id]);
  });

  it("删除别人的 Project 失败时不会记录 Activity Log", async () => {
    const repository = createFakeProjectRepository();
    const activityLogService = createFakeActivityLogService();
    const service = createProjectService(repository, { activityLogService });

    const project = await service.createProject({ name: "Private project" }, "user-2");
    activityLogService.recorded.length = 0;

    await expect(service.deleteProject(project.id, "user-1")).rejects.toMatchObject({
      statusCode: 404,
      code: "PROJECT_NOT_FOUND"
    });

    expect(activityLogService.recorded).toEqual([]);
  });

  it("不能更新别人的 Project 时，不会调用 repository.update", async () => {
    const repository = createFakeProjectRepository();
    const service = createProjectService(repository);

    const createdProject = await service.createProject({ name: "Private project" }, "user-2");

    await expect(
      service.updateProject(
        createdProject.id,
        {
          name: "Hacked project"
        },
        "user-1"
      )
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "PROJECT_NOT_FOUND"
    });

    expect(repository.updatedCalls).toEqual([]);
  });

  it("创建 Project 成功后记录 project.created 活动日志", async () => {
    const repository = createFakeProjectRepository();
    const activityLogService = createFakeActivityLogService();
    const service = createProjectService(repository, { activityLogService });

    const project = await service.createProject({ name: "Logged project" }, "user-1");

    expect(activityLogService.recorded).toEqual([
      {
        action: "project.created",
        message: "创建了项目 Logged project",
        metadata: {
          projectName: "Logged project"
        },
        userId: "user-1",
        projectId: project.id,
        projectSnapshotId: project.id,
        projectSnapshotName: "Logged project"
      }
    ]);
  });

  it("更新 Project 成功后记录 project.updated 活动日志", async () => {
    const repository = createFakeProjectRepository();
    const activityLogService = createFakeActivityLogService();
    const service = createProjectService(repository, { activityLogService });

    const project = await service.createProject({ name: "Old name" }, "user-1");
    activityLogService.recorded.length = 0;

    await service.updateProject(project.id, { name: "New name" }, "user-1");

    expect(activityLogService.recorded).toEqual([
      {
        action: "project.updated",
        message: "更新了项目 New name",
        metadata: {
          projectName: "New name",
          changedFields: ["name"]
        },
        userId: "user-1",
        projectId: project.id,
        projectSnapshotId: project.id,
        projectSnapshotName: "New name"
      }
    ]);
  });

  it("更新别人的 Project 失败时不记录 Activity Log", async () => {
    const repository = createFakeProjectRepository();
    const activityLogService = createFakeActivityLogService();
    const service = createProjectService(repository, { activityLogService });

    const project = await service.createProject({ name: "Private project" }, "user-2");
    activityLogService.recorded.length = 0;

    await expect(
      service.updateProject(project.id, { name: "Hack" }, "user-1")
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "PROJECT_NOT_FOUND"
    });

    expect(activityLogService.recorded).toEqual([]);
  });
});
