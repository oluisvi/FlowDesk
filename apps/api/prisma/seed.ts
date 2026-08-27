import { createHash } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { argon2id, hash } from "argon2";

const prisma = new PrismaClient();

const ids = {
  client: "10000000-0000-4000-8000-000000000001",
  project: "20000000-0000-4000-8000-000000000001",
  taskBriefing: "30000000-0000-4000-8000-000000000001",
  taskWireframe: "30000000-0000-4000-8000-000000000002",
  taskIntegration: "30000000-0000-4000-8000-000000000003",
  taskQa: "30000000-0000-4000-8000-000000000004",
  taskReview: "30000000-0000-4000-8000-000000000005",
  workflow: "40000000-0000-4000-8000-000000000001",
  notification: "50000000-0000-4000-8000-000000000001",
  comment: "60000000-0000-4000-8000-000000000001",
  activityClient: "70000000-0000-4000-8000-000000000001",
  activityProject: "70000000-0000-4000-8000-000000000002",
  activityTask: "70000000-0000-4000-8000-000000000003",
  activityWorkflow: "70000000-0000-4000-8000-000000000004",
  onboardingEvent: "80000000-0000-4000-8000-000000000001",
} as const;

async function main(): Promise<void> {
  const email = (process.env.SEED_OWNER_EMAIL ?? "owner@flowdesk.local")
    .trim()
    .toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD ?? "ChangeMeNow123!";
  const ownerName = process.env.SEED_OWNER_NAME ?? "FlowDesk Owner";
  const passwordHash = await hash(password, {
    type: argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  const owner = await prisma.user.upsert({
    where: { email },
    update: { name: ownerName, passwordHash },
    create: { email, name: ownerName, passwordHash },
  });
  const designer = await prisma.user.upsert({
    where: { email: "designer@flowdesk.local" },
    update: { name: "Marina Costa", passwordHash },
    create: {
      email: "designer@flowdesk.local",
      name: "Marina Costa",
      passwordHash,
    },
  });
  const developer = await prisma.user.upsert({
    where: { email: "developer@flowdesk.local" },
    update: { name: "Rafael Lima", passwordHash },
    create: {
      email: "developer@flowdesk.local",
      name: "Rafael Lima",
      passwordHash,
    },
  });

  let workspace = await prisma.workspace.findFirst({
    where: { memberships: { some: { userId: owner.id, role: "OWNER" } } },
  });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: "ServAgency",
        slug: "servagency-demo",
        memberships: { create: { userId: owner.id, role: "OWNER" } },
      },
    });
  } else {
    workspace = await prisma.workspace.update({
      where: { id: workspace.id },
      data: { name: "ServAgency" },
    });
  }

  const ownerMembership = await prisma.membership.upsert({
    where: {
      workspaceId_userId: { workspaceId: workspace.id, userId: owner.id },
    },
    update: { role: "OWNER" },
    create: { workspaceId: workspace.id, userId: owner.id, role: "OWNER" },
  });
  const designerMembership = await prisma.membership.upsert({
    where: {
      workspaceId_userId: { workspaceId: workspace.id, userId: designer.id },
    },
    update: { role: "MEMBER" },
    create: { workspaceId: workspace.id, userId: designer.id, role: "MEMBER" },
  });
  const developerMembership = await prisma.membership.upsert({
    where: {
      workspaceId_userId: { workspaceId: workspace.id, userId: developer.id },
    },
    update: { role: "MEMBER" },
    create: { workspaceId: workspace.id, userId: developer.id, role: "MEMBER" },
  });

  const client = await prisma.client.upsert({
    where: { id: ids.client },
    update: {
      workspaceId: workspace.id,
      assignedMemberId: designerMembership.id,
      archivedAt: null,
    },
    create: {
      id: ids.client,
      workspaceId: workspace.id,
      name: "Studio Nova",
      company: "Studio Nova",
      email: "hello@studionova.test",
      status: "ACTIVE",
      tags: ["design", "retainer"],
      notes: "Conta de demonstração usada no fluxo de onboarding.",
      assignedMemberId: designerMembership.id,
    },
  });

  const project = await prisma.project.upsert({
    where: { id: ids.project },
    update: {
      workspaceId: workspace.id,
      clientId: client.id,
      archivedAt: null,
    },
    create: {
      id: ids.project,
      workspaceId: workspace.id,
      clientId: client.id,
      name: "Brand launch",
      description: "Landing, captação e QA do lançamento do Studio Nova.",
      status: "ACTIVE",
      priority: "HIGH",
      deadline: new Date(Date.now() + 14 * 86_400_000),
    },
  });

  for (const membershipId of [designerMembership.id, developerMembership.id]) {
    await prisma.projectMember.upsert({
      where: { projectId_membershipId: { projectId: project.id, membershipId } },
      update: { workspaceId: workspace.id },
      create: { workspaceId: workspace.id, projectId: project.id, membershipId },
    });
  }

  const tasks = [
    [ids.taskBriefing, "Briefing e objetivos", "DONE", "HIGH", designerMembership.id],
    [ids.taskWireframe, "Wireframe da landing", "IN_PROGRESS", "HIGH", designerMembership.id],
    [ids.taskIntegration, "Integração do formulário", "TODO", "MEDIUM", developerMembership.id],
    [ids.taskQa, "QA responsivo", "BACKLOG", "MEDIUM", developerMembership.id],
    [ids.taskReview, "Revisão final com cliente", "REVIEW", "URGENT", designerMembership.id],
  ] as const;

  for (const [id, title, status, priority, assigneeId] of tasks) {
    await prisma.task.upsert({
      where: { id },
      update: {
        workspaceId: workspace.id,
        projectId: project.id,
        assigneeId,
        status,
        priority,
        archivedAt: null,
      },
      create: {
        id,
        workspaceId: workspace.id,
        projectId: project.id,
        title,
        status,
        priority,
        assigneeId,
        tags: ["launch"],
        dueDate:
          status === "REVIEW" ? new Date(Date.now() + 2 * 86_400_000) : null,
      },
    });
  }

  await prisma.taskComment.upsert({
    where: { id: ids.comment },
    update: { content: "Wireframe aprovado. Seguir para o refinamento responsivo." },
    create: {
      id: ids.comment,
      workspaceId: workspace.id,
      taskId: ids.taskWireframe,
      authorId: designer.id,
      content: "Wireframe aprovado. Seguir para o refinamento responsivo.",
    },
  });

  const definition = {
    nodes: [
      {
        id: "trigger-client",
        type: "trigger",
        kind: "CLIENT_CREATED",
        position: { x: 80, y: 160 },
        config: {},
      },
      {
        id: "action-project",
        type: "action",
        kind: "CREATE_PROJECT",
        position: { x: 390, y: 120 },
        config: {
          name: "Client Onboarding",
          useEventClient: true,
          status: "ACTIVE",
          priority: "HIGH",
        },
      },
      {
        id: "action-task",
        type: "action",
        kind: "CREATE_TASK",
        position: { x: 700, y: 120 },
        config: {
          title: "Schedule kickoff",
          status: "TODO",
          priority: "HIGH",
          usePreviousProject: true,
        },
      },
      {
        id: "action-assign",
        type: "action",
        kind: "ASSIGN_MEMBER",
        position: { x: 1_010, y: 120 },
        config: {
          membershipId: designerMembership.id,
          target: "previousTask",
        },
      },
      {
        id: "action-notify",
        type: "action",
        kind: "SEND_NOTIFICATION",
        position: { x: 1_320, y: 120 },
        config: {
          membershipId: designerMembership.id,
          title: "Novo onboarding",
          message: "Um novo cliente entrou no fluxo de onboarding.",
          targetPath: "/app/projects",
        },
      },
    ],
    edges: [
      { id: "e1", source: "trigger-client", target: "action-project" },
      { id: "e2", source: "action-project", target: "action-task" },
      { id: "e3", source: "action-task", target: "action-assign" },
      { id: "e4", source: "action-assign", target: "action-notify" },
    ],
  } satisfies Prisma.InputJsonObject;

  const checksum = createHash("sha256")
    .update(JSON.stringify(definition))
    .digest("hex");
  const workflow = await prisma.workflow.upsert({
    where: { id: ids.workflow },
    update: {
      workspaceId: workspace.id,
      name: "Client onboarding",
      description: "Transforma um novo cliente em um onboarding acionável.",
      status: "ACTIVE",
      activeVersion: 1,
      draftDefinition: definition,
      createdById: owner.id,
    },
    create: {
      id: ids.workflow,
      workspaceId: workspace.id,
      name: "Client onboarding",
      description: "Transforma um novo cliente em um onboarding acionável.",
      status: "ACTIVE",
      activeVersion: 1,
      draftDefinition: definition,
      createdById: owner.id,
    },
  });
  await prisma.workflowVersion.upsert({
    where: { workflowId_version: { workflowId: workflow.id, version: 1 } },
    update: { definition, checksum },
    create: {
      workflowId: workflow.id,
      version: 1,
      definition,
      checksum,
    },
  });

  // Seed one durable domain event after the workflow exists. Once the API and
  // worker are started, the regular outbox -> BullMQ -> engine path processes
  // this event exactly as a user-created client event. Re-running the seed does
  // not reset processedAt, so a completed demonstration is never replayed.
  await prisma.outboxEvent.upsert({
    where: { id: ids.onboardingEvent },
    update: {},
    create: {
      id: ids.onboardingEvent,
      workspaceId: workspace.id,
      eventType: "client.created",
      aggregateType: "CLIENT",
      aggregateId: client.id,
      payload: {
        id: client.id,
        name: client.name,
        status: client.status,
        assignedMemberId: client.assignedMemberId,
        tags: client.tags,
      },
      causation: { source: "seed-demo" },
      depth: 0,
    },
  });

  await prisma.notification.upsert({
    where: { id: ids.notification },
    update: { readAt: null },
    create: {
      id: ids.notification,
      workspaceId: workspace.id,
      userId: owner.id,
      type: "seed.ready",
      title: "Workspace de demonstração pronto",
      message: "Explore projetos, board e workflows do FlowDesk.",
      targetPath: "/app",
    },
  });

  const activityRows = [
    [ids.activityClient, "CLIENT", client.id, "client.created", { name: client.name }],
    [ids.activityProject, "PROJECT", project.id, "project.created", { name: project.name }],
    [ids.activityTask, "TASK", ids.taskWireframe, "task.status_changed", { from: "TODO", to: "IN_PROGRESS" }],
    [ids.activityWorkflow, "WORKFLOW", workflow.id, "workflow.activated", { version: 1, checksum }],
  ] as const;
  for (const [id, entityType, entityId, action, metadata] of activityRows) {
    await prisma.activity.upsert({
      where: { id },
      update: { metadata },
      create: {
        id,
        workspaceId: workspace.id,
        actorId: owner.id,
        actorType: "USER",
        entityType,
        entityId,
        action,
        metadata,
      },
    });
  }

  console.log(
    `Seed ready: ${email} / ${password} / workspace ${workspace.name} (${ownerMembership.role})`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
