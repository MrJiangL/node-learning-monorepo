import type { ProjectWithTodos } from "@learn/shared";
import { prisma } from "../db/prisma.js";
import { mapPrismaProjectToProject } from "../modules/projects/projects.mapper.js";
import { mapPrismaTodoToTodo } from "../modules/todos/todos.mapper.js";
import type { PrismaTodo } from "../modules/todos/todos.prisma-repository.js";

export type TransactionTodoInput = {
  title: string;
};

export type TransactionProjectInput = {
  name: string;
  todos: TransactionTodoInput[];
};

export async function createProjectWithTodosOrRollback(
  input: TransactionProjectInput,
  userId: string
): Promise<ProjectWithTodos> {
  const result = await prisma.$transaction(async (tx) => {
    // transaction 里的所有写操作都要使用 tx。
    //
    // 你这次已经写对了 Project 的部分：使用 tx.project.create，
    // 这样 Project 创建动作属于当前 transaction。
    const project = await tx.project.create({
      data: {
        id: crypto.randomUUID(),
        name: input.name,
        userId
      }
    });

    // 这里故意使用 for...of，而不是 Promise.all。
    //
    // 对学习 transaction 来说，顺序写入更直观：
    // - 先创建 Project
    // - 再创建第 1 个 Todo
    // - 如果遇到 ROLLBACK，直接抛错
    //
    // 只要这个错误是在 prisma.$transaction 的回调内部抛出的，
    // Prisma 就会回滚前面已经通过 tx 完成的写入。
    const todos: PrismaTodo[] = [];

    for (const todo of input.todos) {
      if (todo.title === "ROLLBACK") {
        throw new Error("触发 transaction 回滚");
      }

      const createdTodo = await tx.todo.create({
        data: {
          id: crypto.randomUUID(),
          title: todo.title,
          projectId: project.id
        }
      });

      todos.push(createdTodo);
    }

    return { project, todos };
  });

  return {
    project: mapPrismaProjectToProject(result.project),
    todos: result.todos.map(mapPrismaTodoToTodo)
  };
}
