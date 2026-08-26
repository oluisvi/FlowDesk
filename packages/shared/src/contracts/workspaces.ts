import { z } from "zod";

export const WorkspaceRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]);
export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;

export const CreateWorkspaceSchema = z.object({ name: z.string().trim().min(1).max(100) });
export const UpdateWorkspaceSchema = CreateWorkspaceSchema;
export const CreateInvitationSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  role: WorkspaceRoleSchema.exclude(["OWNER"]),
  expiresInHours: z.number().int().min(1).max(168).optional(),
});
export const AcceptInvitationSchema = z.object({ token: z.string().min(32) });
export const UpdateMemberRoleSchema = z.object({ role: WorkspaceRoleSchema.exclude(["OWNER"]) });
