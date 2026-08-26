import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AccessGuard } from "./auth/access.guard";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { PasswordService } from "./auth/password.service";
import { PolicyService } from "./authorization/policy.service";
import { WorkspaceAccessService } from "./authorization/workspace-access.service";
import { IdentityRepository } from "./common/identity.repository";
import { PrismaIdentityRepository } from "./common/prisma-identity.repository";
import { PrismaService } from "./common/prisma.service";
import { HealthController } from "./health/health.controller";
import { WorkspacesController } from "./workspaces/workspaces.controller";
import { WorkspacesService } from "./workspaces/workspaces.service";
import { OperationsController } from "./operations/operations.controller";
import { OperationsRepository } from "./operations/operations.repository";
import { OperationsService } from "./operations/operations.service";
import { PrismaOperationsRepository } from "./operations/prisma-operations.repository";

function jwtSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32))
    throw new Error("JWT_ACCESS_SECRET must contain at least 32 characters");
  return secret ?? "flowdesk-test-only-secret-at-least-32-characters";
}

@Module({
  imports: [
    JwtModule.register({ secret: jwtSecret() }),
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 100 }]),
  ],
  controllers: [
    HealthController,
    AuthController,
    WorkspacesController,
    OperationsController,
  ],
  providers: [
    PrismaService,
    { provide: IdentityRepository, useClass: PrismaIdentityRepository },
    { provide: OperationsRepository, useClass: PrismaOperationsRepository },
    { provide: "CLOCK", useValue: () => new Date() },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    AccessGuard,
    AuthService,
    PasswordService,
    PolicyService,
    WorkspaceAccessService,
    WorkspacesService,
    OperationsService,
  ],
})
export class AppModule {}
