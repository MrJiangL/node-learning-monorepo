import type { Todo } from "@learn/shared";
import type { PrismaTodo } from "./todos.prisma-repository.js";

// Prisma 返回的 createdAt / updatedAt / dueDate 是 Date 对象。
// shared Todo 里这些时间字段要返回 string，方便 HTTP JSON 输出。
export function mapPrismaTodoToTodo(todo: PrismaTodo): Todo {
  return {
    id: todo.id,
    title: todo.title,
    description: todo.description,
    completed: todo.completed,
    dueDate: todo.dueDate ? todo.dueDate.toISOString() : null,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
    projectId: todo.projectId
  };
}
