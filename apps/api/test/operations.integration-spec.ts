import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaService } from "../src/common/prisma.service.js";
import { auth, createWorkspace, register, resetTestDatabase, startTestApp } from "./support/test-app.js";

let app: INestApplication;
let prisma: PrismaService;
beforeAll(async () => ({ app, prisma } = await startTestApp()));
beforeEach(async () => resetTestDatabase(prisma));
afterAll(async () => app.close());

describe("workspace operations", () => {
  it("creates client → project → task and records activity/outbox", async () => {
    const session = await register(app, "ops@flowdesk.test");
    const workspace = await createWorkspace(app, session.accessToken);
    const client = await request(app.getHttpServer()).post(`/api/v1/workspaces/${workspace.id}/clients`).set(auth(session.accessToken)).send({ name: "Studio Nova", company: "Studio Nova", status: "ACTIVE", tags: ["launch"] }).expect(201);
    const project = await request(app.getHttpServer()).post(`/api/v1/workspaces/${workspace.id}/projects`).set(auth(session.accessToken)).send({ name: "Brand launch", clientId: client.body.id, status: "ACTIVE", priority: "HIGH" }).expect(201);
    const task = await request(app.getHttpServer()).post(`/api/v1/workspaces/${workspace.id}/tasks`).set(auth(session.accessToken)).send({ title: "Prepare kickoff", projectId: project.body.id, status: "TODO", priority: "HIGH" }).expect(201);
    await request(app.getHttpServer()).patch(`/api/v1/workspaces/${workspace.id}/tasks/${task.body.id as string}`).set(auth(session.accessToken)).send({ status: "IN_PROGRESS" }).expect(200);
    const activity = await request(app.getHttpServer()).get(`/api/v1/workspaces/${workspace.id}/activity?entityId=${task.body.id as string}`).set(auth(session.accessToken)).expect(200);
    expect(activity.body.some((row: { action: string }) => row.action === "task.status_changed")).toBe(true);
    expect(await prisma.outboxEvent.count({ where: { workspaceId: workspace.id } })).toBeGreaterThanOrEqual(4);
  });

  it("archives clients through the lifecycle endpoint and emits a status event", async () => {
    const session = await register(app, "archive@flowdesk.test");
    const workspace = await createWorkspace(app, session.accessToken, "Archive Workspace");
    const client = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspace.id}/clients`)
      .set(auth(session.accessToken))
      .send({ name: "Legacy client", status: "ACTIVE" })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/workspaces/${workspace.id}/clients/${client.body.id as string}`)
      .set(auth(session.accessToken))
      .expect(204);

    const archived = await prisma.client.findUniqueOrThrow({
      where: { id: client.body.id as string },
    });
    expect(archived.status).toBe("ARCHIVED");
    expect(archived.archivedAt).not.toBeNull();
    expect(
      await prisma.outboxEvent.count({
        where: {
          workspaceId: workspace.id,
          aggregateId: archived.id,
          eventType: "client.status_changed",
        },
      }),
    ).toBe(1);
  });

  it("rejects a foreign membership as task assignee", async () => {
    const a = await register(app, "a@flowdesk.test");
    const workspaceA = await createWorkspace(app, a.accessToken, "A");
    const b = await register(app, "b@flowdesk.test");
    const workspaceB = await createWorkspace(app, b.accessToken, "B");
    const foreign = await prisma.membership.findFirstOrThrow({ where: { workspaceId: workspaceB.id } });
    await request(app.getHttpServer()).post(`/api/v1/workspaces/${workspaceA.id}/tasks`).set(auth(a.accessToken)).send({ title: "Illegal assignment", assigneeId: foreign.id }).expect(422);
  });

  it("returns 404 for a known resource in another workspace", async () => {
    const a = await register(app, "tenant-a@flowdesk.test");
    const workspaceA = await createWorkspace(app, a.accessToken, "Tenant A");
    const b = await register(app, "tenant-b@flowdesk.test");
    const workspaceB = await createWorkspace(app, b.accessToken, "Tenant B");
    const foreign = await prisma.client.create({ data: { workspaceId: workspaceB.id, name: "Foreign" } });
    await request(app.getHttpServer()).get(`/api/v1/workspaces/${workspaceA.id}/clients/${foreign.id}`).set(auth(a.accessToken)).expect(404);
  });
});
