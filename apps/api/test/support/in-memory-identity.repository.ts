import { randomUUID } from "node:crypto";
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
} from "../../src/common/identity.repository";

export class InMemoryIdentityRepository extends IdentityRepository {
  private readonly users: UserRecord[] = [];
  private readonly sessions: SessionRecord[] = [];
  private readonly resets: Array<{
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
  }> = [];
  private readonly workspaces: WorkspaceRecord[] = [];
  private readonly memberships: MembershipRecord[] = [];
  private readonly invitations: InvitationRecord[] = [];

  async createUser(input: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<UserRecord> {
    if (this.users.some((user) => user.email === input.email))
      throw new Error("duplicate user");
    const user = { id: randomUUID(), ...input };
    this.users.push(user);
    return user;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }
  async findUserById(id: string): Promise<UserRecord | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async createSession(
    input: Omit<SessionRecord, "id" | "createdAt" | "lastUsedAt" | "revokedAt">,
  ): Promise<SessionRecord> {
    const now = new Date();
    const session = {
      id: randomUUID(),
      ...input,
      revokedAt: null,
      createdAt: now,
      lastUsedAt: now,
    };
    this.sessions.push(session);
    return session;
  }

  async rotateSession(input: {
    tokenHash: string;
    nextTokenHash: string;
    nextExpiresAt: Date;
    now: Date;
    userAgent: string | null;
    ipAddress: string | null;
  }): Promise<RotationResult> {
    const previous = this.sessions.find(
      (session) => session.tokenHash === input.tokenHash,
    );
    if (!previous) return { status: "missing" };
    if (previous.revokedAt) {
      for (const session of this.sessions.filter(
        (candidate) =>
          candidate.familyId === previous.familyId && !candidate.revokedAt,
      ))
        session.revokedAt = input.now;
      return { status: "reuse" };
    }
    if (previous.expiresAt <= input.now) {
      for (const session of this.sessions.filter(
        (candidate) =>
          candidate.familyId === previous.familyId && !candidate.revokedAt,
      ))
        session.revokedAt = input.now;
      return { status: "expired" };
    }
    previous.revokedAt = input.now;
    previous.lastUsedAt = input.now;
    const current: SessionRecord = {
      id: randomUUID(),
      userId: previous.userId,
      familyId: previous.familyId,
      tokenHash: input.nextTokenHash,
      expiresAt: input.nextExpiresAt,
      revokedAt: null,
      createdAt: input.now,
      lastUsedAt: input.now,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    };
    this.sessions.push(current);
    return { status: "rotated", previous, current };
  }

  async revokeSessionFamily(familyId: string, now: Date): Promise<void> {
    for (const session of this.sessions.filter(
      (candidate) => candidate.familyId === familyId && !candidate.revokedAt,
    ))
      session.revokedAt = now;
  }

  async revokeSessionForUser(
    sessionId: string,
    userId: string,
    now: Date,
  ): Promise<boolean> {
    const session = this.sessions.find(
      (candidate) =>
        candidate.id === sessionId &&
        candidate.userId === userId &&
        !candidate.revokedAt,
    );
    if (!session) return false;
    session.revokedAt = now;
    return true;
  }

  async listSessions(userId: string, now: Date): Promise<SessionRecord[]> {
    return this.sessions.filter(
      (session) =>
        session.userId === userId &&
        !session.revokedAt &&
        session.expiresAt > now,
    );
  }

  async createPasswordReset(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    this.resets.push({ ...input, usedAt: null });
  }

  async consumePasswordReset(input: {
    tokenHash: string;
    passwordHash: string;
    now: Date;
  }): Promise<"accepted" | "gone"> {
    const reset = this.resets.find(
      (candidate) => candidate.tokenHash === input.tokenHash,
    );
    if (!reset || reset.usedAt || reset.expiresAt <= input.now) return "gone";
    const user = this.users.find((candidate) => candidate.id === reset.userId);
    if (!user) return "gone";
    reset.usedAt = input.now;
    user.passwordHash = input.passwordHash;
    for (const session of this.sessions.filter(
      (candidate) => candidate.userId === user.id && !candidate.revokedAt,
    ))
      session.revokedAt = input.now;
    return "accepted";
  }

  async createWorkspace(input: {
    userId: string;
    name: string;
    slug: string;
  }): Promise<{ workspace: WorkspaceRecord; membership: MembershipRecord }> {
    const workspace = { id: randomUUID(), name: input.name, slug: input.slug };
    const membership: MembershipRecord = {
      id: randomUUID(),
      workspaceId: workspace.id,
      userId: input.userId,
      role: "OWNER",
    };
    this.workspaces.push(workspace);
    this.memberships.push(membership);
    return { workspace, membership };
  }

  async listWorkspaces(
    userId: string,
  ): Promise<
    Array<{ workspace: WorkspaceRecord; membership: MembershipRecord }>
  > {
    return this.memberships
      .filter((membership) => membership.userId === userId)
      .map((membership) => ({
        membership,
        workspace: this.workspaces.find(
          (workspace) => workspace.id === membership.workspaceId,
        )!,
      }));
  }

  async findMembership(
    userId: string,
    workspaceId: string,
  ): Promise<MembershipRecord | null> {
    return (
      this.memberships.find(
        (membership) =>
          membership.userId === userId &&
          membership.workspaceId === workspaceId,
      ) ?? null
    );
  }

  async findMemberScoped(
    workspaceId: string,
    membershipId: string,
  ): Promise<MembershipRecord | null> {
    return (
      this.memberships.find(
        (membership) =>
          membership.id === membershipId &&
          membership.workspaceId === workspaceId,
      ) ?? null
    );
  }

  async listMembers(
    workspaceId: string,
  ): Promise<Array<MembershipRecord & { email: string; name: string }>> {
    return this.memberships
      .filter((membership) => membership.workspaceId === workspaceId)
      .map((membership) => {
        const user = this.users.find(
          (candidate) => candidate.id === membership.userId,
        )!;
        return { ...membership, email: user.email, name: user.name };
      });
  }

  async updateWorkspace(
    workspaceId: string,
    name: string,
  ): Promise<WorkspaceRecord> {
    const workspace = this.workspaces.find(
      (candidate) => candidate.id === workspaceId,
    );
    if (!workspace) throw new Error("workspace not found");
    workspace.name = name;
    return workspace;
  }

  async createInvitation(
    input: Omit<InvitationRecord, "id" | "acceptedAt" | "revokedAt"> & {
      invitedById: string;
    },
  ): Promise<InvitationRecord> {
    const invitation: InvitationRecord = {
      id: randomUUID(),
      workspaceId: input.workspaceId,
      email: input.email,
      role: input.role,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      acceptedAt: null,
      revokedAt: null,
    };
    this.invitations.push(invitation);
    return invitation;
  }

  async consumeInvitation(input: {
    tokenHash: string;
    user: UserRecord;
    now: Date;
  }): Promise<ConsumeResult<MembershipRecord>> {
    const invitation = this.invitations.find(
      (candidate) => candidate.tokenHash === input.tokenHash,
    );
    if (!invitation) return { status: "missing" };
    if (
      invitation.acceptedAt ||
      invitation.revokedAt ||
      invitation.expiresAt <= input.now
    )
      return { status: "gone" };
    if (invitation.email !== input.user.email)
      return { status: "email_mismatch" };
    let membership = await this.findMembership(
      input.user.id,
      invitation.workspaceId,
    );
    if (!membership) {
      membership = {
        id: randomUUID(),
        workspaceId: invitation.workspaceId,
        userId: input.user.id,
        role: invitation.role,
      };
      this.memberships.push(membership);
    }
    invitation.acceptedAt = input.now;
    return { status: "accepted", value: membership };
  }

  async updateMemberRole(
    workspaceId: string,
    membershipId: string,
    role: Exclude<WorkspaceRole, "OWNER">,
  ): Promise<MembershipRecord | null> {
    const membership = await this.findMemberScoped(workspaceId, membershipId);
    if (!membership) return null;
    membership.role = role;
    return membership;
  }

  async removeMember(
    workspaceId: string,
    membershipId: string,
  ): Promise<boolean> {
    const index = this.memberships.findIndex(
      (membership) =>
        membership.workspaceId === workspaceId &&
        membership.id === membershipId,
    );
    if (index < 0) return false;
    this.memberships.splice(index, 1);
    return true;
  }

  async countOwners(workspaceId: string): Promise<number> {
    return this.memberships.filter(
      (membership) =>
        membership.workspaceId === workspaceId && membership.role === "OWNER",
    ).length;
  }

  async membershipExists(
    workspaceId: string,
    membershipId: string,
  ): Promise<boolean> {
    return this.memberships.some(
      (membership) =>
        membership.workspaceId === workspaceId &&
        membership.id === membershipId,
    );
  }

  userIdByEmail(email: string): string {
    const user = this.users.find((candidate) => candidate.email === email);
    if (!user) throw new Error("user not found");
    return user.id;
  }
}
