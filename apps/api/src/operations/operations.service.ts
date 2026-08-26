import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type {
  CreateClientInput,
  ClientStatus,
  CreateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  ProjectStatus,
  UpdateClientInput,
  UpdateProjectInput,
} from "@flowdesk/shared";
import type { RequestIdentity } from "../authorization/request-identity";
import { PolicyService } from "../authorization/policy.service";
import { WorkspaceAccessService } from "../authorization/workspace-access.service";
import { OperationsRepository } from "./operations.repository";

@Injectable()
export class OperationsService {
  constructor(
    @Inject(OperationsRepository)
    private readonly repository: OperationsRepository,
    @Inject(WorkspaceAccessService)
    private readonly access: WorkspaceAccessService,
    @Inject(PolicyService) private readonly policy: PolicyService,
  ) {}

  async createClient(
    identity: RequestIdentity,
    workspaceId: string,
    input: CreateClientInput,
  ) {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "operations:write");
    if (input.assignedMemberId)
      await this.assertMembership(workspaceId, input.assignedMemberId);
    const client = await this.repository.createClient(workspaceId, input);
    await this.recordCreation(identity, workspaceId, "CLIENT", client.id, "client.created");
    return client;
  }

  async listClients(
    identity: RequestIdentity,
    workspaceId: string,
    filters: { search?: string; status?: ClientStatus },
  ) {
    await this.access.resolve(identity, workspaceId);
    return this.repository.listClients(workspaceId, filters);
  }

  async getClient(
    identity: RequestIdentity,
    workspaceId: string,
    clientId: string,
  ) {
    await this.access.resolve(identity, workspaceId);
    const client = await this.repository.findClient(workspaceId, clientId);
    if (!client) throw new NotFoundException("Client not found");
    return client;
  }

  async updateClient(
    identity: RequestIdentity,
    workspaceId: string,
    clientId: string,
    input: UpdateClientInput,
  ) {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "operations:write");
    if (input.assignedMemberId)
      await this.assertMembership(workspaceId, input.assignedMemberId);
    const client = await this.repository.updateClient(
      workspaceId,
      clientId,
      input,
    );
    if (!client) throw new NotFoundException("Client not found");
    return client;
  }

  async archiveClient(
    identity: RequestIdentity,
    workspaceId: string,
    clientId: string,
  ): Promise<void> {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "operations:write");
    if (
      !(await this.repository.archiveClient(workspaceId, clientId, new Date()))
    )
      throw new NotFoundException("Client not found");
  }

  async createProject(
    identity: RequestIdentity,
    workspaceId: string,
    input: CreateProjectInput,
  ) {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "operations:write");
    if (
      input.clientId &&
      !(await this.repository.findClient(workspaceId, input.clientId))
    ) {
      throw new UnprocessableEntityException(
        "Client does not belong to workspace",
      );
    }
    const project = await this.repository.createProject(workspaceId, input);
    await this.recordCreation(identity, workspaceId, "PROJECT", project.id, "project.created");
    return project;
  }

  async listProjects(
    identity: RequestIdentity,
    workspaceId: string,
    filters: { status?: ProjectStatus },
  ) {
    await this.access.resolve(identity, workspaceId);
    return this.repository.listProjects(workspaceId, filters);
  }

  async updateProject(
    identity: RequestIdentity,
    workspaceId: string,
    projectId: string,
    input: UpdateProjectInput,
  ) {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "operations:write");
    if (
      input.clientId &&
      !(await this.repository.findClient(workspaceId, input.clientId))
    ) {
      throw new UnprocessableEntityException(
        "Client does not belong to workspace",
      );
    }
    const project = await this.repository.updateProject(
      workspaceId,
      projectId,
      input,
    );
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  async archiveProject(
    identity: RequestIdentity,
    workspaceId: string,
    projectId: string,
  ): Promise<void> {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "operations:write");
    if (
      !(await this.repository.archiveProject(
        workspaceId,
        projectId,
        new Date(),
      ))
    )
      throw new NotFoundException("Project not found");
  }

  async assignProjectMember(
    identity: RequestIdentity,
    workspaceId: string,
    projectId: string,
    membershipId: string,
  ) {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "operations:write");
    if (!(await this.repository.findProject(workspaceId, projectId)))
      throw new NotFoundException("Project not found");
    await this.assertMembership(workspaceId, membershipId);
    return this.repository.assignProjectMember(
      workspaceId,
      projectId,
      membershipId,
    );
  }

  async listProjectMembers(
    identity: RequestIdentity,
    workspaceId: string,
    projectId: string,
  ) {
    await this.access.resolve(identity, workspaceId);
    if (!(await this.repository.findProject(workspaceId, projectId)))
      throw new NotFoundException("Project not found");
    return this.repository.listProjectMembers(workspaceId, projectId);
  }

  async removeProjectMember(
    identity: RequestIdentity,
    workspaceId: string,
    projectId: string,
    membershipId: string,
  ): Promise<void> {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "operations:write");
    if (
      !(await this.repository.removeProjectMember(
        workspaceId,
        projectId,
        membershipId,
      ))
    )
      throw new NotFoundException("Project member not found");
  }

  async createTask(
    identity: RequestIdentity,
    workspaceId: string,
    input: CreateTaskInput,
  ) {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "operations:write");
    if (
      input.projectId &&
      !(await this.repository.findProject(workspaceId, input.projectId))
    ) {
      throw new UnprocessableEntityException(
        "Project does not belong to workspace",
      );
    }
    if (input.assigneeId)
      await this.assertMembership(workspaceId, input.assigneeId);
    const task = await this.repository.createTask(workspaceId, input);
    await this.recordCreation(identity, workspaceId, "TASK", task.id, "task.created");
    return task;
  }

  async listTasks(
    identity: RequestIdentity,
    workspaceId: string,
    filters: { status?: TaskStatus },
  ) {
    await this.access.resolve(identity, workspaceId);
    return this.repository.listTasks(workspaceId, filters);
  }

  async updateTask(
    identity: RequestIdentity,
    workspaceId: string,
    taskId: string,
    input: UpdateTaskInput,
  ) {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "operations:write");
    const previous = await this.repository.findTask(workspaceId, taskId);
    if (!previous) throw new NotFoundException("Task not found");
    const previousStatus = previous.status;
    if (
      input.projectId &&
      !(await this.repository.findProject(workspaceId, input.projectId))
    ) {
      throw new UnprocessableEntityException(
        "Project does not belong to workspace",
      );
    }
    if (input.assigneeId)
      await this.assertMembership(workspaceId, input.assigneeId);
    const updated = await this.repository.updateTask(
      workspaceId,
      taskId,
      input,
    );
    if (input.status && input.status !== previousStatus) {
      await this.repository.recordActivity({
        workspaceId,
        actorId: identity.userId,
        actorType: "USER",
        entityType: "TASK",
        entityId: taskId,
        action: "task.status_changed",
      });
    }
    return updated;
  }

  async archiveTask(
    identity: RequestIdentity,
    workspaceId: string,
    taskId: string,
  ): Promise<void> {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "operations:write");
    if (!(await this.repository.archiveTask(workspaceId, taskId, new Date())))
      throw new NotFoundException("Task not found");
  }

  async listActivity(
    identity: RequestIdentity,
    workspaceId: string,
    entityId?: string,
  ) {
    await this.access.resolve(identity, workspaceId);
    return this.repository.listActivity(workspaceId, entityId);
  }

  async createComment(
    identity: RequestIdentity,
    workspaceId: string,
    taskId: string,
    content: string,
  ) {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "operations:write");
    if (!(await this.repository.findTask(workspaceId, taskId)))
      throw new NotFoundException("Task not found");
    return this.repository.createComment({
      workspaceId,
      taskId,
      authorId: identity.userId,
      content,
    });
  }

  async listComments(
    identity: RequestIdentity,
    workspaceId: string,
    taskId: string,
  ) {
    await this.access.resolve(identity, workspaceId);
    if (!(await this.repository.findTask(workspaceId, taskId)))
      throw new NotFoundException("Task not found");
    return this.repository.listComments(workspaceId, taskId);
  }

  async markNotificationRead(
    identity: RequestIdentity,
    workspaceId: string,
    notificationId: string,
  ) {
    await this.access.resolve(identity, workspaceId);
    const notification = await this.repository.markNotificationRead(
      workspaceId,
      identity.userId,
      notificationId,
      new Date(),
    );
    if (!notification) throw new NotFoundException("Notification not found");
    return notification;
  }

  async listNotifications(
    identity: RequestIdentity,
    workspaceId: string,
    unread?: boolean,
  ) {
    await this.access.resolve(identity, workspaceId);
    return this.repository.listNotifications(
      workspaceId,
      identity.userId,
      unread,
    );
  }

  async markAllNotificationsRead(
    identity: RequestIdentity,
    workspaceId: string,
  ): Promise<void> {
    await this.access.resolve(identity, workspaceId);
    await this.repository.markAllNotificationsRead(
      workspaceId,
      identity.userId,
      new Date(),
    );
  }

  async dashboard(identity: RequestIdentity, workspaceId: string) {
    await this.access.resolve(identity, workspaceId);
    return this.repository.dashboard(workspaceId, identity.userId);
  }

  private async assertMembership(
    workspaceId: string,
    membershipId: string,
  ): Promise<void> {
    if (!(await this.repository.membershipExists(workspaceId, membershipId))) {
      throw new UnprocessableEntityException(
        "Member does not belong to workspace",
      );
    }
  }

  private async recordCreation(
    identity: RequestIdentity,
    workspaceId: string,
    entityType: "CLIENT" | "PROJECT" | "TASK",
    entityId: string,
    action: string,
  ): Promise<void> {
    await this.repository.recordActivity({
      workspaceId,
      actorId: identity.userId,
      actorType: "USER",
      entityType,
      entityId,
      action,
    });
  }
}
