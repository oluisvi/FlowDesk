import { createHash } from "node:crypto";
import { Injectable, UnprocessableEntityException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { WorkflowNode } from "@flowdesk/shared";
import { PrismaService } from "../common/prisma.service.js";
import { renderTemplate } from "./template.js";

export interface ActionExecutionContext {
  workspaceId: string;
  workflowId: string;
  executionId: string;
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  depth: number;
  outputs: Record<string, Record<string, unknown>>;
  previous?: Record<string, unknown>;
  causation?: Record<string, unknown>;
}

type ActionNode = Extract<WorkflowNode, { type: "action" }>;

function uuidFrom(key: string): string {
  const hash = createHash("sha256").update(key).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

@Injectable()
export class AutomationActionsService {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    node: ActionNode,
    context: ActionExecutionContext,
  ): Promise<Record<string, unknown>> {
    const key = `${context.workspaceId}:${context.executionId}:${node.id}`;
    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: { key },
    });
    if (existing) return (existing.result ?? {}) as Record<string, unknown>;

    switch (node.kind) {
      case "CREATE_PROJECT":
        return this.createProject(node, context, key);
      case "CREATE_TASK":
        return this.createTask(node, context, key);
      case "ASSIGN_MEMBER":
        return this.assignMember(node, context, key);
      case "CHANGE_STATUS":
        return this.changeStatus(node, context, key);
      case "SEND_NOTIFICATION":
        return this.sendNotification(node, context, key);
    }
  }

  private templateView(context: ActionExecutionContext) {
    return {
      event: context.payload,
      aggregateId: context.aggregateId,
      aggregateType: context.aggregateType,
      previous: context.previous ?? {},
      outputs: context.outputs,
    };
  }

  private latestOutput(
    context: ActionExecutionContext,
    key: "taskId" | "projectId",
  ): string | undefined {
    const values = Object.values(context.outputs).reverse();
    const output = values.find((item) => typeof item[key] === "string");
    return output && typeof output[key] === "string" ? output[key] : undefined;
  }

  private async assertMembership(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    membershipId: string,
  ) {
    const membership = await tx.membership.findFirst({
      where: { id: membershipId, workspaceId },
      select: { id: true, userId: true },
    });
    if (!membership) {
      throw new UnprocessableEntityException(
        "Automation member is outside this workspace",
      );
    }
    return membership;
  }

  private async assertProject(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    projectId: string,
  ) {
    const project = await tx.project.findFirst({
      where: { id: projectId, workspaceId, archivedAt: null },
      select: { id: true, clientId: true },
    });
    if (!project) {
      throw new UnprocessableEntityException(
        "Automation project is outside this workspace",
      );
    }
    return project;
  }

  private async assertClient(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    clientId: string,
  ) {
    const client = await tx.client.findFirst({
      where: { id: clientId, workspaceId, archivedAt: null },
      select: { id: true },
    });
    if (!client) {
      throw new UnprocessableEntityException(
        "Automation client is outside this workspace",
      );
    }
    return client;
  }

  private activity(
    tx: Prisma.TransactionClient,
    context: ActionExecutionContext,
    key: string,
    entityType: "CLIENT" | "PROJECT" | "TASK" | "NOTIFICATION",
    entityId: string,
    action: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    const id = uuidFrom(`${key}:activity:${action}`);
    return tx.activity.upsert({
      where: { id },
      update: {},
      create: {
        id,
        workspaceId: context.workspaceId,
        actorId: context.workflowId,
        actorType: "AUTOMATION",
        entityType,
        entityId,
        action,
        metadata,
      },
    });
  }

  private outbox(
    tx: Prisma.TransactionClient,
    context: ActionExecutionContext,
    key: string,
    suffix: string,
    eventType: string,
    aggregateType: "CLIENT" | "PROJECT" | "TASK" | "NOTIFICATION",
    aggregateId: string,
    payload: Prisma.InputJsonValue,
  ) {
    const id = uuidFrom(`${key}:event:${suffix}`);
    return tx.outboxEvent.upsert({
      where: { id },
      update: {},
      create: {
        id,
        workspaceId: context.workspaceId,
        eventType,
        aggregateType,
        aggregateId,
        payload,
        depth: context.depth + 1,
        causation: {
          workflowId: context.workflowId,
          executionId: context.executionId,
          parentEventId: context.eventId,
          workflowChain: [
            ...(Array.isArray(context.causation?.workflowChain)
              ? context.causation.workflowChain.filter(
                  (item): item is string => typeof item === "string",
                )
              : []),
            context.workflowId,
          ],
        },
      },
    });
  }

  private async persistIdempotency(
    tx: Prisma.TransactionClient,
    node: ActionNode,
    context: ActionExecutionContext,
    key: string,
    result: Record<string, unknown>,
  ) {
    await tx.idempotencyRecord.upsert({
      where: { key },
      update: {},
      create: {
        workspaceId: context.workspaceId,
        executionId: context.executionId,
        nodeId: node.id,
        key,
        result: result as Prisma.InputJsonValue,
      },
    });
  }

  private async createProject(
    node: Extract<ActionNode, { kind: "CREATE_PROJECT" }>,
    context: ActionExecutionContext,
    key: string,
  ) {
    const id = uuidFrom(`${key}:project`);
    const config = node.config;
    const eventClientId =
      context.aggregateType === "CLIENT"
        ? context.aggregateId
        : typeof context.payload.clientId === "string"
          ? context.payload.clientId
          : undefined;
    const clientId =
      config.clientId ?? (config.useEventClient ? eventClientId : undefined);
    const name = renderTemplate(config.name, this.templateView(context));

    return this.prisma.$transaction(async (tx) => {
      if (clientId) await this.assertClient(tx, context.workspaceId, clientId);
      const project = await tx.project.upsert({
        where: { id },
        update: {},
        create: {
          id,
          workspaceId: context.workspaceId,
          clientId,
          name,
          status: config.status,
          priority: config.priority,
        },
      });
      await this.activity(
        tx,
        context,
        key,
        "PROJECT",
        project.id,
        "project.created",
        { workflowId: context.workflowId, executionId: context.executionId },
      );
      await this.outbox(
        tx,
        context,
        key,
        "created",
        "project.created",
        "PROJECT",
        project.id,
        {
          id: project.id,
          name: project.name,
          clientId: project.clientId,
          status: project.status,
          priority: project.priority,
        },
      );
      const result = {
        projectId: project.id,
        clientId: project.clientId,
        name: project.name,
      };
      await this.persistIdempotency(tx, node, context, key, result);
      return result;
    });
  }

  private async createTask(
    node: Extract<ActionNode, { kind: "CREATE_TASK" }>,
    context: ActionExecutionContext,
    key: string,
  ) {
    const id = uuidFrom(`${key}:task`);
    const config = node.config;
    const projectId =
      config.projectId ??
      (config.usePreviousProject
        ? this.latestOutput(context, "projectId")
        : typeof context.payload.projectId === "string"
          ? context.payload.projectId
          : undefined);
    const title = renderTemplate(config.title, this.templateView(context));

    return this.prisma.$transaction(async (tx) => {
      if (projectId) await this.assertProject(tx, context.workspaceId, projectId);
      if (config.assigneeId) {
        await this.assertMembership(tx, context.workspaceId, config.assigneeId);
      }
      const task = await tx.task.upsert({
        where: { id },
        update: {},
        create: {
          id,
          workspaceId: context.workspaceId,
          projectId,
          assigneeId: config.assigneeId,
          title,
          status: config.status,
          priority: config.priority,
        },
      });
      await this.activity(
        tx,
        context,
        key,
        "TASK",
        task.id,
        "task.created",
        { workflowId: context.workflowId, executionId: context.executionId },
      );
      await this.outbox(
        tx,
        context,
        key,
        "created",
        "task.created",
        "TASK",
        task.id,
        {
          id: task.id,
          title: task.title,
          projectId: task.projectId,
          assigneeId: task.assigneeId,
          status: task.status,
          priority: task.priority,
        },
      );
      if (task.status === "DONE") {
        await this.outbox(
          tx,
          context,
          key,
          "completed",
          "task.completed",
          "TASK",
          task.id,
          {
            id: task.id,
            projectId: task.projectId,
            assigneeId: task.assigneeId,
            status: task.status,
            priority: task.priority,
          },
        );
      }
      const result = {
        taskId: task.id,
        projectId: task.projectId,
        assigneeId: task.assigneeId,
        title: task.title,
      };
      await this.persistIdempotency(tx, node, context, key, result);
      return result;
    });
  }

  private async assignMember(
    node: Extract<ActionNode, { kind: "ASSIGN_MEMBER" }>,
    context: ActionExecutionContext,
    key: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const membership = await this.assertMembership(
        tx,
        context.workspaceId,
        node.config.membershipId,
      );
      const previousTask = this.latestOutput(context, "taskId");
      const previousProject = this.latestOutput(context, "projectId");
      const eventTask =
        context.aggregateType === "TASK"
          ? context.aggregateId
          : typeof context.payload.taskId === "string"
            ? context.payload.taskId
            : undefined;
      const eventProject =
        context.aggregateType === "PROJECT"
          ? context.aggregateId
          : typeof context.payload.projectId === "string"
            ? context.payload.projectId
            : undefined;

      if (node.config.target === "previousTask" || node.config.target === "eventTask") {
        const taskId = node.config.target === "previousTask" ? previousTask : eventTask;
        if (!taskId) {
          throw new UnprocessableEntityException(
            "Assign Member could not resolve a task target",
          );
        }
        const updated = await tx.task.updateMany({
          where: { id: taskId, workspaceId: context.workspaceId, archivedAt: null },
          data: { assigneeId: membership.id },
        });
        if (!updated.count) {
          throw new UnprocessableEntityException(
            "Automation task is outside this workspace",
          );
        }
        await this.activity(
          tx,
          context,
          key,
          "TASK",
          taskId,
          "task.assignee_changed",
          { membershipId: membership.id },
        );
        const result = { taskId, membershipId: membership.id };
        await this.persistIdempotency(tx, node, context, key, result);
        return result;
      }

      const projectId =
        node.config.projectId ??
        (node.config.target === "previousProject" ? previousProject : eventProject);
      if (!projectId) {
        throw new UnprocessableEntityException(
          "Assign Member could not resolve a project target",
        );
      }
      await this.assertProject(tx, context.workspaceId, projectId);
      await tx.projectMember.upsert({
        where: {
          projectId_membershipId: {
            projectId,
            membershipId: membership.id,
          },
        },
        update: {},
        create: {
          workspaceId: context.workspaceId,
          projectId,
          membershipId: membership.id,
        },
      });
      await this.activity(
        tx,
        context,
        key,
        "PROJECT",
        projectId,
        "project.member_assigned",
        { membershipId: membership.id },
      );
      const result = { projectId, membershipId: membership.id };
      await this.persistIdempotency(tx, node, context, key, result);
      return result;
    });
  }

  private resolveEventTarget(
    context: ActionExecutionContext,
    target: "task" | "project" | "client",
  ): string | undefined {
    const aggregate = target.toUpperCase();
    if (context.aggregateType === aggregate) return context.aggregateId;
    const key = `${target}Id`;
    const payloadId = context.payload[key];
    if (typeof payloadId === "string") return payloadId;
    return target === "task"
      ? this.latestOutput(context, "taskId")
      : target === "project"
        ? this.latestOutput(context, "projectId")
        : undefined;
  }

  private async changeStatus(
    node: Extract<ActionNode, { kind: "CHANGE_STATUS" }>,
    context: ActionExecutionContext,
    key: string,
  ) {
    const { target, status } = node.config;
    const entityId = this.resolveEventTarget(context, target);
    if (!entityId) {
      throw new UnprocessableEntityException(
        `Change Status could not resolve a ${target} target`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let eventType: string;
      let aggregateType: "CLIENT" | "PROJECT" | "TASK";
      let payload: Prisma.InputJsonValue;

      if (target === "task") {
        const previous = await tx.task.findFirst({
          where: { id: entityId, workspaceId: context.workspaceId, archivedAt: null },
        });
        if (!previous) {
          throw new UnprocessableEntityException(
            "Automation task is outside this workspace",
          );
        }
        if (previous.status === status) {
          const result = { entityId, target, status, changed: false };
          await this.persistIdempotency(tx, node, context, key, result);
          return result;
        }
        const task = await tx.task.update({
          where: { id: entityId },
          data: { status },
        });
        eventType = "task.status_changed";
        aggregateType = "TASK";
        payload = {
          id: task.id,
          status: task.status,
          previousStatus: previous.status,
          projectId: task.projectId,
          assigneeId: task.assigneeId,
          priority: task.priority,
        };
        if (task.status === "DONE" && previous.status !== "DONE") {
          await this.outbox(
            tx,
            context,
            key,
            "completed",
            "task.completed",
            "TASK",
            task.id,
            payload,
          );
        }
      } else if (target === "project") {
        const previous = await tx.project.findFirst({
          where: { id: entityId, workspaceId: context.workspaceId, archivedAt: null },
        });
        if (!previous) {
          throw new UnprocessableEntityException(
            "Automation project is outside this workspace",
          );
        }
        if (previous.status === status) {
          const result = { entityId, target, status, changed: false };
          await this.persistIdempotency(tx, node, context, key, result);
          return result;
        }
        const project = await tx.project.update({
          where: { id: entityId },
          data: { status },
        });
        eventType = "project.status_changed";
        aggregateType = "PROJECT";
        payload = {
          id: project.id,
          status: project.status,
          previousStatus: previous.status,
          clientId: project.clientId,
        };
      } else {
        const previous = await tx.client.findFirst({
          where: { id: entityId, workspaceId: context.workspaceId, archivedAt: null },
        });
        if (!previous) {
          throw new UnprocessableEntityException(
            "Automation client is outside this workspace",
          );
        }
        if (previous.status === status) {
          const result = { entityId, target, status, changed: false };
          await this.persistIdempotency(tx, node, context, key, result);
          return result;
        }
        const client = await tx.client.update({
          where: { id: entityId },
          data: { status },
        });
        eventType = "client.status_changed";
        aggregateType = "CLIENT";
        payload = {
          id: client.id,
          status: client.status,
          previousStatus: previous.status,
        };
      }

      await this.activity(
        tx,
        context,
        key,
        aggregateType,
        entityId,
        eventType,
        { status },
      );
      await this.outbox(
        tx,
        context,
        key,
        "status",
        eventType,
        aggregateType,
        entityId,
        payload,
      );
      const result = { entityId, target, status, changed: true };
      await this.persistIdempotency(tx, node, context, key, result);
      return result;
    });
  }

  private async sendNotification(
    node: Extract<ActionNode, { kind: "SEND_NOTIFICATION" }>,
    context: ActionExecutionContext,
    key: string,
  ) {
    const view = this.templateView(context);
    const title = renderTemplate(node.config.title, view);
    const message = renderTemplate(node.config.message, view);
    const targetPath = node.config.targetPath
      ? renderTemplate(node.config.targetPath, view)
      : undefined;
    if (targetPath && (!targetPath.startsWith("/app") || targetPath.startsWith("//"))) {
      throw new UnprocessableEntityException(
        "Notification target must be an internal FlowDesk path",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const membership = node.config.membershipId
        ? await this.assertMembership(
            tx,
            context.workspaceId,
            node.config.membershipId,
          )
        : await tx.membership.findFirst({
            where: {
              workspaceId: context.workspaceId,
              role: { in: ["OWNER", "ADMIN"] },
            },
            orderBy: { createdAt: "asc" },
            select: { id: true, userId: true },
          });
      if (!membership) {
        throw new UnprocessableEntityException(
          "No notification recipient exists in this workspace",
        );
      }

      const id = uuidFrom(`${key}:notification`);
      const notification = await tx.notification.upsert({
        where: { id },
        update: {},
        create: {
          id,
          workspaceId: context.workspaceId,
          userId: membership.userId,
          type: "workflow.action",
          title,
          message,
          targetPath,
          metadata: {
            workflowId: context.workflowId,
            executionId: context.executionId,
          },
        },
      });
      await this.activity(
        tx,
        context,
        key,
        "NOTIFICATION",
        notification.id,
        "notification.created",
        { workflowId: context.workflowId },
      );
      const result = {
        notificationId: notification.id,
        membershipId: membership.id,
        userId: membership.userId,
      };
      await this.persistIdempotency(tx, node, context, key, result);
      return result;
    });
  }
}
