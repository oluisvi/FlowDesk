import { randomUUID } from "node:crypto";
import {
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { WorkspaceRole } from "@flowdesk/shared";
import type { RequestIdentity } from "../authorization/request-identity";
import { PolicyService } from "../authorization/policy.service";
import { WorkspaceAccessService } from "../authorization/workspace-access.service";
import {
  IdentityRepository,
  type MembershipRecord,
} from "../common/identity.repository";
import { createOpaqueToken, hashOpaqueToken } from "../common/token-utils";

@Injectable()
export class WorkspacesService {
  constructor(
    @Inject(IdentityRepository) private readonly repository: IdentityRepository,
    @Inject(WorkspaceAccessService)
    private readonly accessService: WorkspaceAccessService,
    @Inject(PolicyService) private readonly policy: PolicyService,
    @Inject("CLOCK") private readonly now: () => Date,
  ) {}

  create(identity: RequestIdentity, name: string) {
    const base =
      name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "workspace";
    return this.repository.createWorkspace({
      userId: identity.userId,
      name,
      slug: `${base}-${randomUUID().slice(0, 8)}`,
    });
  }

  list(identity: RequestIdentity) {
    return this.repository.listWorkspaces(identity.userId);
  }

  async switch(identity: RequestIdentity, workspaceId: string) {
    return this.accessService.resolve(identity, workspaceId);
  }

  async update(identity: RequestIdentity, workspaceId: string, name: string) {
    const access = await this.accessService.resolve(identity, workspaceId);
    this.policy.assert(access, "workspace:update");
    return this.repository.updateWorkspace(workspaceId, name);
  }

  async createInvitation(
    identity: RequestIdentity,
    workspaceId: string,
    input: {
      email: string;
      role: Exclude<WorkspaceRole, "OWNER">;
      expiresInHours?: number;
    },
  ) {
    const access = await this.accessService.resolve(identity, workspaceId);
    this.policy.assert(access, "invitation:create");
    const token = createOpaqueToken();
    const invitation = await this.repository.createInvitation({
      workspaceId,
      email: input.email,
      role: input.role,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(
        this.now().getTime() + (input.expiresInHours ?? 72) * 3_600_000,
      ),
      invitedById: identity.userId,
    });
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      token,
    };
  }

  async acceptInvitation(
    identity: RequestIdentity,
    token: string,
  ): Promise<MembershipRecord> {
    const user = await this.repository.findUserById(identity.userId);
    if (!user) throw new NotFoundException();
    const result = await this.repository.consumeInvitation({
      tokenHash: hashOpaqueToken(token),
      user,
      now: this.now(),
    });
    if (result.status === "accepted") return result.value;
    if (result.status === "email_mismatch")
      throw new ForbiddenException("Invitation belongs to another account");
    throw new GoneException("Invitation is invalid, expired, or already used");
  }

  async listMembers(identity: RequestIdentity, workspaceId: string) {
    const access = await this.accessService.resolve(identity, workspaceId);
    this.policy.assert(access, "workspace:read");
    return this.repository.listMembers(workspaceId);
  }

  async getMember(
    identity: RequestIdentity,
    workspaceId: string,
    membershipId: string,
  ) {
    const access = await this.accessService.resolve(identity, workspaceId);
    this.policy.assert(access, "workspace:read");
    const member = await this.repository.findMemberScoped(
      workspaceId,
      membershipId,
    );
    if (!member) throw new NotFoundException("Member not found");
    return member;
  }

  async updateMember(
    identity: RequestIdentity,
    workspaceId: string,
    membershipId: string,
    role: Exclude<WorkspaceRole, "OWNER">,
  ) {
    const access = await this.accessService.resolve(identity, workspaceId);
    this.policy.assert(access, "member:manage");
    const target = await this.repository.findMemberScoped(
      workspaceId,
      membershipId,
    );
    if (!target) throw new NotFoundException("Member not found");
    if (target.role === "OWNER")
      throw new ForbiddenException("Owner role cannot be changed");
    return this.repository.updateMemberRole(workspaceId, membershipId, role);
  }

  async removeMember(
    identity: RequestIdentity,
    workspaceId: string,
    membershipId: string,
  ): Promise<void> {
    const access = await this.accessService.resolve(identity, workspaceId);
    this.policy.assert(access, "member:manage");
    const target = await this.repository.findMemberScoped(
      workspaceId,
      membershipId,
    );
    if (!target) throw new NotFoundException("Member not found");
    if (target.role === "OWNER")
      throw new ForbiddenException("Owner cannot be removed");
    await this.repository.removeMember(workspaceId, membershipId);
  }

  async leave(identity: RequestIdentity, workspaceId: string): Promise<void> {
    const access = await this.accessService.resolve(identity, workspaceId);
    if (
      access.role === "OWNER" &&
      (await this.repository.countOwners(workspaceId)) <= 1
    )
      throw new ForbiddenException("Transfer ownership before leaving");
    await this.repository.removeMember(workspaceId, access.membershipId);
  }
}
