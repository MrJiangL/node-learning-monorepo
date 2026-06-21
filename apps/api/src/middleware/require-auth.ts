import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../db/prisma.js";
import { ERROR_CODE } from "../errors/error-code.js";
import { HTTP_STATUS } from "../http/http-status.js";
import { verifyAuthToken } from "../modules/auth/token.js";

function readBearerToken(authorizationHeader: string | undefined): string | null {
  // 浏览器或 curl 访问受保护接口时，通常会传：
  //
  // Authorization: Bearer eyJhbGciOi...
  //
  // 这里先处理没有 Authorization 请求头的情况。
  if (!authorizationHeader) {
    return null;
  }

  // Bearer token 的格式固定分成两段：
  // - 第一段：Bearer
  // - 第二段：真正的 JWT token
  const [scheme, token] = authorizationHeader.split(" ");

  // scheme 用小写比较，允许用户传 bearer / Bearer。
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = readBearerToken(req.header("authorization"));

    if (!token) {
      throw new AppError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODE.AUTH_REQUIRED,
        "Authentication is required"
      );
    }

    const payload = verifyAuthToken(token);

    // token 里有用户 id，但仍然要查数据库。
    //
    // 原因：
    // - 用户可能已经被删除
    // - 以后用户可能被禁用
    // - 数据库里的用户信息可能已经更新
    const user = await prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!user) {
      throw new AppError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODE.INVALID_TOKEN,
        "Authentication token is invalid"
      );
    }

    // req.user 是给后续业务路由使用的“当前登录用户”。
    //
    // 注意：这里手动组装安全 user，不把 passwordHash 挂到 req.user 上。
    // 这样即使后面的路由直接返回 req.user，也不会泄露密码哈希。
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };

    next();
  } catch (error) {
    // AppError 是我们主动抛出的业务错误，可以直接交给 errorHandler。
    if (error instanceof AppError) {
      next(error);
      return;
    }

    // jwt.verify 抛出的错误统一转换成 401。
    // 不把 “jwt expired” / “invalid signature” 这类内部细节直接返回给客户端。
    next(
      new AppError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODE.INVALID_TOKEN,
        "Authentication token is invalid"
      )
    );
  }
};
