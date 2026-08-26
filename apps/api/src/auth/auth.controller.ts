import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  LoginSchema,
  PasswordRecoverySchema,
  PasswordResetSchema,
  RegisterSchema,
} from "@flowdesk/shared";
import type { Request, Response } from "express";
import type { RequestIdentity } from "../authorization/request-identity";
import { parseBody } from "../common/validation";
import { AccessGuard } from "./access.guard";
import { AuthService, type AuthResult } from "./auth.service";
import { CurrentIdentity } from "./current-identity.decorator";

const sensitive = { default: { limit: 8, ttl: 60_000 } };

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post("register")
  @Throttle(sensitive)
  async register(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Omit<AuthResult, "refreshToken">> {
    return this.respond(
      await this.auth.register(
        parseBody(RegisterSchema, body),
        this.context(request),
      ),
      response,
    );
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle(sensitive)
  async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Omit<AuthResult, "refreshToken">> {
    return this.respond(
      await this.auth.login(
        parseBody(LoginSchema, body),
        this.context(request),
      ),
      response,
    );
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle(sensitive)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Omit<AuthResult, "refreshToken">> {
    const result = await this.auth.refresh(
      request.cookies?.flowdesk_refresh as string | undefined,
      this.context(request),
    );
    return this.respond(result, response);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessGuard)
  async logout(
    @CurrentIdentity() identity: RequestIdentity,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(identity.userId, identity.sessionId);
    response.clearCookie("flowdesk_refresh", { path: "/api/v1/auth" });
  }

  @Get("sessions")
  @UseGuards(AccessGuard)
  async sessions(
    @CurrentIdentity() identity: RequestIdentity,
  ): Promise<Array<Record<string, unknown>>> {
    return (await this.auth.listSessions(identity.userId)).map((session) => ({
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      revokedAt: session.revokedAt,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
    }));
  }

  @Delete("sessions/:sessionId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessGuard)
  async revoke(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("sessionId") sessionId: string,
  ): Promise<void> {
    await this.auth.revokeSession(identity.userId, sessionId);
  }

  @Post("password-recovery")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle(sensitive)
  recover(
    @Body() body: unknown,
  ): Promise<{ accepted: true; resetToken?: string }> {
    return this.auth.requestPasswordReset(
      parseBody(PasswordRecoverySchema, body).email,
    );
  }

  @Post("password-reset")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(sensitive)
  async reset(@Body() body: unknown): Promise<void> {
    const input = parseBody(PasswordResetSchema, body);
    await this.auth.resetPassword(input.token, input.password);
  }

  private respond(
    result: AuthResult,
    response: Response,
  ): Omit<AuthResult, "refreshToken"> {
    response.cookie("flowdesk_refresh", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/v1/auth",
      maxAge: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30) * 86_400_000,
    });
    return { accessToken: result.accessToken, user: result.user };
  }

  private context(request: Request): {
    userAgent: string | null;
    ipAddress: string | null;
  } {
    return {
      userAgent: request.headers["user-agent"] ?? null,
      ipAddress: request.ip ?? null,
    };
  }
}
