import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type {
  ActivityActorType,
  ActivityEntityType,
  Prisma,
} from "@prisma/client";
import type {
  ClientStatus,
  CreateClientInput,
  CreateProjectInput,
  CreateTaskInput,
  ProjectStatus,
  TaskStatus,
  UpdateClientInput,
  UpdateProjectInput,
  UpdateTaskInput,
} from "@flowdesk/shared";
import type { RequestIdentity } from "../authorization/request-identity.js";
import { PolicyService } from "../authorization/policy.service.js";
import { WorkspaceAccessService } from "../authorization/workspace-access.service.js";
import { PrismaService } from "../common/prisma.service.js";

export interface ActorContext {
  actorType: ActivityActorType;
  actorId: string | null;
  depth?: number;
  causation?: Record<string, unknown>;
}

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    private readonly policy: PolicyService,
  ) {}

  private user(identity: RequestIdentity): ActorContext {
    return { actorType: "USER", actorId: identity.userId };
  }

  private async canWrite(identity: RequestIdentity, workspaceId: string) {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "operations:write");
    return access;
  }

  private canRead(identity: RequestIdentity, workspaceId: string) {
    return this.access.resolve(identity, workspaceId);
  }

  private async assertMembership(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    id?: string | null,
  ) {
    if (!id) return null;
    const membership = await tx.membership.findFirst({
      where: { id, workspaceId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!membership) {
      throw new UnprocessableEntityException(
        "Member does not belong to this workspace",
      );
    }
    return membership;
  }

  private async assertClient(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    id?: string | null,
  ) {
    if (!id) return null;
    const client = await tx.client.findFirst({
      where: { id, workspaceId, archivedAt: null },
    });
    if (!client) {
      throw new UnprocessableEntityException(
        "Client does not belong to this workspace",
      );
    }
    return client;
  }

  private async assertProject(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    id?: string | null,
  ) {
    if (!id) return null;
    const project = await tx.project.findFirst({
      where: { id, workspaceId, archivedAt: null },
    });
    if (!project) {
      throw new UnprocessableEntityException(
        "Project does not belong to this workspace",
      );
    }
    return project;
  }

  private activity(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    actor: ActorContext,
    entityType: ActivityEntityType,
    entityId: string,
    action: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return tx.activity.create({
      data: {
        workspaceId,
        actorId: actor.actorId,
        actorType: actor.actorType,
        entityType,
        entityId,
        action,
        metadata,
      },
    });
  }

  private outbox(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    eventType: string,
    aggregateType: string,
    aggregateId: string,
    payload: Prisma.InputJsonValue,
    actor: ActorContext,
  ) {
    return tx.outboxEvent.create({
      data: {
        workspaceId,
        eventType,
        aggregateType,
        aggregateId,
        payload,
        causation: actor.causation as Prisma.InputJsonValue | undefined,
        depth: actor.depth ?? 0,
      },
    });
  }

  private async notifyAssignee(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    actorId: string | null,
    membershipId: string | null | undefined,
    input: { type: string; title: string; message: string; targetPath: string },
  ) {
    if (!membershipId) return;
    const member = await this.assertMembership(tx, workspaceId, membershipId);
    if (!member || member.userId === actorId) return;
    await tx.notification.create({
      data: {
        workspaceId,
        userId: member.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        targetPath: input.targetPath,
      },
    });
  }

  async createClient(
    identity: RequestIdentity,
    workspaceId: string,
    input: CreateClientInput,
  ) {
    await this.canWrite(identity, workspaceId);
    return this.createClientInternal(workspaceId, input, this.user(identity));
  }

  createClientInternal(
    workspaceId: string,
    input: CreateClientInput,
    actor: ActorContext,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertMembership(tx, workspaceId, input.assignedMemberId);
      const client = await tx.client.create({ data: { workspaceId, ...input } });
      await this.activity(tx, workspaceId, actor, "CLIENT", client.id, "client.created", {
        name: client.name,
      });
      await this.outbox(
        tx,
        workspaceId,
        "client.created",
        "CLIENT",
        client.id,
        {
          id: client.id,
          name: client.name,
          status: client.status,
          assignedMemberId: client.assignedMemberId,
          tags: client.tags,
        },
        actor,
      );
      return client;
    });
  }

  async listClients(
    identity: RequestIdentity,
    workspaceId: string,
    filters: {
      search?: string;
      status?: ClientStatus;
      limit?: number;
      offset?: number;
    },
  ) {
    await this.canRead(identity, workspaceId);
    return this.prisma.client.findMany({
      where: {
        workspaceId,
        archivedAt: null,
        status: filters.status,
        OR: filters.search
          ? [
              { name: { contains: filters.search, mode: "insensitive" } },
              { company: { contains: filters.search, mode: "insensitive" } },
              { email: { contains: filters.search, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: {
        assignedMember: {
          include: { user: { select: { name: true, email: true } } },
        },
        _count: { select: { projects: { where: { archivedAt: null } } } },
      },
      take: filters.limit ?? 100,
      skip: filters.offset ?? 0,
      orderBy: { updatedAt: "desc" },
    });
  }

  async getClient(identity: RequestIdentity, workspaceId: string, id: string) {
    await this.canRead(identity, workspaceId);
    const client = await this.prisma.client.findFirst({
      where: { id, workspaceId, archivedAt: null },
      include: {
        assignedMember: {
          include: { user: { select: { name: true, email: true } } },
        },
        projects: {
          where: { archivedAt: null },
          orderBy: { updatedAt: "desc" },
          take: 20,
        },
        _count: { select: { projects: { where: { archivedAt: null } } } },
      },
    });
    if (!client) throw new NotFoundException("Client not found");
    return client;
  }

  async updateClient(
    identity: RequestIdentity,
    workspaceId: string,
    id: string,
    input: UpdateClientInput,
  ) {
    await this.canWrite(identity, workspaceId);
    const actor = this.user(identity);
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.client.findFirst({
        where: { id, workspaceId, archivedAt: null },
      });
      if (!previous) throw new NotFoundException("Client not found");
      await this.assertMembership(tx, workspaceId, input.assignedMemberId);
      const client = await tx.client.update({ where: { id }, data: input });
      await this.activity(tx, workspaceId, actor, "CLIENT", id, "client.updated");
      if (input.status && input.status !== previous.status) {
        await this.outbox(
          tx,
          workspaceId,
          "client.status_changed",
          "CLIENT",
          id,
          {
            id,
            status: client.status,
            previousStatus: previous.status,
            assignedMemberId: client.assignedMemberId,
          },
          actor,
        );
      }
      return client;
    });
  }

  async archiveClient(identity: RequestIdentity, workspaceId: string, id: string) {
    await this.canWrite(identity, workspaceId);
    const actor = this.user(identity);
    await this.prisma.$transaction(async (tx) => {
      const client = await tx.client.findFirst({
        where: { id, workspaceId, archivedAt: null },
      });
      if (!client) throw new NotFoundException("Client not found");
      const archivedAt = new Date();
      await tx.client.update({
        where: { id },
        data: { archivedAt, status: "ARCHIVED" },
      });
      await this.activity(tx, workspaceId, actor, "CLIENT", id, "client.archived");
      await this.outbox(
        tx,
        workspaceId,
        "client.status_changed",
        "CLIENT",
        id,
        { id, status: "ARCHIVED", previousStatus: client.status },
        actor,
      );
    });
  }

  async createProject(
    identity: RequestIdentity,
    workspaceId: string,
    input: CreateProjectInput,
  ) {
    await this.canWrite(identity, workspaceId);
    return this.createProjectInternal(workspaceId, input, this.user(identity));
  }

  createProjectInternal(
    workspaceId: string,
    input: CreateProjectInput,
    actor: ActorContext,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertClient(tx, workspaceId, input.clientId);
      const project = await tx.project.create({
        data: {
          workspaceId,
          ...input,
          deadline:
            input.deadline === null
              ? null
              : input.deadline
                ? new Date(input.deadline)
                : undefined,
        },
      });
      await this.activity(
        tx,
        workspaceId,
        actor,
        "PROJECT",
        project.id,
        "project.created",
        { name: project.name },
      );
      await this.outbox(
        tx,
        workspaceId,
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
        actor,
      );
      return project;
    });
  }

  async listProjects(
    identity: RequestIdentity,
    workspaceId: string,
    filters: {
      status?: ProjectStatus;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    await this.canRead(identity, workspaceId);
    return this.prisma.project.findMany({
      where: {
        workspaceId,
        archivedAt: null,
        status: filters.status,
        OR: filters.search
          ? [
              { name: { contains: filters.search, mode: "insensitive" } },
              { client: { name: { contains: filters.search, mode: "insensitive" } } },
              { client: { company: { contains: filters.search, mode: "insensitive" } } },
            ]
          : undefined,
      },
      include: {
        client: { select: { id: true, name: true, company: true } },
        members: {
          include: {
            membership: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
        _count: { select: { tasks: { where: { archivedAt: null } } } },
      },
      take: filters.limit ?? 100,
      skip: filters.offset ?? 0,
      orderBy: { updatedAt: "desc" },
    });
  }

  async getProject(identity: RequestIdentity, workspaceId: string, id: string) {
    await this.canRead(identity, workspaceId);
    const project = await this.prisma.project.findFirst({
      where: { id, workspaceId, archivedAt: null },
      include: {
        client: true,
        members: {
          include: {
            membership: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
        tasks: { where: { archivedAt: null }, orderBy: { updatedAt: "desc" } },
      },
    });
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  async updateProject(
    identity: RequestIdentity,
    workspaceId: string,
    id: string,
    input: UpdateProjectInput,
  ) {
    await this.canWrite(identity, workspaceId);
    const actor = this.user(identity);
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.project.findFirst({
        where: { id, workspaceId, archivedAt: null },
      });
      if (!previous) throw new NotFoundException("Project not found");
      await this.assertClient(tx, workspaceId, input.clientId);
      const project = await tx.project.update({
        where: { id },
        data: {
          ...input,
          deadline:
            input.deadline === null
              ? null
              : input.deadline
                ? new Date(input.deadline)
                : undefined,
        },
      });
      await this.activity(tx, workspaceId, actor, "PROJECT", id, "project.updated");
      if (input.status && input.status !== previous.status) {
        await this.outbox(
          tx,
          workspaceId,
          "project.status_changed",
          "PROJECT",
          id,
          {
            id,
            status: project.status,
            previousStatus: previous.status,
            clientId: project.clientId,
          },
          actor,
        );
      }
      return project;
    });
  }

  async archiveProject(identity: RequestIdentity, workspaceId: string, id: string) {
    await this.canWrite(identity, workspaceId);
    const actor = this.user(identity);
    await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.findFirst({
        where: { id, workspaceId, archivedAt: null },
      });
      if (!project) throw new NotFoundException("Project not found");
      const archivedAt = new Date();
      await tx.project.update({
        where: { id },
        data: { archivedAt, status: "ARCHIVED" },
      });
      await this.activity(tx, workspaceId, actor, "PROJECT", id, "project.archived");
      await this.outbox(
        tx,
        workspaceId,
        "project.status_changed",
        "PROJECT",
        id,
        {
          id,
          status: "ARCHIVED",
          previousStatus: project.status,
          clientId: project.clientId,
        },
        actor,
      );
    });
  }

  async assignProjectMember(
    identity: RequestIdentity,
    workspaceId: string,
    projectId: string,
    membershipId: string,
  ) {
    await this.canWrite(identity, workspaceId);
    const actor = this.user(identity);
    return this.prisma.$transaction(async (tx) => {
      const project = await this.assertProject(tx, workspaceId, projectId);
      const member = await this.assertMembership(tx, workspaceId, membershipId);
      if (!project || !member) throw new NotFoundException();
      const assigned = await tx.projectMember.upsert({
        where: { projectId_membershipId: { projectId, membershipId } },
        update: {},
        create: { workspaceId, projectId, membershipId },
      });
      await this.activity(
        tx,
        workspaceId,
        actor,
        "PROJECT",
        projectId,
        "project.member_assigned",
        { membershipId },
      );
      if (member.userId !== identity.userId) {
        await tx.notification.create({
          data: {
            workspaceId,
            userId: member.userId,
            type: "PROJECT_ASSIGNED",
            title: "Você entrou em um projeto",
            message: `Você foi adicionado ao projeto ${project.name}.`,
            targetPath: "/app/projects",
          },
        });
      }
      return assigned;
    });
  }

  async listProjectMembers(
    identity: RequestIdentity,
    workspaceId: string,
    projectId: string,
  ) {
    await this.canRead(identity, workspaceId);
    const project = await this.prisma.project.count({
      where: { id: projectId, workspaceId, archivedAt: null },
    });
    if (!project) throw new NotFoundException("Project not found");
    return this.prisma.projectMember.findMany({
      where: { workspaceId, projectId },
      include: {
        membership: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async removeProjectMember(
    identity: RequestIdentity,
    workspaceId: string,
    projectId: string,
    membershipId: string,
  ) {
    await this.canWrite(identity, workspaceId);
    const actor = this.user(identity);
    await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.count({
        where: { id: projectId, workspaceId, archivedAt: null },
      });
      if (!project) throw new NotFoundException("Project not found");
      const result = await tx.projectMember.deleteMany({
        where: { workspaceId, projectId, membershipId },
      });
      if (!result.count) throw new NotFoundException("Project member not found");
      await this.activity(
        tx,
        workspaceId,
        actor,
        "PROJECT",
        projectId,
        "project.member_removed",
        { membershipId },
      );
    });
  }

  async createTask(
    identity: RequestIdentity,
    workspaceId: string,
    input: CreateTaskInput,
  ) {
    await this.canWrite(identity, workspaceId);
    return this.createTaskInternal(workspaceId, input, this.user(identity));
  }

  createTaskInternal(
    workspaceId: string,
    input: CreateTaskInput,
    actor: ActorContext,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertProject(tx, workspaceId, input.projectId);
      await this.assertMembership(tx, workspaceId, input.assigneeId);
      const task = await tx.task.create({
        data: {
          workspaceId,
          ...input,
          dueDate:
            input.dueDate === null
              ? null
              : input.dueDate
                ? new Date(input.dueDate)
                : undefined,
        },
      });
      await this.activity(tx, workspaceId, actor, "TASK", task.id, "task.created", {
        title: task.title,
      });
      await this.outbox(
        tx,
        workspaceId,
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
        actor,
      );
      await this.notifyAssignee(
        tx,
        workspaceId,
        actor.actorId,
        task.assigneeId,
        {
          type: "TASK_ASSIGNED",
          title: "Nova tarefa atribuída",
          message: task.title,
          targetPath: "/app/tasks",
        },
      );
      return task;
    });
  }

  async listTasks(
    identity: RequestIdentity,
    workspaceId: string,
    filters: {
      status?: TaskStatus;
      search?: string;
      projectId?: string;
      assigneeId?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    await this.canRead(identity, workspaceId);
    return this.prisma.task.findMany({
      where: {
        workspaceId,
        archivedAt: null,
        status: filters.status,
        projectId: filters.projectId,
        assigneeId: filters.assigneeId,
        OR: filters.search
          ? [
              { title: { contains: filters.search, mode: "insensitive" } },
              { project: { name: { contains: filters.search, mode: "insensitive" } } },
              { assignee: { user: { name: { contains: filters.search, mode: "insensitive" } } } },
            ]
          : undefined,
      },
      include: {
        project: { select: { id: true, name: true, clientId: true } },
        assignee: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { comments: true } },
      },
      take: filters.limit ?? 100,
      skip: filters.offset ?? 0,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });
  }

  async getTask(identity: RequestIdentity, workspaceId: string, id: string) {
    await this.canRead(identity, workspaceId);
    const task = await this.prisma.task.findFirst({
      where: { id, workspaceId, archivedAt: null },
      include: {
        project: { include: { client: true } },
        assignee: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        comments: {
          include: { author: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!task) throw new NotFoundException("Task not found");
    return task;
  }

  async updateTask(
    identity: RequestIdentity,
    workspaceId: string,
    id: string,
    input: UpdateTaskInput,
  ) {
    await this.canWrite(identity, workspaceId);
    return this.updateTaskInternal(workspaceId, id, input, this.user(identity));
  }

  updateTaskInternal(
    workspaceId: string,
    id: string,
    input: UpdateTaskInput,
    actor: ActorContext,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.task.findFirst({
        where: { id, workspaceId, archivedAt: null },
      });
      if (!previous) throw new NotFoundException("Task not found");
      await this.assertProject(tx, workspaceId, input.projectId);
      await this.assertMembership(tx, workspaceId, input.assigneeId);
      const task = await tx.task.update({
        where: { id },
        data: {
          ...input,
          dueDate:
            input.dueDate === null
              ? null
              : input.dueDate
                ? new Date(input.dueDate)
                : undefined,
        },
      });
      const statusChanged = Boolean(input.status && input.status !== previous.status);
      await this.activity(
        tx,
        workspaceId,
        actor,
        "TASK",
        id,
        statusChanged ? "task.status_changed" : "task.updated",
        statusChanged
          ? { previousStatus: previous.status, status: task.status }
          : undefined,
      );
      if (statusChanged) {
        const payload = {
          id,
          status: task.status,
          previousStatus: previous.status,
          projectId: task.projectId,
          assigneeId: task.assigneeId,
          priority: task.priority,
        };
        await this.outbox(
          tx,
          workspaceId,
          "task.status_changed",
          "TASK",
          id,
          payload,
          actor,
        );
        if (task.status === "DONE") {
          await this.outbox(
            tx,
            workspaceId,
            "task.completed",
            "TASK",
            id,
            payload,
            actor,
          );
        }
      }
      if (input.assigneeId && input.assigneeId !== previous.assigneeId) {
        await this.notifyAssignee(
          tx,
          workspaceId,
          actor.actorId,
          input.assigneeId,
          {
            type: "TASK_ASSIGNED",
            title: "Tarefa atribuída a você",
            message: task.title,
            targetPath: "/app/tasks",
          },
        );
      }
      return task;
    });
  }

  async archiveTask(identity: RequestIdentity, workspaceId: string, id: string) {
    await this.canWrite(identity, workspaceId);
    const actor = this.user(identity);
    await this.prisma.$transaction(async (tx) => {
      const task = await tx.task.findFirst({
        where: { id, workspaceId, archivedAt: null },
      });
      if (!task) throw new NotFoundException("Task not found");
      await tx.task.update({ where: { id }, data: { archivedAt: new Date() } });
      await this.activity(tx, workspaceId, actor, "TASK", id, "task.archived");
    });
  }

  async createComment(
    identity: RequestIdentity,
    workspaceId: string,
    taskId: string,
    content: string,
  ) {
    await this.canWrite(identity, workspaceId);
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.findFirst({
        where: { id: taskId, workspaceId, archivedAt: null },
      });
      if (!task) throw new NotFoundException("Task not found");
      const comment = await tx.taskComment.create({
        data: { workspaceId, taskId, authorId: identity.userId, content },
        include: { author: { select: { id: true, name: true, email: true } } },
      });
      await this.activity(
        tx,
        workspaceId,
        this.user(identity),
        "TASK",
        taskId,
        "task.comment_added",
      );
      return comment;
    });
  }

  async listComments(
    identity: RequestIdentity,
    workspaceId: string,
    taskId: string,
  ) {
    await this.canRead(identity, workspaceId);
    const task = await this.prisma.task.count({
      where: { id: taskId, workspaceId, archivedAt: null },
    });
    if (!task) throw new NotFoundException("Task not found");
    return this.prisma.taskComment.findMany({
      where: { workspaceId, taskId },
      include: { author: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async listActivity(
    identity: RequestIdentity,
    workspaceId: string,
    entityId?: string,
  ) {
    await this.canRead(identity, workspaceId);
    return this.prisma.activity.findMany({
      where: { workspaceId, entityId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async listNotifications(
    identity: RequestIdentity,
    workspaceId: string,
    unread?: boolean,
  ) {
    await this.canRead(identity, workspaceId);
    return this.prisma.notification.findMany({
      where: {
        workspaceId,
        userId: identity.userId,
        readAt: unread === undefined ? undefined : unread ? null : { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async markNotificationRead(
    identity: RequestIdentity,
    workspaceId: string,
    id: string,
  ) {
    await this.canRead(identity, workspaceId);
    const result = await this.prisma.notification.updateMany({
      where: { id, workspaceId, userId: identity.userId },
      data: { readAt: new Date() },
    });
    if (!result.count) throw new NotFoundException("Notification not found");
    return this.prisma.notification.findUnique({ where: { id } });
  }

  async markAllNotificationsRead(
    identity: RequestIdentity,
    workspaceId: string,
  ) {
    await this.canRead(identity, workspaceId);
    await this.prisma.notification.updateMany({
      where: { workspaceId, userId: identity.userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async dashboard(identity: RequestIdentity, workspaceId: string) {
    await this.canRead(identity, workspaceId);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
    const [
      tasks,
      completed,
      overdue,
      activeClients,
      activeProjects,
      unread,
      activeWorkflows,
      workflowFailures,
      recentActivity,
      members,
    ] = await Promise.all([
      this.prisma.task.count({ where: { workspaceId, archivedAt: null } }),
      this.prisma.task.count({
        where: { workspaceId, archivedAt: null, status: "DONE" },
      }),
      this.prisma.task.count({
        where: {
          workspaceId,
          archivedAt: null,
          status: { not: "DONE" },
          dueDate: { lt: now },
        },
      }),
      this.prisma.client.count({
        where: { workspaceId, archivedAt: null, status: "ACTIVE" },
      }),
      this.prisma.project.count({
        where: { workspaceId, archivedAt: null, status: "ACTIVE" },
      }),
      this.prisma.notification.count({
        where: { workspaceId, userId: identity.userId, readAt: null },
      }),
      this.prisma.workflow.count({ where: { workspaceId, status: "ACTIVE" } }),
      this.prisma.workflowExecution.count({
        where: { workspaceId, status: "FAILED", createdAt: { gte: weekAgo } },
      }),
      this.prisma.activity.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      this.prisma.membership.findMany({
        where: { workspaceId },
        include: {
          user: { select: { id: true, name: true } },
          assignedTasks: {
            where: { archivedAt: null, status: { not: "DONE" } },
            select: { id: true },
          },
        },
      }),
    ]);

    return {
      tasks: {
        total: tasks,
        completed,
        pending: tasks - completed,
        overdue,
      },
      clients: { active: activeClients },
      projects: { active: activeProjects },
      notifications: { unread },
      workflows: { active: activeWorkflows, failures7d: workflowFailures },
      recentActivity,
      workload: members.map((membership) => ({
        membershipId: membership.id,
        user: membership.user,
        count: membership.assignedTasks.length,
      })),
    };
  }
}
