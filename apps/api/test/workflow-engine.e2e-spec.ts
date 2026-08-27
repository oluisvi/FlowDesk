import type { INestApplication } from "@nestjs/common";
import { createHash } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaService } from "../src/common/prisma.service.js";
import { WorkflowEngineService } from "../src/workflows/workflow-engine.service.js";
import { createWorkspace, register, resetTestDatabase, startTestApp } from "./support/test-app.js";

let app: INestApplication;
let prisma: PrismaService;
let engine: WorkflowEngineService;
beforeAll(async () => {
  ({ app, prisma } = await startTestApp());
  engine = app.get(WorkflowEngineService);
});
beforeEach(async () => resetTestDatabase(prisma));
afterAll(async () => app.close());

describe("workflow engine", () => {
  it("executes Client Created → Create Project → Create Task → Assign Member → Notify exactly once", async () => {
    const session = await register(app, "automation@flowdesk.test", "Automation Owner");
    const workspace = await createWorkspace(app, session.accessToken, "ServAgency");
    const ownerMembership = await prisma.membership.findFirstOrThrow({ where: { workspaceId: workspace.id, userId: session.user.id } });
    const definition = {
      nodes: [
        { id: "trigger", type: "trigger", kind: "CLIENT_CREATED", position: { x: 0, y: 0 }, config: {} },
        { id: "project", type: "action", kind: "CREATE_PROJECT", position: { x: 240, y: 0 }, config: { name: "Client Onboarding", status: "ACTIVE", priority: "HIGH" } },
        { id: "task", type: "action", kind: "CREATE_TASK", position: { x: 480, y: 0 }, config: { title: "Schedule kickoff", status: "TODO", priority: "HIGH", usePreviousProject: true } },
        { id: "assign", type: "action", kind: "ASSIGN_MEMBER", position: { x: 720, y: 0 }, config: { membershipId: ownerMembership.id, target: "previousTask" } },
        { id: "notification", type: "action", kind: "SEND_NOTIFICATION", position: { x: 960, y: 0 }, config: { membershipId: ownerMembership.id, title: "Onboarding ready", message: "Studio Nova entrou no fluxo." } },
      ],
      edges: [
        { id: "a", source: "trigger", target: "project" },
        { id: "b", source: "project", target: "task" },
        { id: "c", source: "task", target: "assign" },
        { id: "d", source: "assign", target: "notification" },
      ],
    };
    const workflow = await prisma.workflow.create({ data: { workspaceId: workspace.id, name: "Client onboarding", status: "ACTIVE", activeVersion: 1, draftDefinition: definition, createdById: session.user.id } });
    const version = await prisma.workflowVersion.create({ data: { workflowId: workflow.id, version: 1, definition, checksum: createHash("sha256").update(JSON.stringify(definition)).digest("hex") } });
    expect(version.version).toBe(1);
    const client = await prisma.client.create({ data: { workspaceId: workspace.id, name: "Studio Nova" } });
    const event = await prisma.outboxEvent.create({ data: { workspaceId: workspace.id, eventType: "client.created", aggregateType: "CLIENT", aggregateId: client.id, payload: { id: client.id, name: client.name, status: client.status } } });

    await engine.processEvent(event.id);
    await engine.processEvent(event.id);

    expect(await prisma.project.count({ where: { workspaceId: workspace.id, name: "Client Onboarding" } })).toBe(1);
    expect(await prisma.task.count({ where: { workspaceId: workspace.id, title: "Schedule kickoff", assigneeId: ownerMembership.id } })).toBe(1);
    expect(await prisma.notification.count({ where: { workspaceId: workspace.id, userId: session.user.id, type: "workflow.action" } })).toBe(1);
    const execution = await prisma.workflowExecution.findUniqueOrThrow({ where: { workflowId_triggerEventId: { workflowId: workflow.id, triggerEventId: event.id } }, include: { steps: true } });
    expect(execution.status).toBe("SUCCEEDED");
    expect(execution.steps).toHaveLength(5);
    expect(await prisma.idempotencyRecord.count({ where: { executionId: execution.id } })).toBe(4);
  });

  it("treats same-status automation as an idempotent no-op without emitting another event", async () => {
    const owner = await register(app, "same-status@flowdesk.test", "Status Owner");
    const workspace = await createWorkspace(app, owner.accessToken, "Status Lab");
    const definition = {
      nodes: [
        { id: "trigger", type: "trigger", kind: "CLIENT_CREATED", position: { x: 0, y: 0 }, config: {} },
        { id: "status", type: "action", kind: "CHANGE_STATUS", position: { x: 240, y: 0 }, config: { target: "client", status: "ACTIVE" } },
      ],
      edges: [{ id: "e", source: "trigger", target: "status" }],
    };
    const workflow = await prisma.workflow.create({
      data: {
        workspaceId: workspace.id,
        name: "Keep client active",
        status: "ACTIVE",
        activeVersion: 1,
        draftDefinition: definition,
        createdById: owner.user.id,
      },
    });
    await prisma.workflowVersion.create({
      data: {
        workflowId: workflow.id,
        version: 1,
        definition,
        checksum: createHash("sha256").update(JSON.stringify(definition)).digest("hex"),
      },
    });
    const client = await prisma.client.create({
      data: { workspaceId: workspace.id, name: "Already active", status: "ACTIVE" },
    });
    const event = await prisma.outboxEvent.create({
      data: {
        workspaceId: workspace.id,
        eventType: "client.created",
        aggregateType: "CLIENT",
        aggregateId: client.id,
        payload: { id: client.id, status: client.status },
      },
    });

    await engine.processEvent(event.id);

    const execution = await prisma.workflowExecution.findUniqueOrThrow({
      where: {
        workflowId_triggerEventId: {
          workflowId: workflow.id,
          triggerEventId: event.id,
        },
      },
    });
    expect(execution.status).toBe("SUCCEEDED");
    expect(
      await prisma.outboxEvent.count({
        where: { workspaceId: workspace.id, eventType: "client.status_changed" },
      }),
    ).toBe(0);
    expect(await prisma.idempotencyRecord.count({ where: { executionId: execution.id } })).toBe(1);
  });

  it("does not execute a workflow from another workspace", async () => {
    const ownerA = await register(app, "workflow-a@flowdesk.test");
    const a = await createWorkspace(app, ownerA.accessToken, "A");
    const ownerB = await register(app, "workflow-b@flowdesk.test");
    const b = await createWorkspace(app, ownerB.accessToken, "B");
    const definition = { nodes: [{ id: "t", type: "trigger", kind: "CLIENT_CREATED", position: { x: 0, y: 0 }, config: {} }, { id: "n", type: "action", kind: "SEND_NOTIFICATION", position: { x: 200, y: 0 }, config: { title: "Foreign", message: "Never" } }], edges: [{ id: "e", source: "t", target: "n" }] };
    const workflow = await prisma.workflow.create({ data: { workspaceId: b.id, name: "B only", status: "ACTIVE", activeVersion: 1, draftDefinition: definition, createdById: ownerB.user.id } });
    await prisma.workflowVersion.create({ data: { workflowId: workflow.id, version: 1, definition, checksum: createHash("sha256").update(JSON.stringify(definition)).digest("hex") } });
    const client = await prisma.client.create({ data: { workspaceId: a.id, name: "A client" } });
    const event = await prisma.outboxEvent.create({ data: { workspaceId: a.id, eventType: "client.created", aggregateType: "CLIENT", aggregateId: client.id, payload: { id: client.id } } });
    await engine.processEvent(event.id);
    expect(await prisma.workflowExecution.count()).toBe(0);
  });
});
