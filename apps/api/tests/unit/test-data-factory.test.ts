import { describe, expect, it, beforeEach } from "vitest";
import { cleanupDatabase } from "../helpers/api-test-helpers.js";
import {
  createFactoryProject,
  createFactoryTodo,
  createFactoryUser
} from "../helpers/test-data-factory.js";

describe("测试数据工厂", () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  it("可以创建用户、项目和待办数据", async () => {
    const user = await createFactoryUser();
    const project = await createFactoryProject({ userId: user.id });
    const todo = await createFactoryTodo({ projectId: project.id });

    expect(user.email).toContain("factory-user-");
    expect(project.userId).toBe(user.id);
    expect(todo.projectId).toBe(project.id);
    expect(todo.completed).toBe(false);
  });
});
