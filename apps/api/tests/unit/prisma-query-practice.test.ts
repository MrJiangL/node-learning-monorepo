import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db/prisma.js";
import { findProjectTodoSummary } from "../../src/exercises/prisma-query-practice.js";

async function createTestUser(email: string) {
  return prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email,
      passwordHash: "temporary-test-user",
      name: "Prisma Query Practice User"
    }
  });
}

describe("Prisma 查询关系练习", () => {
  beforeEach(async () => {
    // 清理顺序从子表到父表。
    //
    // Todo 依赖 Project，Project 依赖 User。
    // 如果先删 User，数据库外键可能会影响测试可读性。
    await prisma.todo.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
  });

  it("只返回当前用户自己的 project 和 todo 统计", async () => {
    const owner = await createTestUser("query-owner@example.com");
    const anotherUser = await createTestUser("query-other@example.com");

    const project = await prisma.project.create({
      data: {
        id: crypto.randomUUID(),
        name: "Owner Project",
        description: "Used by Prisma query practice",
        userId: owner.id
      }
    });

    await prisma.project.create({
      data: {
        id: crypto.randomUUID(),
        name: "Other Project",
        description: "Should not be returned",
        userId: anotherUser.id
      }
    });

    await prisma.todo.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          title: "Old done todo",
          completed: true,
          projectId: project.id,
          createdAt: new Date("2026-01-01T00:00:00.000Z")
        },
        {
          id: crypto.randomUUID(),
          title: "Middle active todo",
          completed: false,
          projectId: project.id,
          createdAt: new Date("2026-01-02T00:00:00.000Z")
        },
        {
          id: crypto.randomUUID(),
          title: "Latest active todo",
          completed: false,
          projectId: project.id,
          createdAt: new Date("2026-01-03T00:00:00.000Z")
        },
        {
          id: crypto.randomUUID(),
          title: "Newest done todo",
          completed: true,
          projectId: project.id,
          createdAt: new Date("2026-01-04T00:00:00.000Z")
        }
      ]
    });

    const result = await findProjectTodoSummary(project.id, owner.id);

    expect(result?.project).toMatchObject({
      id: project.id,
      name: "Owner Project",
      userId: owner.id
    });
    expect(result?.stats).toEqual({
      total: 4,
      completed: 2,
      active: 2
    });
    expect(result?.latestTodos.map((todo) => todo.title)).toEqual([
      "Newest done todo",
      "Latest active todo",
      "Middle active todo"
    ]);
  });

  it("查询别人的 project 时返回 null", async () => {
    const owner = await createTestUser("query-owner-null@example.com");
    const anotherUser = await createTestUser("query-other-null@example.com");

    const project = await prisma.project.create({
      data: {
        id: crypto.randomUUID(),
        name: "Private Project",
        userId: owner.id
      }
    });

    const result = await findProjectTodoSummary(project.id, anotherUser.id);

    expect(result).toBeNull();
  });
});
