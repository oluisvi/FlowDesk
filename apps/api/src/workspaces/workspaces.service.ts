import { randomUUID } from "node:crypto";
import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { WorkspaceRole } from "@flowdesk/shared";
import type { RequestIdentity } from "../authorization/request-identity.js";
import { PolicyService } from "../authorization/policy.service.js";
import { WorkspaceAccessService } from "../authorization/workspace-access.service.js";
import { PrismaService } from "../common/prisma.service.js";
import { createOpaqueToken, hashOpaqueToken } from "../common/token-utils.js";

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    private readonly policy: PolicyService,
  ) {}

  async create(identity: RequestIdentity, name: string) {
    const base =
      name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "workspace";

    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { name, slug: `${base}-${randomUUID().slice(0, 8)}` },
      });
      const membership = await tx.membership.create({
        data: { workspaceId: workspace.id, userId: identity.userId, role: "OWNER" },
      });
      await tx.activity.create({
        data: {
          workspaceId: workspace.id,
          actorId: identity.userId,
          actorType: "USER",
          entityType: "WORKSPACE",
          entityId: workspace.id,
          action: "workspace.created",
          metadata: { name: workspace.name },
        },
      });
      await tx.auditLog.create({
        data: {
          workspaceId: workspace.id,
          userId: identity.userId,
          action: "workspace.created",
          resourceType: "WORKSPACE",
          resourceId: workspace.id,
        },
      });
      return { workspace, membership };
    });
  }

  list(identity: RequestIdentity) {
    return this.prisma.membership.findMany({
      where: { userId: identity.userId },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });
  }

  switch(identity: RequestIdentity, workspaceId: string) {
    return this.access.resolve(identity, workspaceId);
  }

  async update(identity: RequestIdentity, workspaceId: string, name: string) {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "workspace:update");
    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { name },
    });
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        userId: identity.userId,
        action: "workspace.updated",
        resourceType: "WORKSPACE",
        resourceId: workspaceId,
        metadata: { name },
      },
    });
    return workspace;
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
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "invitation:create");

    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existingUser) {
      const existingMembership = await this.prisma.membership.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: existingUser.id,
          },
        },
        select: { id: true },
      });
      if (existingMembership) {
        throw new ConflictException("This account is already a workspace member");
      }
    }

    const activeInvitation = await this.prisma.workspaceInvitation.findFirst({
      where: {
        workspaceId,
        email: input.email,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (activeInvitation) {
      throw new ConflictException("An active invitation already exists for this email");
    }

    const token = createOpaqueToken();
    const invitation = await this.prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        email: input.email,
        role: input.role,
        tokenHash: hashOpaqueToken(token),
        expiresAt: new Date(Date.now() + (input.expiresInHours ?? 72) * 3_600_000),
        invitedById: identity.userId,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        userId: identity.userId,
        action: "invitation.created",
        resourceType: "WORKSPACE_INVITATION",
        resourceId: invitation.id,
        metadata: { email: invitation.email, role: invitation.role },
      },
    });
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      token,
    };
  }

  async listInvitations(identity: RequestIdentity, workspaceId: string) {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "invitation:create");
    return this.prisma.workspaceInvitation.findMany({
      where: { workspaceId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async revokeInvitation(
    identity: RequestIdentity,
    workspaceId: string,
    invitationId: string,
  ) {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "invitation:create");
    const result = await this.prisma.workspaceInvitation.updateMany({
      where: { id: invitationId, workspaceId, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!result.count) throw new NotFoundException("Invitation not found");
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        userId: identity.userId,
        action: "invitation.revoked",
        resourceType: "WORKSPACE_INVITATION",
        resourceId: invitationId,
      },
    });
  }

  async acceptInvitation(identity: RequestIdentity, token: string) {
    const hash = hashOpaqueToken(token);
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { tokenHash: hash },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: identity.userId },
      select: { id: true, email: true },
    });
    const now = new Date();
    if (
      !invitation ||
      !user ||
      invitation.revokedAt ||
      invitation.acceptedAt ||
      invitation.expiresAt <= now
    ) {
      throw new GoneException("Invitation is invalid, expired, or already used");
    }
    if (invitation.email !== user.email) {
      throw new ForbiddenException("Invitation belongs to another account");
    }

    return this.prisma.$transaction(async (tx) => {
      const consumed = await tx.workspaceInvitation.updateMany({
        where: {
          id: invitation.id,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { acceptedAt: now },
      });
      if (consumed.count !== 1) {
        throw new GoneException("Invitation is invalid, expired, or already used");
      }

      const membership = await tx.membership.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: invitation.workspaceId,
            userId: user.id,
          },
        },
        update: { role: invitation.role },
        create: {
          workspaceId: invitation.workspaceId,
          userId: user.id,
          role: invitation.role,
        },
      });
      await tx.activity.create({
        data: {
          workspaceId: invitation.workspaceId,
          actorId: user.id,
          actorType: "USER",
          entityType: "WORKSPACE",
          entityId: invitation.workspaceId,
          action: "member.joined",
          metadata: { role: invitation.role },
        },
      });
      await tx.auditLog.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: user.id,
          action: "invitation.accepted",
          resourceType: "WORKSPACE_INVITATION",
          resourceId: invitation.id,
        },
      });
      return membership;
    });
  }

  async listMembers(identity: RequestIdentity, workspaceId: string) {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "workspace:read");
    return this.prisma.membership.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async getMember(
    identity: RequestIdentity,
    workspaceId: string,
    membershipId: string,
  ) {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "workspace:read");
    const member = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (!member) throw new NotFoundException("Member not found");
    return member;
  }

  async updateMember(
    identity: RequestIdentity,
    workspaceId: string,
    membershipId: string,
    role: Exclude<WorkspaceRole, "OWNER">,
  ) {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "member:manage");
    const target = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
    });
    if (!target) throw new NotFoundException("Member not found");
    if (target.role === "OWNER") {
      throw new ForbiddenException("Owner role cannot be changed");
    }

    const member = await this.prisma.membership.update({
      where: { id: membershipId },
      data: { role },
    });
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        userId: identity.userId,
        action: "member.role_changed",
        resourceType: "MEMBERSHIP",
        resourceId: membershipId,
        metadata: { from: target.role, to: role },
      },
    });
    return member;
  }

  async removeMember(
    identity: RequestIdentity,
    workspaceId: string,
    membershipId: string,
  ) {
    const access = await this.access.resolve(identity, workspaceId);
    this.policy.assert(access, "member:manage");
    const target = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
    });
    if (!target) throw new NotFoundException("Member not found");
    if (target.role === "OWNER") throw new ForbiddenException("Owner cannot be removed");

    await this.prisma.$transaction([
      this.prisma.membership.delete({ where: { id: membershipId } }),
      this.prisma.auditLog.create({
        data: {
          workspaceId,
          userId: identity.userId,
          action: "member.removed",
          resourceType: "MEMBERSHIP",
          resourceId: membershipId,
        },
      }),
    ]);
  }

  async leave(identity: RequestIdentity, workspaceId: string) {
    const access = await this.access.resolve(identity, workspaceId);
    if (access.role === "OWNER") {
      const owners = await this.prisma.membership.count({
        where: { workspaceId, role: "OWNER" },
      });
      if (owners <= 1) {
        throw new ForbiddenException("Transfer ownership before leaving");
      }
    }
    await this.prisma.membership.delete({ where: { id: access.membershipId } });
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        userId: identity.userId,
        action: "member.left",
        resourceType: "MEMBERSHIP",
        resourceId: access.membershipId,
      },
    });
  }
}
