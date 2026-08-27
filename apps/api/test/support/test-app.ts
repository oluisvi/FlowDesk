import type { INestApplication } from "@nestjs/common";
import { loadEnvironment } from "@flowdesk/config";
import request from "supertest";
import { createApp } from "../../src/app.factory.js";
import { PrismaService } from "../../src/common/prisma.service.js";

export interface TestSession {
  accessToken: string;
  cookie: string;
  user: { id: string; email: string; name: string };
}

export async function startTestApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  process.env.NODE_ENV = "test";
  process.env.FLOWDESK_DISABLE_OUTBOX_DISPATCHER = "true";
  process.env.JWT_ACCESS_SECRET = "flowdesk-test-secret-that-is-longer-than-thirty-two-characters";
  process.env.DATABASE_URL ??= loadEnvironment().databaseUrl;
  const url = new URL(process.env.DATABASE_URL);
  if (!["localhost", "127.0.0.1", "postgres"].includes(url.hostname)) {
    throw new Error("Integration tests refuse to use a non-local PostgreSQL host.");
  }
  const app = await createApp();
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

export async function resetTestDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$transaction([
    prisma.idempotencyRecord.deleteMany(),
    prisma.workflowStepExecution.deleteMany(),
    prisma.workflowExecution.deleteMany(),
    prisma.workflowVersion.deleteMany(),
    prisma.workflow.deleteMany(),
    prisma.outboxEvent.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.activity.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.taskComment.deleteMany(),
    prisma.task.deleteMany(),
    prisma.projectMember.deleteMany(),
    prisma.project.deleteMany(),
    prisma.client.deleteMany(),
    prisma.workspaceInvitation.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.session.deleteMany(),
    prisma.workspace.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export async function register(
  app: INestApplication,
  email: string,
  name = "FlowDesk Test",
): Promise<TestSession> {
  const response = await request(app.getHttpServer())
    .post("/api/v1/auth/register")
    .send({ email, name, password: "StrongPassword123!" })
    .expect(201);
  return {
    accessToken: response.body.accessToken as string,
    cookie: String(response.headers["set-cookie"]?.[0] ?? ""),
    user: response.body.user as TestSession["user"],
  };
}

export function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

export async function createWorkspace(
  app: INestApplication,
  token: string,
  name = "Workspace Test",
): Promise<{ id: string; name: string; slug: string }> {
  const response = await request(app.getHttpServer())
    .post("/api/v1/workspaces")
    .set(auth(token))
    .send({ name })
    .expect(201);
  return response.body as { id: string; name: string; slug: string };
}
