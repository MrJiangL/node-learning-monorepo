import type { Todo as PrismaTodoModel } from "@prisma/client";
import type { CreateTodoInput, PaginatedResult, Todo, UpdateTodoInput } from "@learn/shared";
import { prisma } from "../../db/prisma.js";
import { mapPrismaTodoToTodo } from "./todos.mapper.js";
import type { ListTodosFilter, TodoRepository } from "./todos.repository.js";

export type PrismaTodo = PrismaTodoModel;

function parseOptionalDate(value: string | null | undefined): Date | null | undefined {
  // undefined 表示“不更新这个字段”。
  // null 表示“明确清空 dueDate”。
  // string 表示“设置一个新的截止时间”。
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return new Date(value);
}

export function createPrismaTodoRepository(): TodoRepository {
  return {
    async create(input: CreateTodoInput, projectId: string): Promise<Todo> {
      // prisma.todo.create 必须提供 schema.prisma 里所有必填字段。
      //
      // title 是 Todo 的必填字段，漏掉它时 TypeScript 会直接报错。
      // 这类错误非常有价值：它在运行前就提醒我们“数据库插入数据不完整”。
      const todo = await prisma.todo.create({
        data: {
          id: crypto.randomUUID(),
          title: input.title,
          description: input.description ?? null,
          dueDate: parseOptionalDate(input.dueDate) ?? null,
          projectId
        }
      });

      return mapPrismaTodoToTodo(todo);
    },

    async findAll(filter: ListTodosFilter): Promise<PaginatedResult<Todo>> {
      // dueAfter / dueBefore 是可选范围条件。
      //
      // Prisma 的 DateTime 字段需要 Date 对象，而不是字符串。
      // 所以 repository 在真正拼 where 时，把已经被 Zod 校验过的字符串转成 Date。
      const dueDateFilter =
        filter.dueAfter || filter.dueBefore
          ? {
              dueDate: {
                ...(filter.dueAfter ? { gte: new Date(filter.dueAfter) } : {}),
                ...(filter.dueBefore ? { lte: new Date(filter.dueBefore) } : {})
              }
            }
          : {};

      // where 是这一页数据和 total 统计共同使用的过滤条件。
      //
      // 这里一定要保持 findMany 和 count 用同一个 where：
      // - findMany 决定 data 返回哪些 Todo
      // - count 决定 meta.total 是多少
      // 如果两边条件不一致，前端看到的分页信息就会和实际数据对不上。
      const where = {
        projectId: filter.projectId,

        // completed 是可选过滤条件。
        //
        // 这里一定要判断 undefined，不能写 if (filter.completed)。
        // 因为 completed=false 表示“只查未完成 Todo”，它是一个合法条件。
        ...(filter.completed !== undefined ? { completed: filter.completed } : {}),

        // dueDateFilter 可能是空对象，也可能包含 dueDate: { gte/lte }。
        //
        // 不管有没有日期过滤，findMany 和 count 都会共用这个 where，
        // 这样 data 和 meta.total 才不会对不上。
        ...dueDateFilter,

        // title 有值时才追加搜索条件。
        //
        // contains 表示“标题中包含这个关键字”，不是完全相等。
        // 所以 title=report 可以匹配 "Write weekly report"。
        ...(filter.title ? { title: { contains: filter.title } } : {})
      };

      // Prisma 的 skip 表示“跳过前面多少条”。
      //
      // page 从 1 开始，所以第一页跳过 0 条，第二页跳过 pageSize 条。
      const skip = (filter.page - 1) * filter.pageSize;

      // findMany 和 count 可以并行执行。
      //
      // 这两个查询互不依赖：一个拿当前页数据，一个拿总数。
      // 用 Promise.all 可以减少等待时间，也能让分页实现更贴近真实后端写法。
      const [todos, total] = await Promise.all([
        prisma.todo.findMany({
          where,
          skip,
          take: filter.pageSize,
          orderBy: { [filter.sortBy]: filter.sortOrder }
        }),
        prisma.todo.count({ where })
      ]);

      return {
        data: todos.map(mapPrismaTodoToTodo),
        meta: {
          page: filter.page,
          pageSize: filter.pageSize,
          total,
          totalPages: Math.ceil(total / filter.pageSize)
        }
      };
    },

    async findById(id: string): Promise<Todo | null> {
      const todo = await prisma.todo.findUnique({ where: { id } });

      if (!todo) {
        return null;
      }

      return mapPrismaTodoToTodo(todo);
    },

    async update(id: string, input: UpdateTodoInput): Promise<Todo | null> {
      // Prisma update 找不到记录时会抛异常。
      // 我们的 repository 约定是“找不到返回 null”，所以先查一次。
      const todo = await prisma.todo.findUnique({ where: { id } });

      if (!todo) {
        return null;
      }

      const updatedTodo = await prisma.todo.update({
        where: { id },
        data: {
          ...input,

          // shared 类型里的 dueDate 是 string | null | undefined。
          // Prisma 写数据库时需要 Date | null | undefined。
          dueDate: parseOptionalDate(input.dueDate)
        }
      });

      return mapPrismaTodoToTodo(updatedTodo);
    },

    async delete(id: string): Promise<Todo | null> {
      // Prisma delete 找不到记录时会抛异常。
      //
      // 我们 repository 的约定是：
      // - 找得到：返回被删除的 Todo
      // - 找不到：返回 null
      //
      // 所以这里先 findUnique，再 delete。
      const todo = await prisma.todo.findUnique({ where: { id } });

      if (!todo) {
        return null;
      }

      const deletedTodo = await prisma.todo.delete({
        where: { id }
      });

      return mapPrismaTodoToTodo(deletedTodo);
    }
  };
}
