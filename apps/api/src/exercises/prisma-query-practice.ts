import type { Project, Todo } from "@learn/shared";
import { prisma } from "../db/prisma.js";
import { mapPrismaProjectToProject } from "../modules/projects/projects.mapper.js";
import { mapPrismaTodoToTodo } from "../modules/todos/todos.mapper.js";

export type ProjectTodoSummary = {
  project: Project;

  // latestTodos 不是这个 Project 的全部 Todo。
  //
  // 这个练习刻意只取最近 3 条，是为了让你练 Prisma relation include 里的：
  // - orderBy：关联数据怎么排序
  // - take：关联数据怎么限制数量
  latestTodos: Todo[];

  stats: {
    total: number;
    completed: number;
    active: number;
  };
};

export async function findProjectTodoSummary(
  projectId: string,
  userId: string
): Promise<ProjectTodoSummary | null> {
  // 这里用 findFirst，而不是 findUnique。
  //
  // findUnique 适合只按唯一字段查，例如 where: { id: projectId }。
  // 但这个练习要把“权限边界”放进查询本身：
  // - id: projectId 确定查哪一个 Project
  // - userId 确定这个 Project 必须属于当前用户
  //
  // 这样如果用户拿别人的 projectId 来查，数据库层直接查不到，返回 null。
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      // Project 和 Todo 在 schema.prisma 里是一对多关系：
      // Project.todos -> Todo[]
      //
      // include.todos 表示查 Project 时，把它关联的 Todo 也一起查出来。
      todos: {
        // 最近创建的排前面。
        orderBy: { createdAt: "desc" },

        // 只取最近 3 条，避免把全部 Todo 都带出来。
        take: 3
      }
    }
  });

  if (!project) {
    return null;
  }

  // count 只返回数量，不返回完整数据行。
  //
  // 如果这里只需要统计数量，用 count 比 findMany 再 length 更清晰，
  // 也避免把不需要的数据从数据库拉到 Node 进程里。
  const totalTodos = await prisma.todo.count({ where: { projectId } });

  const completedTodos = await prisma.todo.count({
    where: { projectId, completed: true }
  });

  return {
    project: mapPrismaProjectToProject(project),
    latestTodos: project.todos.map(mapPrismaTodoToTodo),
    stats: {
      total: totalTodos,
      completed: completedTodos,
      active: totalTodos - completedTodos
    }
  };
}
