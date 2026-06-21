import type { Project, Todo } from "@learn/shared";
import { describe, expect, it } from "vitest";
import type { ProjectRepository } from "../../src/modules/projects/projects.repository.js";
import type { TodoRepository } from "../../src/modules/todos/todos.repository.js";
import { createTodoService } from "../../src/modules/todos/todos.service.js";
import {
  ActivityLogService,
  RecordActivityLogInput
} from "../../src/modules/activity-logs/activity-logs.service.js";

function createFakeTodoRepository(initialTodos: Todo[] = []): TodoRepository & {
  // 这些字段不是业务代码需要的，而是测试需要的。
  //
  // createdProjectIds 用来证明“允许创建时，service 真的调用了 create”。
  // updatedIds 用来证明“权限失败时，service 没有继续调用 update”。
  createdProjectIds: string[];
  updatedIds: string[];
  deletedIds: string[];
} {
  // 用内存数组模拟数据库里的 Todo 表。
  //
  // initialTodos 表示测试开始前就已经存在的数据。
  // 例如测试“不能更新别人的 Todo”时，
  // 我们可以先塞一条属于别人 Project 的 Todo。
  let todos = [...initialTodos];

  const createdProjectIds: string[] = [];
  const updatedIds: string[] = [];
  const deletedIds: string[] = [];

  return {
    createdProjectIds,
    updatedIds,
    deletedIds,
    async create(input, projectId) {
      createdProjectIds.push(projectId);

      const now = new Date().toISOString();

      // 这里模拟 prisma.todo.create 的行为：
      // 生成完整 Todo，然后放进内存数组。
      const todo: Todo = {
        id: crypto.randomUUID(),
        title: input.title,
        description: input.description ?? null,
        completed: false,
        dueDate: input.dueDate ?? null,
        createdAt: now,
        updatedAt: now,
        projectId
      };

      // 用不可变写法模拟“插入数据库”。
      todos = [...todos, todo];

      return todo;
    },

    async findAll(filter) {
      const filteredTodos = todos.filter((todo) => {
        const dueDateTime = todo.dueDate ? new Date(todo.dueDate).getTime() : null;
        const dueAfterTime = filter.dueAfter ? new Date(filter.dueAfter).getTime() : null;
        const dueBeforeTime = filter.dueBefore ? new Date(filter.dueBefore).getTime() : null;
        const titleMatches = filter.title === undefined || todo.title.includes(filter.title);

        return (
          todo.projectId === filter.projectId &&
          (filter.completed === undefined || todo.completed === filter.completed) &&
          (dueAfterTime === null || (dueDateTime !== null && dueDateTime >= dueAfterTime)) &&
          (dueBeforeTime === null || (dueDateTime !== null && dueDateTime <= dueBeforeTime)) &&
          titleMatches
        );
      });

      const sortedTodos = [...filteredTodos].sort((left, right) => {
        const leftTime = new Date(left.createdAt).getTime();
        const rightTime = new Date(right.createdAt).getTime();

        return filter.sortOrder === "asc" ? leftTime - rightTime : rightTime - leftTime;
      });

      const startIndex = (filter.page - 1) * filter.pageSize;
      const pageTodos = sortedTodos.slice(startIndex, startIndex + filter.pageSize);

      return {
        data: pageTodos,
        meta: {
          page: filter.page,
          pageSize: filter.pageSize,
          total: filteredTodos.length,
          totalPages: Math.ceil(filteredTodos.length / filter.pageSize)
        }
      };
    },

    async findById(id) {
      // 模拟 prisma.todo.findUnique({ where: { id } })
      return todos.find((todo) => todo.id === id) ?? null;
    },

    async update(id, input) {
      // 记录 update 被调用过。
      //
      // 这个记录很重要：
      // 当测试“不能更新别人的 Todo”时，
      // 我们要确认 service 在权限失败后，根本没有调用 update。
      updatedIds.push(id);

      const existingTodo = todos.find((todo) => todo.id === id);

      if (!existingTodo) {
        return null;
      }

      const updatedTodo: Todo = {
        ...existingTodo,

        // PATCH 是局部更新：
        // 传了什么就改什么，没传的保留原值。
        title: input.title ?? existingTodo.title,
        description: input.description ?? existingTodo.description,
        completed: input.completed ?? existingTodo.completed,
        dueDate: input.dueDate === undefined ? existingTodo.dueDate : input.dueDate,

        updatedAt: new Date().toISOString()
      };

      todos = todos.map((todo) => (todo.id === id ? updatedTodo : todo));

      return updatedTodo;
    },

    async delete(id) {
      // 记录 delete 被调用过。
      //
      // 这个记录和 updatedIds 类似：
      // 权限失败时，service 应该在调用 repository.delete 前就停下来。
      deletedIds.push(id);

      const existingTodo = todos.find((todo) => todo.id === id);

      if (!existingTodo) {
        return null;
      }

      todos = todos.filter((todo) => todo.id !== id);

      return existingTodo;
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

function createFakeProjectRepository(projects: Project[]): ProjectRepository {
  return {
    async create() {
      // 这个测试文件暂时不测 projectService.createProject，
      // 所以 create 用不到。为了避免误用，直接抛错。
      throw new Error("create is not needed in this todo service test");
    },

    async createWithTodos() {
      // Todo service 不负责创建 Project 和初始 Todo。
      // 这里补这个方法只是为了满足 ProjectRepository 接口。
      throw new Error("createWithTodos is not needed in this todo service test");
    },

    async findAll() {
      // Todo service 也不需要列出用户所有 Project。
      throw new Error("findAll is not needed in this todo service test");
    },

    async findById(id) {
      // 这个方法才是 Todo service 真正需要的。
      //
      // Todo service 会：
      // 1. 先拿 projectId
      // 2. 调 projectRepository.findById(projectId)
      // 3. 判断 project.userId 是否等于 currentUserId
      return projects.find((project) => project.id === id) ?? null;
    },

    async delete() {
      // Todo service 不负责删除 Project。
      // 这里补这个方法只是为了满足 ProjectRepository 接口。
      throw new Error("delete is not needed in this todo service test");
    },

    async update() {
      // Todo service 不负责更新 Project。
      // ProjectRepository 新增 update 后，这个 fake repository 也要补齐接口。
      throw new Error("update is not needed in this todo service test");
    }
  };
}

function createTestProject(overrides: Partial<Project> = {}): Project {
  const now = new Date().toISOString();

  return {
    id: "project-1",
    name: "Test project",
    description: null,
    createdAt: now,
    updatedAt: now,
    userId: "user-1",
    ...overrides
  };
}

function createTestTodo(overrides: Partial<Todo> = {}): Todo {
  const now = new Date().toISOString();

  return {
    id: "todo-1",
    title: "Test todo",
    description: null,
    completed: false,
    dueDate: null,
    createdAt: now,
    updatedAt: now,
    projectId: "project-1",
    ...overrides
  };
}

describe("todo service 权限规则", () => {
  it("当前用户可以在自己的 Project 下创建 Todo", async () => {
    const project = createTestProject({
      id: "project-1",
      userId: "user-1"
    });

    const projectRepository = createFakeProjectRepository([project]);
    const todoRepository = createFakeTodoRepository();

    const service = createTodoService(todoRepository, projectRepository);

    const todo = await service.createTodo(
      "project-1",
      {
        title: "Write service test"
      },
      "user-1"
    );

    expect(todo).toMatchObject({
      title: "Write service test",
      completed: false,
      projectId: "project-1"
    });
    expect(todoRepository.createdProjectIds).toEqual(["project-1"]);
  });

  it("不能在别人的 Project 下创建 Todo", async () => {
    const project = createTestProject({
      id: "project-1",
      userId: "user-2"
    });

    const projectRepository = createFakeProjectRepository([project]);
    const todoRepository = createFakeTodoRepository();

    const service = createTodoService(todoRepository, projectRepository);

    await expect(
      service.createTodo(
        "project-1",
        {
          title: "Should not be created"
        },
        "user-1"
      )
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "PROJECT_NOT_FOUND"
    });

    // 权限失败时，service 应该在调用 todoRepository.create 前就停下来。
    expect(todoRepository.createdProjectIds).toEqual([]);
  });

  it("当前用户可以分页查看自己 Project 下的 Todo", async () => {
    const project = createTestProject({
      id: "project-1",
      userId: "user-1"
    });

    const todoRepository = createFakeTodoRepository([
      createTestTodo({
        id: "todo-1",
        title: "第一页第一条",
        projectId: "project-1"
      }),
      createTestTodo({
        id: "todo-2",
        title: "第一页第二条",
        projectId: "project-1"
      }),
      createTestTodo({
        id: "todo-3",
        title: "第二页第一条",
        projectId: "project-1"
      }),
      createTestTodo({
        id: "other-project-todo",
        title: "别的项目不应该出现",
        projectId: "project-2"
      })
    ]);
    const projectRepository = createFakeProjectRepository([project]);

    const service = createTodoService(todoRepository, projectRepository);

    const result = await service.listTodos(
      "project-1",
      {
        page: 2,
        pageSize: 2,
        sortBy: "createdAt",
        sortOrder: "asc"
      },
      "user-1"
    );

    // 这个测试重点不是 Prisma，而是 service 是否：
    // 1. 先做 Project 归属校验
    // 2. 把分页参数交给 repository
    // 3. 返回 repository 给出的分页结构
    expect(result.data.map((todo) => todo.title)).toEqual(["第二页第一条"]);
    expect(result.meta).toEqual({
      page: 2,
      pageSize: 2,
      total: 3,
      totalPages: 2
    });
  });

  it("不能更新别人 Project 下的 Todo", async () => {
    const project = createTestProject({
      id: "project-1",
      userId: "user-2"
    });

    const todo = createTestTodo({
      id: "todo-1",
      projectId: "project-1",
      completed: false
    });

    const projectRepository = createFakeProjectRepository([project]);
    const todoRepository = createFakeTodoRepository([todo]);

    const service = createTodoService(todoRepository, projectRepository);

    await expect(service.updateTodo("todo-1", { completed: true }, "user-1")).rejects.toMatchObject(
      {
        statusCode: 404,
        code: "PROJECT_NOT_FOUND"
      }
    );

    // 这个断言很关键：
    //
    // 它证明 service 在发现权限不对后，没有继续调用 repository.update。
    // 也就是说，别人的 Todo 没有被改掉。
    expect(todoRepository.updatedIds).toEqual([]);
  });

  it("当前用户可以更新自己 todo 的 title 和 dueDate", async () => {
    const project = createTestProject({
      id: "project-1",
      userId: "user-1"
    });

    const todo = createTestTodo({
      id: "todo-1",
      projectId: "project-1",
      title: "Old service title",
      dueDate: "2026-05-01T00:00:00.000Z"
    });

    const projectRepository = createFakeProjectRepository([project]);
    const todoRepository = createFakeTodoRepository([todo]);
    const service = createTodoService(todoRepository, projectRepository);

    const updatedTodo = await service.updateTodo(
      "todo-1",
      {
        title: "New service title",
        dueDate: "2026-06-01"
      },
      "user-1"
    );

    expect(updatedTodo).toMatchObject({
      id: "todo-1",
      title: "New service title",
      dueDate: "2026-06-01",
      projectId: "project-1"
    });

    // service 测试的重点不是数据库怎么更新，而是业务流程：
    // 1. 先找到 Todo
    // 2. 再通过 Todo.projectId 找 Project
    // 3. 确认 Project.userId 是当前用户
    // 4. 权限通过后才调用 repository.update
    expect(todoRepository.updatedIds).toEqual(["todo-1"]);
  });

  it("列表查询会把 completed 过滤条件交给 repository", async () => {
    const project = createTestProject({ id: "project-1", userId: "user-1" });
    const openTodo = createTestTodo({
      id: "todo-open",
      title: "Open todo",
      completed: false,
      projectId: "project-1"
    });
    const doneTodo = createTestTodo({
      id: "todo-done",
      title: "Done todo",
      completed: true,
      projectId: "project-1"
    });

    const projectRepository = createFakeProjectRepository([project]);
    const todoRepository = createFakeTodoRepository([openTodo, doneTodo]);
    const service = createTodoService(todoRepository, projectRepository);

    const result = await service.listTodos(
      "project-1",
      {
        page: 1,
        pageSize: 10,
        sortBy: "createdAt",
        sortOrder: "asc",
        completed: false
      },
      "user-1"
    );

    expect(result.data.map((todo) => todo.id)).toEqual(["todo-open"]);
    expect(result.meta.total).toBe(1);
  });

  it("列表查询会把 dueDate 范围过滤条件交给 repository", async () => {
    const project = createTestProject({ id: "project-1", userId: "user-1" });
    const oldTodo = createTestTodo({
      id: "todo-old",
      title: "Old todo",
      dueDate: "2026-05-01",
      projectId: "project-1"
    });
    const inRangeTodo = createTestTodo({
      id: "todo-in-range",
      title: "In range todo",
      dueDate: "2026-05-15",
      projectId: "project-1"
    });

    const projectRepository = createFakeProjectRepository([project]);
    const todoRepository = createFakeTodoRepository([oldTodo, inRangeTodo]);
    const service = createTodoService(todoRepository, projectRepository);

    const result = await service.listTodos(
      "project-1",
      {
        page: 1,
        pageSize: 10,
        sortBy: "createdAt",
        sortOrder: "asc",
        dueAfter: "2026-05-10",
        dueBefore: "2026-05-20"
      },
      "user-1"
    );

    expect(result.data.map((todo) => todo.id)).toEqual(["todo-in-range"]);
    expect(result.meta.total).toBe(1);
  });

  it("列表查询会把 title 搜索条件交给 repository", async () => {
    const project = createTestProject({ id: "project-1", userId: "user-1" });
    const matchedTodo = createTestTodo({
      id: "todo-report",
      title: "Write weekly report",
      projectId: "project-1"
    });
    const otherTodo = createTestTodo({
      id: "todo-milk",
      title: "Buy milk",
      projectId: "project-1"
    });

    const projectRepository = createFakeProjectRepository([project]);
    const todoRepository = createFakeTodoRepository([matchedTodo, otherTodo]);
    const service = createTodoService(todoRepository, projectRepository);

    const result = await service.listTodos(
      "project-1",
      {
        page: 1,
        pageSize: 10,
        sortBy: "createdAt",
        sortOrder: "asc",
        title: "report"
      },
      "user-1"
    );

    expect(result.data.map((todo) => todo.id)).toEqual(["todo-report"]);
    expect(result.meta.total).toBe(1);
  });

  it("当前用户可以删除自己 Project 下的 Todo", async () => {
    const project = createTestProject({
      id: "project-1",
      userId: "user-1"
    });
    const todo = createTestTodo({
      id: "todo-1",
      projectId: "project-1"
    });

    const projectRepository = createFakeProjectRepository([project]);
    const todoRepository = createFakeTodoRepository([todo]);
    const service = createTodoService(todoRepository, projectRepository);

    const deletedTodo = await service.deleteTodo("todo-1", "user-1");

    expect(deletedTodo.id).toBe("todo-1");
    expect(todoRepository.deletedIds).toEqual(["todo-1"]);
  });

  it("不能删除别人 Project 下的 Todo", async () => {
    const project = createTestProject({
      id: "project-1",
      userId: "user-2"
    });
    const todo = createTestTodo({
      id: "todo-1",
      projectId: "project-1"
    });

    const projectRepository = createFakeProjectRepository([project]);
    const todoRepository = createFakeTodoRepository([todo]);
    const service = createTodoService(todoRepository, projectRepository);

    await expect(service.deleteTodo("todo-1", "user-1")).rejects.toMatchObject({
      statusCode: 404,
      code: "PROJECT_NOT_FOUND"
    });

    expect(todoRepository.deletedIds).toEqual([]);
  });

  it("创建 Todo 成功后记录 todo.created 活动日志", async () => {
    const project = createTestProject({ id: "project-1", userId: "user-1" });
    const projectRepository = createFakeProjectRepository([project]);
    const todoRepository = createFakeTodoRepository();
    const activityLogService = createFakeActivityLogService();
    const service = createTodoService(todoRepository, projectRepository, { activityLogService });

    const todo = await service.createTodo("project-1", { title: "Logged todo" }, "user-1");

    expect(activityLogService.recorded).toEqual([
      {
        action: "todo.created",
        message: "创建了 Todo Logged todo",
        metadata: {
          todoId: todo.id,
          title: "Logged todo"
        },
        userId: "user-1",
        projectId: "project-1",
        projectSnapshotId: "project-1",
        projectSnapshotName: "Test project"
      }
    ]);
  });

  it("更新 Todo 成功后记录 todo.updated 活动日志", async () => {
    const project = createTestProject({ id: "project-1", userId: "user-1" });
    const todo = createTestTodo({ id: "todo-1", title: "Old title", projectId: "project-1" });
    const projectRepository = createFakeProjectRepository([project]);
    const todoRepository = createFakeTodoRepository([todo]);
    const activityLogService = createFakeActivityLogService();
    const service = createTodoService(todoRepository, projectRepository, { activityLogService });

    await service.updateTodo("todo-1", { title: "New title" }, "user-1");

    expect(activityLogService.recorded).toEqual([
      {
        action: "todo.updated",
        message: "更新了 Todo New title",
        metadata: {
          todoId: "todo-1",
          title: "New title",
          changedFields: ["title"]
        },
        userId: "user-1",
        projectId: "project-1",
        projectSnapshotId: "project-1",
        projectSnapshotName: "Test project"
      }
    ]);
  });

  it("完成 Todo 时记录 todo.completed 活动日志", async () => {
    const project = createTestProject({ id: "project-1", userId: "user-1" });
    const todo = createTestTodo({
      id: "todo-1",
      title: "Finish me",
      completed: false,
      projectId: "project-1"
    });
    const projectRepository = createFakeProjectRepository([project]);
    const todoRepository = createFakeTodoRepository([todo]);
    const activityLogService = createFakeActivityLogService();
    const service = createTodoService(todoRepository, projectRepository, { activityLogService });

    await service.updateTodo("todo-1", { completed: true }, "user-1");

    expect(activityLogService.recorded[0]).toMatchObject({
      action: "todo.completed",
      message: "完成了 Todo Finish me",
      userId: "user-1",
      projectId: "project-1",
      projectSnapshotId: "project-1",
      projectSnapshotName: "Test project"
    });
  });

  it("删除 Todo 成功后记录 todo.deleted 活动日志", async () => {
    const project = createTestProject({ id: "project-1", userId: "user-1" });
    const todo = createTestTodo({ id: "todo-1", title: "Delete me", projectId: "project-1" });
    const projectRepository = createFakeProjectRepository([project]);
    const todoRepository = createFakeTodoRepository([todo]);
    const activityLogService = createFakeActivityLogService();
    const service = createTodoService(todoRepository, projectRepository, { activityLogService });

    await service.deleteTodo("todo-1", "user-1");

    expect(activityLogService.recorded).toEqual([
      {
        action: "todo.deleted",
        message: "删除了 Todo Delete me",
        metadata: {
          todoId: "todo-1",
          title: "Delete me"
        },
        userId: "user-1",
        projectId: "project-1",
        projectSnapshotId: "project-1",
        projectSnapshotName: "Test project"
      }
    ]);
  });

  it("更新别人 Project 下的 Todo 失败时不记录 Activity Log", async () => {
    const project = createTestProject({ id: "project-1", userId: "user-2" });
    const todo = createTestTodo({ id: "todo-1", projectId: "project-1" });
    const projectRepository = createFakeProjectRepository([project]);
    const todoRepository = createFakeTodoRepository([todo]);
    const activityLogService = createFakeActivityLogService();
    const service = createTodoService(todoRepository, projectRepository, { activityLogService });

    await expect(service.updateTodo("todo-1", { completed: true }, "user-1")).rejects.toMatchObject(
      {
        statusCode: 404,
        code: "PROJECT_NOT_FOUND"
      }
    );

    expect(activityLogService.recorded).toEqual([]);
  });
});
