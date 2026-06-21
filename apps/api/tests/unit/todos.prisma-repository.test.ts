import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db/prisma.js";
import { createPrismaTodoRepository } from "../../src/modules/todos/todos.prisma-repository.js";

async function createTestUser(email: string) {
  return prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email,
      passwordHash: "temporary-test-user",
      name: "Todo Repository Test User"
    }
  });
}

async function createTestProject(userId: string, name: string) {
  // Todo 依赖 Project，所以测试 Todo repository 前要先准备 Project。
  //
  // 这里直接用 Prisma 创建 Project，是为了让测试聚焦在 TodoRepository，
  // 不被 ProjectRepository 的实现细节影响。
  return prisma.project.create({
    data: {
      id: crypto.randomUUID(),
      name,
      description: null,
      userId
    }
  });
}

describe("prisma todo repository", () => {
  beforeEach(async () => {
    // 清理顺序：Todo -> Project -> User。
    //
    // 因为 Todo 依赖 Project，Project 依赖 User。
    await prisma.todo.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
  });

  it("creates a todo for the provided project", async () => {
    const repository = createPrismaTodoRepository();
    const owner = await createTestUser("todo-create-owner@example.com");
    const project = await createTestProject(owner.id, "Todo project");

    const createdTodo = await repository.create(
      {
        title: "Write Todo repository",
        description: "Practice Prisma create"
      },
      project.id
    );

    // 这里用 Prisma 直接回查数据库，并 include project。
    //
    // 这样不是重复测 repository，而是确认数据库里的外键关系真的建立起来了：
    // Todo.projectId -> Project.id。
    const savedTodo = await prisma.todo.findUnique({
      where: { id: createdTodo.id },
      include: { project: true }
    });

    expect(savedTodo?.title).toBe("Write Todo repository");
    expect(savedTodo?.completed).toBe(false);
    expect(savedTodo?.projectId).toBe(project.id);
    expect(savedTodo?.project.name).toBe("Todo project");
  });

  it("lists only todos from the provided project", async () => {
    const repository = createPrismaTodoRepository();
    const owner = await createTestUser("todo-list-owner@example.com");
    const project = await createTestProject(owner.id, "Main project");
    const anotherProject = await createTestProject(owner.id, "Another project");

    // 准备两个项目的数据，才能证明 findAll 没有把别的项目混进来。
    await repository.create({ title: "Main todo 1" }, project.id);
    await repository.create({ title: "Main todo 2" }, project.id);
    await repository.create({ title: "Another project todo" }, anotherProject.id);

    const result = await repository.findAll({
      projectId: project.id,
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc"
    });

    expect(result.data.map((todo) => todo.title)).toEqual(["Main todo 1", "Main todo 2"]);
    expect(result.data.every((todo) => todo.projectId === project.id)).toBe(true);
    expect(result.meta).toEqual({
      page: 1,
      pageSize: 10,
      total: 2,
      totalPages: 1
    });
  });

  it("returns one page of todos with pagination meta", async () => {
    const repository = createPrismaTodoRepository();
    const owner = await createTestUser("todo-page-owner@example.com");
    const project = await createTestProject(owner.id, "Pagination project");

    await repository.create({ title: "Todo page item 1" }, project.id);
    await repository.create({ title: "Todo page item 2" }, project.id);
    await repository.create({ title: "Todo page item 3" }, project.id);

    const result = await repository.findAll({
      projectId: project.id,
      page: 2,
      pageSize: 2,
      sortBy: "createdAt",
      sortOrder: "asc"
    });

    // page=2&pageSize=2 表示：
    // - 第一页拿第 1、2 条
    // - 第二页跳过前 2 条，只拿第 3 条
    expect(result.data.map((todo) => todo.title)).toEqual(["Todo page item 3"]);
    expect(result.meta).toEqual({
      page: 2,
      pageSize: 2,
      total: 3,
      totalPages: 2
    });
  });

  it("按创建时间倒序返回 todos", async () => {
    const repository = createPrismaTodoRepository();
    const owner = await createTestUser("todo-sort-owner@example.com");
    const project = await createTestProject(owner.id, "Todo sort project");

    await prisma.todo.create({
      data: {
        id: crypto.randomUUID(),
        title: "Older todo",
        description: null,
        completed: false,
        dueDate: null,
        projectId: project.id,
        createdAt: new Date("2026-01-01T00:00:00.000Z")
      }
    });
    await prisma.todo.create({
      data: {
        id: crypto.randomUUID(),
        title: "Newer todo",
        description: null,
        completed: false,
        dueDate: null,
        projectId: project.id,
        createdAt: new Date("2026-01-02T00:00:00.000Z")
      }
    });

    const result = await repository.findAll({
      projectId: project.id,
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "desc"
    });

    expect(result.data.map((todo) => todo.title)).toEqual(["Newer todo", "Older todo"]);
  });

  it("finds a todo by id", async () => {
    const repository = createPrismaTodoRepository();
    const owner = await createTestUser("todo-find-owner@example.com");
    const project = await createTestProject(owner.id, "Find project");

    const createdTodo = await repository.create(
      {
        title: "Find me",
        description: "Used by findById test"
      },
      project.id
    );

    const foundTodo = await repository.findById(createdTodo.id);

    expect(foundTodo).toMatchObject({
      id: createdTodo.id,
      title: "Find me",
      description: "Used by findById test",
      projectId: project.id
    });
  });

  it("updates a todo completed status", async () => {
    const repository = createPrismaTodoRepository();
    const owner = await createTestUser("todo-update-owner@example.com");
    const project = await createTestProject(owner.id, "Update project");

    const createdTodo = await repository.create({ title: "Toggle me" }, project.id);

    expect(createdTodo.completed).toBe(false);

    const updatedTodo = await repository.update(createdTodo.id, { completed: true });

    expect(updatedTodo).toMatchObject({
      id: createdTodo.id,
      title: "Toggle me",
      completed: true,
      projectId: project.id
    });
  });

  it("更新 todo 的 title 和 dueDate", async () => {
    const repository = createPrismaTodoRepository();
    const owner = await createTestUser("todo-update-title-due-date@example.com");
    const project = await createTestProject(owner.id, "Update title dueDate project");

    const createdTodo = await repository.create(
      {
        title: "Old title",
        dueDate: "2026-05-01"
      },
      project.id
    );

    const updatedTodo = await repository.update(createdTodo.id, {
      title: "New title",
      dueDate: "2026-06-01"
    });

    expect(updatedTodo).toMatchObject({
      id: createdTodo.id,
      title: "New title",
      projectId: project.id
    });

    // repository 返回给 API 层的是 DTO 形状。
    //
    // 数据库里 dueDate 是 Date，但经过 mapper 后会变成 ISO 字符串。
    // 这里只关心日期部分是否正确，避免测试和具体时区显示耦合太死。
    expect(updatedTodo?.dueDate).toContain("2026-06-01");
  });

  it("传入 dueDate 为 null 时清空 todo 截止日期", async () => {
    const repository = createPrismaTodoRepository();
    const owner = await createTestUser("todo-clear-due-date@example.com");
    const project = await createTestProject(owner.id, "Clear dueDate project");

    const createdTodo = await repository.create(
      {
        title: "Todo with dueDate",
        dueDate: "2026-05-01"
      },
      project.id
    );

    const updatedTodo = await repository.update(createdTodo.id, {
      dueDate: null
    });

    // null 和 undefined 的语义不同：
    // - undefined 表示“没传这个字段，保持原值”
    // - null 表示“明确把这个字段清空”
    expect(updatedTodo?.dueDate).toBeNull();
  });

  it("returns null when updating a missing todo", async () => {
    const repository = createPrismaTodoRepository();

    const result = await repository.update("missing-todo-id", { completed: true });

    expect(result).toBeNull();
  });

  it("按 completed 过滤 todos", async () => {
    const repository = createPrismaTodoRepository();
    const owner = await createTestUser("todo-completed-filter-owner@example.com");
    const project = await createTestProject(owner.id, "Completed filter project");

    const openTodo = await repository.create({ title: "Open todo" }, project.id);
    const doneTodo = await repository.create({ title: "Done todo" }, project.id);

    await repository.update(doneTodo.id, { completed: true });

    const result = await repository.findAll({
      projectId: project.id,
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc",
      completed: true
    });

    expect(result.data.map((todo) => todo.id)).toEqual([doneTodo.id]);
    expect(result.data.some((todo) => todo.id === openTodo.id)).toBe(false);
    expect(result.meta).toEqual({
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1
    });
  });

  it("按 dueDate 范围过滤 todos", async () => {
    const repository = createPrismaTodoRepository();
    const owner = await createTestUser("todo-due-date-filter-owner@example.com");
    const project = await createTestProject(owner.id, "Due date filter project");

    await repository.create({ title: "Old todo", dueDate: "2026-05-01" }, project.id);
    const inRangeTodo = await repository.create(
      { title: "In range todo", dueDate: "2026-05-15" },
      project.id
    );
    await repository.create({ title: "Future todo", dueDate: "2026-06-01" }, project.id);

    const result = await repository.findAll({
      projectId: project.id,
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc",
      dueAfter: "2026-05-10",
      dueBefore: "2026-05-20"
    });

    expect(result.data.map((todo) => todo.id)).toEqual([inRangeTodo.id]);
    expect(result.meta.total).toBe(1);
  });

  it("按 title 关键字搜索 todos", async () => {
    const repository = createPrismaTodoRepository();
    const owner = await createTestUser("todo-title-search-owner@example.com");
    const project = await createTestProject(owner.id, "Title search project");

    const matchedTodo = await repository.create({ title: "Write weekly report" }, project.id);
    await repository.create({ title: "Buy milk" }, project.id);

    const result = await repository.findAll({
      projectId: project.id,
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc",
      title: "report"
    });

    expect(result.data.map((todo) => todo.id)).toEqual([matchedTodo.id]);
    expect(result.meta.total).toBe(1);
  });

  it("删除 todo", async () => {
    const repository = createPrismaTodoRepository();
    const owner = await createTestUser("todo-delete-owner@example.com");
    const project = await createTestProject(owner.id, "Delete todo project");

    const createdTodo = await repository.create({ title: "Delete me" }, project.id);

    const deletedTodo = await repository.delete(createdTodo.id);

    expect(deletedTodo).toMatchObject({
      id: createdTodo.id,
      title: "Delete me",
      projectId: project.id
    });

    const savedTodo = await prisma.todo.findUnique({
      where: { id: createdTodo.id }
    });

    expect(savedTodo).toBeNull();
  });

  it("删除不存在的 todo 时返回 null", async () => {
    const repository = createPrismaTodoRepository();

    const result = await repository.delete("missing-todo-id");

    expect(result).toBeNull();
  });
});
