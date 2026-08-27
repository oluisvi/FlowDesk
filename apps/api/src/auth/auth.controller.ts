import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import type { RequestIdentity } from "../authorization/request-identity.js";
import { parseBody } from "../common/validation.js";
import { AccessGuard } from "./access.guard.js";
import { AuthService, type AuthResult } from "./auth.service.js";
import { CurrentIdentity } from "./current-identity.decorator.js";

const sensitive = { default: { limit: 8, ttl: 60_000 } };
const refreshCookiePath = "/api/v1/auth";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private context(request: Request) {
    return {
      userAgent: request.headers["user-agent"] ?? null,
      ipAddress: request.ip ?? null,
    };
  }

  private respond(result: AuthResult, response: Response) {
    response.cookie("flowdesk_refresh", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: refreshCookiePath,
      maxAge: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30) * 86_400_000,
    });
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post("register")
  @Throttle(sensitive)
  async register(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.respond(
      await this.auth.register(parseBody(RegisterSchema, body), this.context(request)),
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
  ) {
    return this.respond(
      await this.auth.login(parseBody(LoginSchema, body), this.context(request)),
      response,
    );
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle(sensitive)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.respond(
      await this.auth.refresh(
        request.cookies?.flowdesk_refresh as string | undefined,
        this.context(request),
      ),
      response,
    );
  }

  @Post("logout")
  @UseGuards(AccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentIdentity() identity: RequestIdentity,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(identity.userId, identity.sessionId);
    response.clearCookie("flowdesk_refresh", {
      path: refreshCookiePath,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
  }

  @Get("sessions")
  @UseGuards(AccessGuard)
  sessions(@CurrentIdentity() identity: RequestIdentity) {
    return this.auth.listSessions(identity.userId);
  }

  @Delete("sessions/:sessionId")
  @UseGuards(AccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("sessionId") sessionId: string,
  ) {
    return this.auth.revokeSession(identity.userId, sessionId);
  }

  @Post("password-recovery")
  @Throttle(sensitive)
  @HttpCode(HttpStatus.ACCEPTED)
  recover(@Body() body: unknown) {
    return this.auth.requestPasswordReset(
      parseBody(PasswordRecoverySchema, body).email,
    );
  }

  @Post("password-reset")
  @Throttle(sensitive)
  @HttpCode(HttpStatus.NO_CONTENT)
  reset(@Body() body: unknown) {
    const input = parseBody(PasswordResetSchema, body);
    return this.auth.resetPassword(input.token, input.password);
  }
}
