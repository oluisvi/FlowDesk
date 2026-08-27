ALTER TYPE "ActivityActorType" ADD VALUE 'SYSTEM';
ALTER TYPE "ActivityEntityType" ADD VALUE 'WORKSPACE';
ALTER TYPE "ActivityEntityType" ADD VALUE 'WORKFLOW';
ALTER TYPE "ActivityEntityType" ADD VALUE 'NOTIFICATION';

ALTER TABLE "Client" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Task" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Notification" ADD COLUMN "metadata" JSONB;
ALTER TABLE "Activity" ALTER COLUMN "actorId" DROP NOT NULL;
ALTER TABLE "Activity" ADD COLUMN "metadata" JSONB;

CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');
CREATE TYPE "WorkflowExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED');
CREATE TYPE "WorkflowStepStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED');

CREATE TABLE "Workflow" (
  "id" UUID NOT NULL,
  "workspaceId" UUID NOT NULL,
  "name" VARCHAR(140) NOT NULL,
  "description" VARCHAR(1000),
  "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
  "draftDefinition" JSONB NOT NULL,
  "activeVersion" INTEGER,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowVersion" (
  "id" UUID NOT NULL,
  "workflowId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "definition" JSONB NOT NULL,
  "checksum" CHAR(64) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowExecution" (
  "id" UUID NOT NULL,
  "workspaceId" UUID NOT NULL,
  "workflowId" UUID NOT NULL,
  "workflowVersionId" UUID NOT NULL,
  "triggerEventId" UUID NOT NULL,
  "status" "WorkflowExecutionStatus" NOT NULL DEFAULT 'PENDING',
  "depth" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowExecution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowStepExecution" (
  "id" UUID NOT NULL,
  "executionId" UUID NOT NULL,
  "nodeId" VARCHAR(80) NOT NULL,
  "nodeType" VARCHAR(80) NOT NULL,
  "status" "WorkflowStepStatus" NOT NULL DEFAULT 'PENDING',
  "attempt" INTEGER NOT NULL DEFAULT 1,
  "input" JSONB,
  "output" JSONB,
  "error" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowStepExecution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutboxEvent" (
  "id" UUID NOT NULL,
  "workspaceId" UUID NOT NULL,
  "eventType" VARCHAR(120) NOT NULL,
  "aggregateType" VARCHAR(80) NOT NULL,
  "aggregateId" UUID NOT NULL,
  "payload" JSONB NOT NULL,
  "causation" JSONB,
  "depth" INTEGER NOT NULL DEFAULT 0,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "processedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IdempotencyRecord" (
  "id" UUID NOT NULL,
  "workspaceId" UUID NOT NULL,
  "executionId" UUID NOT NULL,
  "nodeId" VARCHAR(80) NOT NULL,
  "key" VARCHAR(240) NOT NULL,
  "result" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" UUID NOT NULL,
  "workspaceId" UUID,
  "userId" UUID,
  "action" VARCHAR(120) NOT NULL,
  "resourceType" VARCHAR(80) NOT NULL,
  "resourceId" VARCHAR(120),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Session_familyId_revokedAt_idx" ON "Session"("familyId", "revokedAt");
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");
CREATE INDEX "Membership_workspaceId_role_idx" ON "Membership"("workspaceId", "role");
CREATE INDEX "WorkspaceInvitation_workspaceId_email_createdAt_idx" ON "WorkspaceInvitation"("workspaceId", "email", "createdAt");
CREATE INDEX "Client_workspaceId_assignedMemberId_idx" ON "Client"("workspaceId", "assignedMemberId");
CREATE INDEX "Client_workspaceId_updatedAt_idx" ON "Client"("workspaceId", "updatedAt");
CREATE INDEX "Project_workspaceId_deadline_idx" ON "Project"("workspaceId", "deadline");
CREATE INDEX "Project_workspaceId_updatedAt_idx" ON "Project"("workspaceId", "updatedAt");
CREATE INDEX "Task_workspaceId_dueDate_idx" ON "Task"("workspaceId", "dueDate");
CREATE INDEX "Task_workspaceId_updatedAt_idx" ON "Task"("workspaceId", "updatedAt");
CREATE INDEX "Activity_workspaceId_actorType_createdAt_idx" ON "Activity"("workspaceId", "actorType", "createdAt");
CREATE INDEX "Workflow_workspaceId_status_updatedAt_idx" ON "Workflow"("workspaceId", "status", "updatedAt");
CREATE INDEX "Workflow_createdById_idx" ON "Workflow"("createdById");
CREATE UNIQUE INDEX "WorkflowVersion_workflowId_version_key" ON "WorkflowVersion"("workflowId", "version");
CREATE INDEX "WorkflowVersion_workflowId_createdAt_idx" ON "WorkflowVersion"("workflowId", "createdAt");
CREATE UNIQUE INDEX "WorkflowExecution_workflowId_triggerEventId_key" ON "WorkflowExecution"("workflowId", "triggerEventId");
CREATE INDEX "WorkflowExecution_workspaceId_createdAt_idx" ON "WorkflowExecution"("workspaceId", "createdAt");
CREATE INDEX "WorkflowExecution_workflowId_status_createdAt_idx" ON "WorkflowExecution"("workflowId", "status", "createdAt");
CREATE UNIQUE INDEX "WorkflowStepExecution_executionId_nodeId_attempt_key" ON "WorkflowStepExecution"("executionId", "nodeId", "attempt");
CREATE INDEX "WorkflowStepExecution_executionId_createdAt_idx" ON "WorkflowStepExecution"("executionId", "createdAt");
CREATE INDEX "OutboxEvent_processedAt_createdAt_idx" ON "OutboxEvent"("processedAt", "createdAt");
CREATE INDEX "OutboxEvent_workspaceId_eventType_createdAt_idx" ON "OutboxEvent"("workspaceId", "eventType", "createdAt");
CREATE INDEX "OutboxEvent_workspaceId_aggregateId_createdAt_idx" ON "OutboxEvent"("workspaceId", "aggregateId", "createdAt");
CREATE UNIQUE INDEX "IdempotencyRecord_key_key" ON "IdempotencyRecord"("key");
CREATE INDEX "IdempotencyRecord_workspaceId_executionId_idx" ON "IdempotencyRecord"("workspaceId", "executionId");
CREATE INDEX "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkflowVersion" ADD CONSTRAINT "WorkflowVersion_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkflowStepExecution" ADD CONSTRAINT "WorkflowStepExecution_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "WorkflowExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "WorkflowExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
