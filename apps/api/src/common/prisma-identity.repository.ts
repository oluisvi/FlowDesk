import { Inject, Injectable } from "@nestjs/common";
import type { WorkspaceRole } from "@flowdesk/shared";
import {
  IdentityRepository,
  type ConsumeResult,
  type InvitationRecord,
  type MembershipRecord,
  type RotationResult,
  type SessionRecord,
  type UserRecord,
  type WorkspaceRecord,
} from "./identity.repository";
import { PrismaService } from "./prisma.service";

@Injectable()
export class PrismaIdentityRepository extends IdentityRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) { super(); }

  createUser(input: { email: string; name: string; passwordHash: string }): Promise<UserRecord> {
    return this.prisma.user.create({ data: input });
  }

  findUserByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findUserById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createSession(input: Omit<SessionRecord, "id" | "createdAt" | "lastUsedAt" | "revokedAt">): Promise<SessionRecord> {
    return this.prisma.session.create({ data: input });
  }

  rotateSession(input: { tokenHash: string; nextTokenHash: string; nextExpiresAt: Date; now: Date; userAgent: string | null; ipAddress: string | null }): Promise<RotationResult> {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.session.findUnique({ where: { tokenHash: input.tokenHash } });
      if (!previous) return { status: "missing" };
      if (previous.revokedAt) {
        await transaction.session.updateMany({ where: { familyId: previous.familyId, revokedAt: null }, data: { revokedAt: input.now } });
        return { status: "reuse" };
      }
      if (previous.expiresAt <= input.now) {
        await transaction.session.updateMany({ where: { familyId: previous.familyId, revokedAt: null }, data: { revokedAt: input.now } });
        return { status: "expired" };
      }
      await transaction.session.update({ where: { id: previous.id }, data: { revokedAt: input.now, lastUsedAt: input.now } });
      const current = await transaction.session.create({ data: {
        userId: previous.userId,
        familyId: previous.familyId,
        tokenHash: input.nextTokenHash,
        expiresAt: input.nextExpiresAt,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
      } });
      return { status: "rotated", previous, current };
    });
  }

  async revokeSessionFamily(familyId: string, now: Date): Promise<void> {
    await this.prisma.session.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: now } });
  }

  async revokeSessionForUser(sessionId: string, userId: string, now: Date): Promise<boolean> {
    const result = await this.prisma.session.updateMany({ where: { id: sessionId, userId, revokedAt: null }, data: { revokedAt: now } });
    return result.count > 0;
  }

  listSessions(userId: string, now: Date): Promise<SessionRecord[]> {
    return this.prisma.session.findMany({ where: { userId, revokedAt: null, expiresAt: { gt: now } }, orderBy: { createdAt: "desc" } });
  }

  async createPasswordReset(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await this.prisma.passwordResetToken.create({ data: input });
  }

  consumePasswordReset(input: { tokenHash: string; passwordHash: string; now: Date }): Promise<"accepted" | "gone"> {
    return this.prisma.$transaction(async (transaction) => {
      const reset = await transaction.passwordResetToken.findUnique({ where: { tokenHash: input.tokenHash } });
      if (!reset || reset.usedAt || reset.expiresAt <= input.now) return "gone";
      await transaction.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: input.now } });
      await transaction.user.update({ where: { id: reset.userId }, data: { passwordHash: input.passwordHash } });
      await transaction.session.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: input.now } });
      return "accepted";
    });
  }

  createWorkspace(input: { userId: string; name: string; slug: string }): Promise<{ workspace: WorkspaceRecord; membership: MembershipRecord }> {
    return this.prisma.$transaction(async (transaction) => {
      const workspace = await transaction.workspace.create({ data: { name: input.name, slug: input.slug } });
      const membership = await transaction.membership.create({ data: { workspaceId: workspace.id, userId: input.userId, role: "OWNER" } });
      return { workspace, membership: membership as MembershipRecord };
    });
  }

  async listWorkspaces(userId: string): Promise<Array<{ workspace: WorkspaceRecord; membership: MembershipRecord }>> {
    const memberships = await this.prisma.membership.findMany({ where: { userId }, include: { workspace: true }, orderBy: { createdAt: "asc" } });
    return memberships.map(({ workspace, ...membership }) => ({ workspace, membership: membership as MembershipRecord }));
  }

  async findMembership(userId: string, workspaceId: string): Promise<MembershipRecord | null> {
    return this.prisma.membership.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } }) as Promise<MembershipRecord | null>;
  }

  async findMemberScoped(workspaceId: string, membershipId: string): Promise<MembershipRecord | null> {
    return this.prisma.findWorkspaceScoped(
      (where) => this.prisma.membership.findFirst({ where }),
      workspaceId,
      membershipId,
    ) as Promise<MembershipRecord | null>;
  }

  async listMembers(workspaceId: string): Promise<Array<MembershipRecord & { email: string; name: string }>> {
    const memberships = await this.prisma.membership.findMany({ where: { workspaceId }, include: { user: { select: { email: true, name: true } } }, orderBy: { createdAt: "asc" } });
    return memberships.map(({ user, ...membership }) => ({ ...membership, ...user, role: membership.role as WorkspaceRole }));
  }

  updateWorkspace(workspaceId: string, name: string): Promise<WorkspaceRecord> {
    return this.prisma.workspace.update({ where: { id: workspaceId }, data: { name } });
  }

  createInvitation(input: Omit<InvitationRecord, "id" | "acceptedAt" | "revokedAt"> & { invitedById: string }): Promise<InvitationRecord> {
    return this.prisma.workspaceInvitation.create({ data: input }) as Promise<InvitationRecord>;
  }

  consumeInvitation(input: { tokenHash: string; user: UserRecord; now: Date }): Promise<ConsumeResult<MembershipRecord>> {
    return this.prisma.$transaction(async (transaction) => {
      const invitation = await transaction.workspaceInvitation.findUnique({ where: { tokenHash: input.tokenHash } });
      if (!invitation) return { status: "missing" };
      if (invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt <= input.now) return { status: "gone" };
      if (invitation.email !== input.user.email) return { status: "email_mismatch" };
      const membership = await transaction.membership.upsert({
        where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: input.user.id } },
        create: { workspaceId: invitation.workspaceId, userId: input.user.id, role: invitation.role },
        update: {},
      });
      await transaction.workspaceInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: input.now } });
      return { status: "accepted", value: membership as MembershipRecord };
    });
  }

  async updateMemberRole(workspaceId: string, membershipId: string, role: Exclude<WorkspaceRole, "OWNER">): Promise<MembershipRecord | null> {
    const member = await this.findMemberScoped(workspaceId, membershipId);
    if (!member) return null;
    return this.prisma.membership.update({ where: { id: membershipId }, data: { role } }) as Promise<MembershipRecord>;
  }

  async removeMember(workspaceId: string, membershipId: string): Promise<boolean> {
    const result = await this.prisma.membership.deleteMany({ where: { id: membershipId, workspaceId } });
    return result.count > 0;
  }

  countOwners(workspaceId: string): Promise<number> {
    return this.prisma.membership.count({ where: { workspaceId, role: "OWNER" } });
  }
}
