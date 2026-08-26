import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { IdentityRepository } from "../common/identity.repository";
import type { RequestIdentity } from "./request-identity";
import type { WorkspaceAccess } from "./workspace-access";

@Injectable()
export class WorkspaceAccessService {
  constructor(
    @Inject(IdentityRepository) private readonly repository: IdentityRepository,
  ) {}

  async resolve(
    identity: RequestIdentity,
    workspaceId: string,
  ): Promise<WorkspaceAccess> {
    const membership = await this.repository.findMembership(
      identity.userId,
      workspaceId,
    );
    if (!membership) throw new NotFoundException("Workspace not found");
    return { workspaceId, membershipId: membership.id, role: membership.role };
  }
}
