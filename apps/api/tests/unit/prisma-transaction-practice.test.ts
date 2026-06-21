import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db/prisma.js";
import { createProjectWithTodosOrRollback } from "../../src/exercises/prisma-transaction-practice.js";

async function createTestUser(email: string) {
  return prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email,
      passwordHash: "temporary-test-user",
      name: "Prisma Transaction Practice User"
    }
  });
}

describe("Prisma transaction 回滚练习", () => {
  beforeEach(async () => {
    // 测试直接操作数据库时，要先清理子表，再清理父表。
    //
    // Todo 依赖 Project，Project 依赖 User。
    // 这个顺序能避免外键关系影响测试清理。
    await prisma.todo.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
  });

  it("所有写入成功时会创建 project 和 todos", async () => {
    const owner = await createTestUser("transaction-success@example.com");

    const result = await createProjectWithTodosOrRollback(
      {
        name: "Transaction success project",
        todos: [{ title: "Todo A" }, { title: "Todo B" }]
      },
      owner.id
    );

    expect(result.project).toMatchObject({
      name: "Transaction success project",
      userId: owner.id
    });
    expect(result.todos.map((todo) => todo.title)).toEqual(["Todo A", "Todo B"]);

    const savedProjects = await prisma.project.findMany({
      where: { userId: owner.id }
    });
    const savedTodos = await prisma.todo.findMany({
      where: { projectId: result.project.id },
      orderBy: { createdAt: "asc" }
    });

    expect(savedProjects).toHaveLength(1);
    expect(savedTodos.map((todo) => todo.title)).toEqual(["Todo A", "Todo B"]);
  });

  it("中途抛错时会回滚 project 和已经创建的 todos", async () => {
    const owner = await createTestUser("transaction-rollback@example.com");

    await expect(
      createProjectWithTodosOrRollback(
        {
          name: "Should rollback project",
          todos: [{ title: "Todo before failure" }, { title: "ROLLBACK" }]
        },
        owner.id
      )
    ).rejects.toThrow("触发 transaction 回滚");

    const savedProjects = await prisma.project.findMany({
      where: { userId: owner.id }
    });
    const savedTodos = await prisma.todo.findMany();

    expect(savedProjects).toEqual([]);
    expect(savedTodos).toEqual([]);
  });
});
