import { randomUUID } from "node:crypto";
import {
  ConflictException,
  GoneException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { LoginInput, RegisterInput } from "@flowdesk/shared";
import {
  IdentityRepository,
  type SessionRecord,
  type UserRecord,
} from "../common/identity.repository";
import { createOpaqueToken, hashOpaqueToken } from "../common/token-utils";
import { PasswordService } from "./password.service";

export interface SessionContext {
  userAgent: string | null;
  ipAddress: string | null;
}
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(IdentityRepository) private readonly repository: IdentityRepository,
    @Inject(PasswordService) private readonly passwords: PasswordService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject("CLOCK") private readonly now: () => Date,
  ) {}

  async register(
    input: RegisterInput,
    context: SessionContext,
  ): Promise<AuthResult> {
    if (await this.repository.findUserByEmail(input.email))
      throw new ConflictException("Account already exists");
    const user = await this.repository.createUser({
      ...input,
      passwordHash: await this.passwords.hash(input.password),
    });
    return this.createAuthenticatedSession(user, context);
  }

  async login(input: LoginInput, context: SessionContext): Promise<AuthResult> {
    const user = await this.repository.findUserByEmail(input.email);
    if (
      !user ||
      !(await this.passwords.verify(user.passwordHash, input.password))
    )
      throw new UnauthorizedException();
    return this.createAuthenticatedSession(user, context);
  }

  async refresh(
    refreshToken: string | undefined,
    context: SessionContext,
  ): Promise<AuthResult> {
    if (!refreshToken) throw new UnauthorizedException();
    const nextToken = createOpaqueToken();
    const result = await this.repository.rotateSession({
      tokenHash: hashOpaqueToken(refreshToken),
      nextTokenHash: hashOpaqueToken(nextToken),
      nextExpiresAt: this.refreshExpiry(),
      now: this.now(),
      ...context,
    });
    if (result.status !== "rotated") throw new UnauthorizedException();
    const user = await this.repository.findUserById(result.current.userId);
    if (!user) throw new UnauthorizedException();
    return this.result(user, result.current, nextToken);
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    await this.repository.revokeSessionForUser(sessionId, userId, this.now());
  }

  listSessions(userId: string): Promise<SessionRecord[]> {
    return this.repository.listSessions(userId, this.now());
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    if (
      !(await this.repository.revokeSessionForUser(
        sessionId,
        userId,
        this.now(),
      ))
    )
      throw new GoneException("Session is no longer active");
  }

  async requestPasswordReset(
    email: string,
  ): Promise<{ accepted: true; resetToken?: string }> {
    const user = await this.repository.findUserByEmail(email.toLowerCase());
    if (!user) return { accepted: true };
    const token = createOpaqueToken();
    await this.repository.createPasswordReset({
      userId: user.id,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(this.now().getTime() + 30 * 60_000),
    });
    return process.env.NODE_ENV === "production"
      ? { accepted: true }
      : { accepted: true, resetToken: token };
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const passwordHash = await this.passwords.hash(password);
    if (
      (await this.repository.consumePasswordReset({
        tokenHash: hashOpaqueToken(token),
        passwordHash,
        now: this.now(),
      })) !== "accepted"
    ) {
      throw new GoneException("Reset token is invalid or expired");
    }
  }

  private async createAuthenticatedSession(
    user: UserRecord,
    context: SessionContext,
  ): Promise<AuthResult> {
    const refreshToken = createOpaqueToken();
    const session = await this.repository.createSession({
      userId: user.id,
      familyId: randomUUID(),
      tokenHash: hashOpaqueToken(refreshToken),
      expiresAt: this.refreshExpiry(),
      ...context,
    });
    return this.result(user, session, refreshToken);
  }

  private result(
    user: UserRecord,
    session: SessionRecord,
    refreshToken: string,
  ): AuthResult {
    const accessToken = this.jwt.sign(
      { sub: user.id, sid: session.id },
      { expiresIn: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900) },
    );
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  private refreshExpiry(): Date {
    return new Date(
      this.now().getTime() +
        Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30) * 86_400_000,
    );
  }
}
