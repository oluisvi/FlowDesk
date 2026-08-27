import { randomUUID } from "node:crypto";
import {
  ConflictException,
  GoneException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { LoginInput, RegisterInput } from "@flowdesk/shared";
import { PrismaService } from "../common/prisma.service.js";
import { createOpaqueToken, hashOpaqueToken } from "../common/token-utils.js";
import { PasswordService } from "./password.service.js";
import { PasswordResetDeliveryService } from "./password-reset-delivery.service.js";

export interface SessionContext {
  userAgent: string | null;
  ipAddress: string | null;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string };
}

type SafeUser = { id: string; email: string; name: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
    private readonly resetDelivery: PasswordResetDeliveryService,
  ) {}

  private now(): Date {
    return new Date();
  }

  private refreshExpiry(): Date {
    return new Date(
      Date.now() +
        Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30) * 86_400_000,
    );
  }

  private access(user: SafeUser, sessionId: string): Omit<AuthResult, "refreshToken"> {
    return {
      accessToken: this.jwt.sign(
        { sub: user.id, sid: sessionId },
        { expiresIn: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900) },
      ),
      user,
    };
  }

  private audit(
    userId: string | null,
    action: string,
    resourceId: string | null,
    context?: SessionContext,
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceType: "AUTH",
        resourceId,
        metadata: context
          ? { userAgent: context.userAgent, ipAddress: context.ipAddress }
          : undefined,
      },
    });
  }

  async register(input: RegisterInput, context: SessionContext): Promise<AuthResult> {
    if (await this.prisma.user.findUnique({ where: { email: input.email } })) {
      throw new ConflictException("Account already exists");
    }

    let user: SafeUser;
    try {
      user = await this.prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash: await this.passwords.hash(input.password),
        },
        select: { id: true, email: true, name: true },
      });
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? (error as { code?: unknown }).code
          : undefined;
      if (code === "P2002") throw new ConflictException("Account already exists");
      throw error;
    }
    const result = await this.createSession(user, context);
    await this.audit(user.id, "auth.registered", result.user.id, context);
    return result;
  }

  async login(input: LoginInput, context: SessionContext): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await this.passwords.verify(user.passwordHash, input.password))) {
      throw new UnauthorizedException();
    }

    const result = await this.createSession(user, context);
    await this.audit(user.id, "auth.login", result.user.id, context);
    return result;
  }

  private async createSession(user: SafeUser, context: SessionContext): Promise<AuthResult> {
    const token = createOpaqueToken();
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        familyId: randomUUID(),
        tokenHash: hashOpaqueToken(token),
        expiresAt: this.refreshExpiry(),
        ...context,
      },
    });
    return { ...this.access(user, session.id), refreshToken: token };
  }

  async refresh(token: string | undefined, context: SessionContext): Promise<AuthResult> {
    if (!token) throw new UnauthorizedException();

    const tokenHash = hashOpaqueToken(token);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (!session) throw new UnauthorizedException();

    const now = this.now();
    if (session.revokedAt) {
      await this.prisma.session.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: now },
      });
      await this.audit(session.userId, "auth.refresh_reuse_detected", session.id, context);
      throw new UnauthorizedException();
    }

    if (session.expiresAt <= now) {
      await this.prisma.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now },
      });
      throw new UnauthorizedException();
    }

    const nextToken = createOpaqueToken();
    try {
      const nextSession = await this.prisma.$transaction(async (tx) => {
        const revoked = await tx.session.updateMany({
          where: { id: session.id, revokedAt: null },
          data: { revokedAt: now, lastUsedAt: now },
        });
        if (revoked.count !== 1) throw new Error("REFRESH_ROTATION_RACE");

        return tx.session.create({
          data: {
            userId: session.userId,
            familyId: session.familyId,
            tokenHash: hashOpaqueToken(nextToken),
            expiresAt: this.refreshExpiry(),
            ...context,
          },
        });
      });
      return {
        ...this.access(session.user, nextSession.id),
        refreshToken: nextToken,
      };
    } catch (error) {
      if (error instanceof Error && error.message === "REFRESH_ROTATION_RACE") {
        await this.prisma.session.updateMany({
          where: { familyId: session.familyId, revokedAt: null },
          data: { revokedAt: this.now() },
        });
        await this.audit(session.userId, "auth.refresh_reuse_detected", session.id, context);
        throw new UnauthorizedException();
      }
      throw error;
    }
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId },
      data: { revokedAt: this.now() },
    });
    await this.audit(userId, "auth.logout", sessionId);
  }

  listSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: this.now() } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        userAgent: true,
        ipAddress: true,
      },
    });
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const result = await this.prisma.session.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: this.now() },
    });
    if (!result.count) throw new GoneException("Session is no longer active");
    await this.audit(userId, "auth.session_revoked", sessionId);
  }

  async requestPasswordReset(
    email: string,
  ): Promise<{ accepted: true; resetToken?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });
    if (!user) return { accepted: true };

    const token = createOpaqueToken();
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: this.now() },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashOpaqueToken(token),
          expiresAt: new Date(Date.now() + 30 * 60_000),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "auth.password_reset_requested",
          resourceType: "AUTH",
          resourceId: user.id,
        },
      }),
    ]);

    if (process.env.NODE_ENV === "production") {
      const delivered = await this.resetDelivery.deliver(email, token);
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: delivered
            ? "auth.password_reset_delivery_succeeded"
            : "auth.password_reset_delivery_unavailable",
          resourceType: "AUTH",
          resourceId: user.id,
        },
      });
      return { accepted: true };
    }

    return { accepted: true, resetToken: token };
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashOpaqueToken(token) },
    });
    if (!record) throw new GoneException("Reset token is invalid or expired");

    const passwordHash = await this.passwords.hash(password);
    const now = this.now();
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id: record.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) {
        throw new GoneException("Reset token is invalid or expired");
      }

      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });
      await tx.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.auditLog.create({
        data: {
          userId: record.userId,
          action: "auth.password_reset_completed",
          resourceType: "AUTH",
          resourceId: record.userId,
        },
      });
    });
  }
}
