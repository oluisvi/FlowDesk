import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AccessGuard } from "./auth/access.guard.js";
import { AuthController } from "./auth/auth.controller.js";
import { AuthService } from "./auth/auth.service.js";
import { PasswordService } from "./auth/password.service.js";
import { PasswordResetDeliveryService } from "./auth/password-reset-delivery.service.js";
import { PolicyService } from "./authorization/policy.service.js";
import { WorkspaceAccessService } from "./authorization/workspace-access.service.js";
import { PrismaService } from "./common/prisma.service.js";
import { HealthController } from "./health/health.controller.js";
import { OperationsController } from "./operations/operations.controller.js";
import { OperationsService } from "./operations/operations.service.js";
import { OutboxDispatcherService } from "./outbox/outbox-dispatcher.service.js";
import { QueueInfrastructureService } from "./outbox/queue-infrastructure.service.js";
import { AutomationActionsService } from "./workflows/automation-actions.service.js";
import { WorkflowEngineService } from "./workflows/workflow-engine.service.js";
import { WorkflowsController } from "./workflows/workflows.controller.js";
import { WorkflowsService } from "./workflows/workflows.service.js";
import { WorkspacesController } from "./workspaces/workspaces.controller.js";
import { WorkspacesService } from "./workspaces/workspaces.service.js";

function jwtSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error("JWT_ACCESS_SECRET must contain at least 32 characters");
  }
  return secret ?? "flowdesk-local-development-secret-at-least-32-characters";
}

@Module({
  imports: [
    JwtModule.register({ secret: jwtSecret() }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: "default", ttl: 60_000, limit: 120 }],
      skipIf: () => process.env.NODE_ENV === "test",
    }),
  ],
  controllers: [
    HealthController,
    AuthController,
    WorkspacesController,
    OperationsController,
    WorkflowsController,
  ],
  providers: [
    PrismaService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    AccessGuard,
    PasswordService,
    PasswordResetDeliveryService,
    AuthService,
    PolicyService,
    WorkspaceAccessService,
    WorkspacesService,
    OperationsService,
    QueueInfrastructureService,
    OutboxDispatcherService,
    WorkflowsService,
    AutomationActionsService,
    WorkflowEngineService,
  ],
  exports: [PrismaService, WorkflowEngineService, QueueInfrastructureService],
})
export class AppModule {}
