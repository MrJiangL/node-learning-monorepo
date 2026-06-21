import type { Project as PrismaProjectModel } from "@prisma/client";
import type {
  CreateProjectInput,
  CreateProjectWithTodosInput,
  PaginatedResult,
  Project,
  ProjectWithTodos,
  UpdateProjectInput
} from "@learn/shared";
import { prisma } from "../../db/prisma.js";
import { mapPrismaTodoToTodo } from "../todos/todos.mapper.js";
import { mapPrismaProjectToProject } from "./projects.mapper.js";
import type { ListProjectsFilter, ProjectRepository } from "./projects.repository.js";

export type PrismaProject = PrismaProjectModel;

export function createPrismaProjectRepository(): ProjectRepository {
  return {
    async create(input: CreateProjectInput, userId: string): Promise<Project> {
      // prisma.project 对应 schema.prisma 里的 model Project。
      //
      // create() 会往 Project 表插入一行数据。
      // 这里特别注意 userId：
      // - input 只代表客户端允许提交的数据
      // - userId 代表当前登录用户
      //
      // 所以 userId 必须来自函数参数，而不是来自 input。
      // 这能避免用户自己传一个 userId，把项目创建到别人名下。
      const project = await prisma.project.create({
        data: {
          id: crypto.randomUUID(),
          name: input.name,
          description: input.description ?? null,
          userId
        }
      });

      return mapPrismaProjectToProject(project);
    },

    async createWithTodos(
      input: CreateProjectWithTodosInput,
      userId: string
    ): Promise<ProjectWithTodos> {
      const result = await prisma.$transaction(async (tx) => {
        // 第一步：先创建 Project。
        //
        // 这里一定要 await。
        // tx.project.create 返回的是 Promise，不是已经创建好的 project 对象。
        // 如果少了 await，后面的 project.id 会是 undefined，Todo 就没有 projectId。
        const project = await tx.project.create({
          data: {
            id: crypto.randomUUID(),
            name: input.name,
            description: input.description ?? null,
            userId
          }
        });

        // 第二步：创建 Project 下的初始 Todo。
        //
        // 这里仍然使用 tx.todo.create，而不是外层 prisma.todo.create。
        // 只要这些写操作都走 tx，它们就属于同一个 transaction。
        // 任意一步失败时，Prisma 会回滚前面已经完成的写入。
        const todos = await Promise.all(
          input.todos.map((todo) =>
            tx.todo.create({
              data: {
                id: crypto.randomUUID(),
                title: todo.title,
                description: todo.description ?? null,
                dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
                projectId: project.id
              }
            })
          )
        );

        return { project, todos };
      });

      return {
        project: mapPrismaProjectToProject(result.project),
        todos: result.todos.map(mapPrismaTodoToTodo)
      };
    },

    async findAll(filter: ListProjectsFilter): Promise<PaginatedResult<Project>> {
      // where: { userId } 是这层最重要的权限边界基础。
      //
      // 虽然真正的鉴权会在 API/service 层做，但 repository 从一开始就提供
      // “按用户查询”的能力，后面写 GET /projects 时就不会意外返回所有项目。
      const where = {
        userId: filter.userId
      };

      const skip = (filter.page - 1) * filter.pageSize;

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          skip,
          take: filter.pageSize,
          orderBy: {
            [filter.sortBy]: filter.sortOrder
          }
        }),
        prisma.project.count({ where })
      ]);

      return {
        data: projects.map(mapPrismaProjectToProject),
        meta: {
          page: filter.page,
          pageSize: filter.pageSize,
          total,
          totalPages: Math.ceil(total / filter.pageSize)
        }
      };
    },

    async findById(id: string): Promise<Project | null> {
      // findUnique 适合按唯一字段查询。
      // schema.prisma 里 Project.id 是 @id，所以这里可以写 where: { id }。
      const project = await prisma.project.findUnique({ where: { id } });

      if (!project) {
        return null;
      }

      return mapPrismaProjectToProject(project);
    },

    async delete(id: string): Promise<Project | null> {
      const project = await prisma.project.findUnique({ where: { id } });

      if (!project) {
        return null;
      }

      const deletedProject = await prisma.$transaction(async (tx) => {
        // Todo 依赖 Project。
        //
        // 这里显式先删这个 Project 下的 Todo，再删 Project。
        // 两个删除动作放进同一个 transaction，避免只删掉一半造成数据不一致。
        await tx.todo.deleteMany({
          where: { projectId: id }
        });

        return tx.project.delete({ where: { id } });
      });

      return mapPrismaProjectToProject(deletedProject);
    },

    async update(id: string, input: UpdateProjectInput): Promise<Project | null> {
      // Prisma update 在找不到记录时会抛异常。
      //
      // 我们当前 repository 约定是：
      // - 找得到：返回 Project
      // - 找不到：返回 null
      //
      // 所以这里先 findUnique，再 update。
      const project = await prisma.project.findUnique({ where: { id } });

      if (!project) {
        return null;
      }

      const updatedProject = await prisma.project.update({
        where: { id },
        data: input
      });

      return mapPrismaProjectToProject(updatedProject);
    }
  };
}
