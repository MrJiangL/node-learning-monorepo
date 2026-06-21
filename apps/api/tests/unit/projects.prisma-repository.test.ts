import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db/prisma.js";
import { createPrismaProjectRepository } from "../../src/modules/projects/projects.prisma-repository.js";

async function createTestUser(email: string) {
  // repository 单元测试不走 /auth/register。
  //
  // 我们直接用 Prisma 创建用户，是为了让测试聚焦在 ProjectRepository，
  // 不被 auth 路由、密码哈希、JWT 这些其他模块影响。
  return prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email,
      passwordHash: "temporary-test-user",
      name: "Project Repository Test User"
    }
  });
}

describe("prisma project repository", () => {
  beforeEach(async () => {
    // 清理顺序要从“子表”到“父表”。
    //
    // Todo 依赖 Project，Project 依赖 User。
    // 所以如果将来测试里创建了 Todo，先删 Todo 会更安全。
    await prisma.todo.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
  });

  it("给指定用户创建 Project", async () => {
    const repository = createPrismaProjectRepository();
    const owner = await createTestUser("project-owner@example.com");

    // 这一步调用的是我们自己封装的 repository，而不是直接 prisma.project.create。
    //
    // 这样测试保护的是“repository.create 是否正确使用了 userId 参数”。
    // 如果未来有人误把 userId 从 input 里取，或者忘了写 userId，这个测试会失败。
    const createdProject = await repository.create(
      {
        name: "Learning Node",
        description: "Repository layer practice"
      },
      owner.id
    );

    // 这里再用 Prisma 直接回查数据库。
    //
    // include: { user: true } 的意思是：
    // 查询 Project 时顺便把关联的 User 也查出来。
    // 这样我们可以证明 Project.userId 真的连到了正确的 User。
    const savedProject = await prisma.project.findUnique({
      where: { id: createdProject.id },
      include: { user: true }
    });

    expect(savedProject?.name).toBe("Learning Node");
    expect(savedProject?.description).toBe("Repository layer practice");
    expect(savedProject?.userId).toBe(owner.id);
    expect(savedProject?.user.email).toBe(owner.email);
  });

  it("列表只返回指定用户自己的 Project", async () => {
    const repository = createPrismaProjectRepository();
    const owner = await createTestUser("project-list-owner@example.com");
    const anotherUser = await createTestUser("project-list-other@example.com");

    // 准备两个用户的数据，是为了验证“按 userId 隔离”真的生效。
    //
    // 如果只准备一个用户，测试就算通过，也无法证明 repository 没有把别人的项目查出来。
    await repository.create({ name: "Owner project 1" }, owner.id);
    await repository.create({ name: "Owner project 2" }, owner.id);
    await repository.create({ name: "Another user project" }, anotherUser.id);

    const result = await repository.findAll({
      userId: owner.id,
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc"
    });

    expect(result.data.map((project) => project.name)).toEqual([
      "Owner project 1",
      "Owner project 2"
    ]);
    expect(result.data.every((project) => project.userId === owner.id)).toBe(true);
    expect(result.meta).toEqual({
      page: 1,
      pageSize: 10,
      total: 2,
      totalPages: 1
    });
  });

  it("分页返回当前用户的 projects", async () => {
    const repository = createPrismaProjectRepository();
    const owner = await createTestUser("project-page-owner@example.com");

    await repository.create({ name: "Project 1" }, owner.id);
    await repository.create({ name: "Project 2" }, owner.id);
    await repository.create({ name: "Project 3" }, owner.id);

    const result = await repository.findAll({
      userId: owner.id,
      page: 2,
      pageSize: 2,
      sortBy: "createdAt",
      sortOrder: "asc"
    });

    expect(result.data.map((project) => project.name)).toEqual(["Project 3"]);
    expect(result.meta).toEqual({
      page: 2,
      pageSize: 2,
      total: 3,
      totalPages: 2
    });
  });

  it("分页超出数据范围时返回空列表和正确 meta", async () => {
    // 这里故意请求第 2 页。
    //
    // 当前用户只有 2 条 Project，pageSize 也是 2，
    // 所以第 1 页刚好放完全部数据，第 2 页应该没有任何 data。
    //
    // 但 meta.total 仍然要表示“数据库里匹配条件的总数量”，不能因为当前页为空就变成 0。
    const repository = createPrismaProjectRepository();
    const owner = await createTestUser("project-empty-page-owner@example.com");

    await repository.create({ name: "Project 1" }, owner.id);
    await repository.create({ name: "Project 2" }, owner.id);

    const result = await repository.findAll({
      userId: owner.id,
      page: 2,
      pageSize: 2,
      sortBy: "createdAt",
      sortOrder: "asc"
    });

    expect(result.data).toEqual([]);
    expect(result.meta).toEqual({
      page: 2,
      pageSize: 2,
      total: 2,
      totalPages: 1
    });
  });

  it("finds a project by id", async () => {
    const repository = createPrismaProjectRepository();
    const owner = await createTestUser("project-find-owner@example.com");

    const createdProject = await repository.create(
      {
        name: "Find me",
        description: "Used by findById test"
      },
      owner.id
    );

    const foundProject = await repository.findById(createdProject.id);

    // toMatchObject 适合断言“对象里至少包含这些字段”。
    //
    // createdAt / updatedAt 每次运行都会变化，
    // 所以这里先不精确断言时间，只验证核心业务字段。
    expect(foundProject).toMatchObject({
      id: createdProject.id,
      name: "Find me",
      description: "Used by findById test",
      userId: owner.id
    });
  });

  it("returns null when finding a missing project", async () => {
    const repository = createPrismaProjectRepository();

    // repository 层的约定是：找不到数据返回 null。
    //
    // 它不直接抛 HTTP 404，因为 repository 不应该知道 Express 响应格式。
    // 后面 service / route 会负责把 null 转换成用户看到的错误响应。
    const result = await repository.findById("missing-project-id");

    expect(result).toBeNull();
  });
  it("在一个 transaction 里创建 Project 和初始 todos", async () => {
    const repository = createPrismaProjectRepository();
    const owner = await createTestUser("project-transaction-owner@example.com");

    const result = await repository.createWithTodos(
      {
        name: "111",
        description: "ewewe",
        todos: [{ title: "Todo 1" }, { title: "Todo 2" }]
      },
      owner.id
    );

    expect(result.project).toMatchObject({
      name: "111",
      userId: owner.id
    });

    expect(result.todos.map((todo) => todo.title)).toEqual(["Todo 1", "Todo 2"]);

    expect(result.todos.every((todo) => todo.projectId === result.project.id)).toBe(true);

    const savedTodos = await prisma.todo.findMany({
      where: { projectId: result.project.id },
      // MySQL 只在 orderBy 指定的字段上保证排序。
      //
      // 这里不能按 createdAt 断言插入顺序，因为两条 Todo 可能在同一毫秒创建，
      // createdAt 完全相同时数据库可以用任意顺序返回。
      // 测试真正关心的是“两条 Todo 都被 transaction 保存成功”，
      // 所以使用 title 排序后再比较，会比依赖隐式顺序稳定。
      orderBy: { title: "asc" }
    });

    expect(savedTodos.map((todo) => todo.title)).toEqual(["Todo 1", "Todo 2"]);
  });

  it("删除 Project 时同时删除它下面的 todos", async () => {
    const repository = createPrismaProjectRepository();
    const owner = await createTestUser("project-delete-owner@example.com");

    const result = await repository.createWithTodos(
      {
        name: "Delete project",
        todos: [{ title: "Todo A" }, { title: "Todo B" }]
      },
      owner.id
    );

    const deletedProject = await repository.delete(result.project.id);

    expect(deletedProject).toMatchObject({
      id: result.project.id,
      name: "Delete project"
    });

    const savedProject = await prisma.project.findUnique({
      where: { id: result.project.id }
    });
    const savedTodos = await prisma.todo.findMany({
      where: { projectId: result.project.id }
    });

    expect(savedProject).toBeNull();
    expect(savedTodos).toEqual([]);
  });

  it("删除不存在的 Project 时返回 null", async () => {
    const repository = createPrismaProjectRepository();

    const result = await repository.delete("missing-project-id");

    expect(result).toBeNull();
  });

  it("更新 project 的 name 和 description", async () => {
    const repository = createPrismaProjectRepository();
    const owner = await createTestUser("project-update-owner@example.com");

    const createdProject = await repository.create(
      {
        name: "Old project",
        description: "Old description"
      },
      owner.id
    );

    const updatedProject = await repository.update(createdProject.id, {
      name: "New project",
      description: "New description"
    });

    expect(updatedProject).toMatchObject({
      id: createdProject.id,
      name: "New project",
      description: "New description",
      userId: owner.id
    });
  });

  it("更新不存在的 project 时返回 null", async () => {
    const repository = createPrismaProjectRepository();

    const result = await repository.update("missing-project-id", {
      name: "Should not exist"
    });

    expect(result).toBeNull();
  });
});
