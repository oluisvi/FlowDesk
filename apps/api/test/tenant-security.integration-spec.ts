import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaService } from "../src/common/prisma.service.js";
import {
  auth,
  createWorkspace,
  register,
  resetTestDatabase,
  startTestApp,
} from "./support/test-app.js";

let app: INestApplication;
let prisma: PrismaService;

beforeAll(async () => ({ app, prisma } = await startTestApp()));
beforeEach(async () => resetTestDatabase(prisma));
afterAll(async () => app.close());

describe("tenant and role hardening", () => {
  it("blocks a viewer from operational writes while preserving reads", async () => {
    const owner = await register(app, "owner-rbac@flowdesk.test", "Owner");
    const workspace = await createWorkspace(app, owner.accessToken, "RBAC Workspace");
    const viewer = await register(app, "viewer-rbac@flowdesk.test", "Viewer");

    await prisma.membership.create({
      data: { workspaceId: workspace.id, userId: viewer.user.id, role: "VIEWER" },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspace.id}/clients`)
      .set(auth(viewer.accessToken))
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspace.id}/clients`)
      .set(auth(viewer.accessToken))
      .send({ name: "Viewer write" })
      .expect(403);
  });

  it("rejects workflow references that point to another tenant", async () => {
    const ownerA = await register(app, "workflow-owner-a@flowdesk.test");
    const workspaceA = await createWorkspace(app, ownerA.accessToken, "Workflow A");
    const ownerB = await register(app, "workflow-owner-b@flowdesk.test");
    const workspaceB = await createWorkspace(app, ownerB.accessToken, "Workflow B");
    const foreignMember = await prisma.membership.findFirstOrThrow({
      where: { workspaceId: workspaceB.id },
    });

    const response = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceA.id}/workflows/validate`)
      .set(auth(ownerA.accessToken))
      .send({
        nodes: [
          {
            id: "trigger",
            type: "trigger",
            kind: "CLIENT_CREATED",
            position: { x: 0, y: 0 },
            config: {},
          },
          {
            id: "notify",
            type: "action",
            kind: "SEND_NOTIFICATION",
            position: { x: 220, y: 0 },
            config: {
              membershipId: foreignMember.id,
              title: "Foreign",
              message: "Must never cross the tenant boundary",
            },
          },
        ],
        edges: [{ id: "e", source: "trigger", target: "notify" }],
      })
      .expect(201);

    expect(response.body).toMatchObject({ valid: false });
    expect(
      response.body.issues.some(
        (issue: { code: string }) => issue.code === "WORKFLOW_FOREIGN_REFERENCE",
      ),
    ).toBe(true);
  });

  it("rejects foreign workspace ids inside workflow conditions", async () => {
    const ownerA = await register(app, "condition-owner-a@flowdesk.test");
    const workspaceA = await createWorkspace(app, ownerA.accessToken, "Condition A");
    const ownerB = await register(app, "condition-owner-b@flowdesk.test");
    const workspaceB = await createWorkspace(app, ownerB.accessToken, "Condition B");
    const foreignProject = await prisma.project.create({
      data: { workspaceId: workspaceB.id, name: "Foreign project" },
    });

    const response = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceA.id}/workflows/validate`)
      .set(auth(ownerA.accessToken))
      .send({
        nodes: [
          {
            id: "trigger",
            type: "trigger",
            kind: "CLIENT_CREATED",
            position: { x: 0, y: 0 },
            config: {},
          },
          {
            id: "condition",
            type: "condition",
            kind: "FIELD_COMPARE",
            position: { x: 220, y: 0 },
            config: {
              field: "projectId",
              operator: "EQ",
              value: foreignProject.id,
            },
          },
          {
            id: "notify",
            type: "action",
            kind: "SEND_NOTIFICATION",
            position: { x: 440, y: 0 },
            config: { title: "Blocked", message: "Must not activate" },
          },
        ],
        edges: [
          { id: "e1", source: "trigger", target: "condition" },
          { id: "e2", source: "condition", target: "notify" },
        ],
      })
      .expect(201);

    expect(response.body).toMatchObject({ valid: false });
    expect(
      response.body.issues.some(
        (issue: { code: string; nodeId?: string }) =>
          issue.code === "WORKFLOW_FOREIGN_REFERENCE" &&
          issue.nodeId === "condition",
      ),
    ).toBe(true);
  });

  it("accepts an invitation exactly once", async () => {
    const owner = await register(app, "invite-owner@flowdesk.test", "Owner");
    const workspace = await createWorkspace(app, owner.accessToken, "Invite Workspace");
    const member = await register(app, "invite-member@flowdesk.test", "Member");

    const invitation = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspace.id}/invitations`)
      .set(auth(owner.accessToken))
      .send({ email: member.user.email, role: "MEMBER" })
      .expect(201);

    const token = invitation.body.token as string;
    await request(app.getHttpServer())
      .post("/api/v1/invitations/accept")
      .set(auth(member.accessToken))
      .send({ token })
      .expect(200);

    await request(app.getHttpServer())
      .post("/api/v1/invitations/accept")
      .set(auth(member.accessToken))
      .send({ token })
      .expect(410);
  });

  it("does not expose a notification from another user in the same workspace", async () => {
    const owner = await register(app, "notification-owner@flowdesk.test", "Owner");
    const workspace = await createWorkspace(app, owner.accessToken, "Notification Workspace");
    const member = await register(app, "notification-member@flowdesk.test", "Member");
    await prisma.membership.create({
      data: { workspaceId: workspace.id, userId: member.user.id, role: "MEMBER" },
    });
    const notification = await prisma.notification.create({
      data: {
        workspaceId: workspace.id,
        userId: owner.user.id,
        type: "security.test",
        title: "Private owner notification",
        message: "Only the owner should see this.",
      },
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/workspaces/${workspace.id}/notifications/${notification.id}/read`)
      .set(auth(member.accessToken))
      .expect(404);
  });
});
