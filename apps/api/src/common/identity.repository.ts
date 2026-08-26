import type { WorkspaceRole } from "@flowdesk/shared";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  lastUsedAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface WorkspaceRecord { id: string; name: string; slug: string }
export interface MembershipRecord { id: string; workspaceId: string; userId: string; role: WorkspaceRole }
export interface InvitationRecord {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  tokenHash: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
}

export type RotationResult =
  | { status: "rotated"; previous: SessionRecord; current: SessionRecord }
  | { status: "missing" | "expired" | "reuse" };
export type ConsumeResult<T> = { status: "accepted"; value: T } | { status: "missing" | "gone" | "email_mismatch" };

export abstract class IdentityRepository {
  abstract createUser(input: { email: string; name: string; passwordHash: string }): Promise<UserRecord>;
  abstract findUserByEmail(email: string): Promise<UserRecord | null>;
  abstract findUserById(id: string): Promise<UserRecord | null>;
  abstract createSession(input: Omit<SessionRecord, "id" | "createdAt" | "lastUsedAt" | "revokedAt">): Promise<SessionRecord>;
  abstract rotateSession(input: { tokenHash: string; nextTokenHash: string; nextExpiresAt: Date; now: Date; userAgent: string | null; ipAddress: string | null }): Promise<RotationResult>;
  abstract revokeSessionFamily(familyId: string, now: Date): Promise<void>;
  abstract revokeSessionForUser(sessionId: string, userId: string, now: Date): Promise<boolean>;
  abstract listSessions(userId: string, now: Date): Promise<SessionRecord[]>;
  abstract createPasswordReset(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  abstract consumePasswordReset(input: { tokenHash: string; passwordHash: string; now: Date }): Promise<"accepted" | "gone">;
  abstract createWorkspace(input: { userId: string; name: string; slug: string }): Promise<{ workspace: WorkspaceRecord; membership: MembershipRecord }>;
  abstract listWorkspaces(userId: string): Promise<Array<{ workspace: WorkspaceRecord; membership: MembershipRecord }>>;
  abstract findMembership(userId: string, workspaceId: string): Promise<MembershipRecord | null>;
  abstract findMemberScoped(workspaceId: string, membershipId: string): Promise<MembershipRecord | null>;
  abstract listMembers(workspaceId: string): Promise<Array<MembershipRecord & { email: string; name: string }>>;
  abstract updateWorkspace(workspaceId: string, name: string): Promise<WorkspaceRecord>;
  abstract createInvitation(input: Omit<InvitationRecord, "id" | "acceptedAt" | "revokedAt"> & { invitedById: string }): Promise<InvitationRecord>;
  abstract consumeInvitation(input: { tokenHash: string; user: UserRecord; now: Date }): Promise<ConsumeResult<MembershipRecord>>;
  abstract updateMemberRole(workspaceId: string, membershipId: string, role: Exclude<WorkspaceRole, "OWNER">): Promise<MembershipRecord | null>;
  abstract removeMember(workspaceId: string, membershipId: string): Promise<boolean>;
  abstract countOwners(workspaceId: string): Promise<number>;
}
