import { ForbiddenException, Injectable } from "@nestjs/common";
import type { WorkspaceRole } from "@flowdesk/shared";
import type { WorkspaceAccess } from "./workspace-access";

export type Permission =
  | "workspace:read"
  | "workspace:update"
  | "invitation:create"
  | "member:manage"
  | "operations:write";

const permissions: Record<WorkspaceRole, ReadonlySet<Permission>> = {
  OWNER: new Set([
    "workspace:read",
    "workspace:update",
    "invitation:create",
    "member:manage",
    "operations:write",
  ]),
  ADMIN: new Set([
    "workspace:read",
    "workspace:update",
    "invitation:create",
    "member:manage",
    "operations:write",
  ]),
  MEMBER: new Set(["workspace:read", "operations:write"]),
  VIEWER: new Set(["workspace:read"]),
};

@Injectable()
export class PolicyService {
  assert(access: WorkspaceAccess, permission: Permission): void {
    if (!permissions[access.role].has(permission)) {
      throw new ForbiddenException("Insufficient workspace permission");
    }
  }
}
