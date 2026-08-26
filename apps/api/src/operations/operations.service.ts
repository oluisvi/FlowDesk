import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type {
  CreateClientInput,
  CreateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
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
    return this.repository.createClient(workspaceId, input);
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
    return this.repository.createProject(workspaceId, input);
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
    return this.repository.createTask(workspaceId, input);
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

  async listActivity(
    identity: RequestIdentity,
    workspaceId: string,
    entityId?: string,
  ) {
    await this.access.resolve(identity, workspaceId);
    return this.repository.listActivity(workspaceId, entityId);
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
}
