import type { AuthTokenResult, LoginUserInput, RegisterUserInput, User } from "@learn/shared";
import { AppError } from "../../errors/app-error.js";
import { ERROR_CODE } from "../../errors/error-code.js";
import { HTTP_STATUS } from "../../http/http-status.js";
import { prisma } from "../../db/prisma.js";
import { hashPassword, verifyPassword } from "./password.js";
import { createRefreshToken, getRefreshTokenExpiresAt, hashRefreshToken } from "./refresh-token.js";
import { signAuthToken } from "./token.js";

function mapUserToUser(user: {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

export function createAuthService() {
  return {
    async register(input: RegisterUserInput): Promise<User> {
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email }
      });

      if (existingUser) {
        throw new AppError(
          HTTP_STATUS.CONFLICT,
          ERROR_CODE.USER_EMAIL_EXISTS,
          "Email is already registered"
        );
      }

      const passwordHash = await hashPassword(input.password);

      const user = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email: input.email,
          name: input.name ?? null,
          passwordHash
        }
      });

      return mapUserToUser(user);
    },

    async login(input: LoginUserInput): Promise<AuthTokenResult> {
      const user = await prisma.user.findUnique({
        where: { email: input.email }
      });

      if (!user) {
        throw new AppError(
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODE.INVALID_CREDENTIALS,
          "Email or password is incorrect"
        );
      }

      // 不管是邮箱不存在还是密码错误，都返回同一个错误。
      // 这样外部调用方不能通过错误信息判断某个邮箱是否已经注册。
      const passwordMatches = await verifyPassword(input.password, user.passwordHash);

      if (!passwordMatches) {
        throw new AppError(
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODE.INVALID_CREDENTIALS,
          "Email or password is incorrect"
        );
      }

      const safeUser = mapUserToUser(user);

      // token 里只放识别用户需要的最小信息。
      // 不要把 passwordHash、数据库连接信息、角色以外的敏感数据放进 JWT。
      const accessToken = signAuthToken({
        sub: user.id,
        email: user.email
      });

      const refreshToken = createRefreshToken();

      await prisma.userSession.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          refreshTokenHash: hashRefreshToken(refreshToken),
          expiresAt: getRefreshTokenExpiresAt()
        }
      });

      return {
        user: safeUser,
        accessToken,
        refreshToken
      };
    },

    async refresh(input: { refreshToken: string }): Promise<AuthTokenResult> {
      // 客户端提交的是 refresh token 明文。
      //
      // 数据库里保存的是 hash，所以第一步要用同样算法 hash 一次，
      // 再用 hash 去查 session。
      const refreshTokenHash = hashRefreshToken(input.refreshToken);

      const session = await prisma.userSession.findUnique({
        where: { refreshTokenHash },
        include: { user: true }
      });

      // 不管是 token 不存在、已撤销、已过期，统一返回同一个错误。
      //
      // 这样调用方不能通过错误差异推断“这个 refresh token 是否曾经存在过”。
      if (!session || session.revokedAt !== null || session.expiresAt.getTime() <= Date.now()) {
        throw new AppError(
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_CODE.INVALID_REFRESH_TOKEN,
          "Invalid refresh token"
        );
      }

      const accessToken = signAuthToken({
        sub: session.user.id,
        email: session.user.email
      });

      const newRefreshToken = createRefreshToken();

      // refresh token rotation：
      //
      // refresh 成功后，不继续复用旧 refreshToken。
      // 而是：
      // 1. 把旧 session 标记为 revoked
      // 2. 为同一个用户创建一条新的 session
      //
      // 这两个数据库写入必须放在同一个 transaction 里。
      // 否则可能出现“旧 token 已撤销，但新 token 没创建成功”的半完成状态。
      await prisma.$transaction([
        prisma.userSession.update({
          where: { id: session.id },
          data: { revokedAt: new Date() }
        }),
        prisma.userSession.create({
          data: {
            id: crypto.randomUUID(),
            userId: session.user.id,
            refreshTokenHash: hashRefreshToken(newRefreshToken),
            expiresAt: getRefreshTokenExpiresAt()
          }
        })
      ]);

      return {
        user: mapUserToUser(session.user),
        accessToken,
        refreshToken: newRefreshToken
      };
    },

    async logout(input: { refreshToken: string }): Promise<void> {
      const refreshTokenHash = hashRefreshToken(input.refreshToken);

      // logout 采用“幂等”设计：
      // - token 存在：撤销对应 session
      // - token 不存在：也返回成功
      //
      // 这样不会向外部泄露某个 refresh token 是否真实存在。
      await prisma.userSession.updateMany({
        where: {
          refreshTokenHash,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    }
  };
}
