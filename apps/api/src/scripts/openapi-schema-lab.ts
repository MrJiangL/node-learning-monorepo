import { zodToJsonSchema } from "zod-to-json-schema";
import { loginUserSchema } from "../modules/auth/auth.schema.js";
import { createProjectSchema } from "../modules/projects/projects.schema.js";
import { createTodoSchema } from "../modules/todos/todos.schema.js";

// 这个脚本的目标不是启动 API 服务，而是观察：
// “我们平时用来校验请求 body 的 Zod schema，能不能转换成文档里能使用的 schema？”
//
// 你可以把它理解成一个学习用的小实验：
// - Zod schema：给后端运行时校验输入
// - JSON Schema：给文档、工具、OpenAPI 描述数据结构
const schemas = {
  LoginRequest: loginUserSchema,
  CreateProjectRequest: createProjectSchema,
  CreateTodoRequest: createTodoSchema
};

// Object.entries() 会把对象变成一组 [name, schema]。
//
// 例如：
// {
//   LoginRequest: loginUserSchema
// }
//
// 会变成：
// [
//   ["LoginRequest", loginUserSchema]
// ]
//
// 这样我们就可以用循环批量转换多个 Zod schema。
const jsonSchemas = Object.fromEntries(
  Object.entries(schemas).map(([name, schema]) => [
    name,
    zodToJsonSchema(schema, {
      // name 会出现在生成结果里，方便你知道当前 schema 是谁。
      name,

      // OpenAPI 3.1 和 JSON Schema 2020-12 更接近。
      // 这里先用默认转换结果观察结构，不急着追求完整生产配置。
      target: "jsonSchema7"
    })
  ])
);

// JSON.stringify(value, null, 2) 的第三个参数 2 表示格式化缩进。
// 这样终端输出更容易阅读。
console.log(JSON.stringify(jsonSchemas, null, 2));
