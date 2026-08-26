import { describe, expect, it } from "vitest";
import { PolicyService } from "./policy.service";
import type { WorkspaceAccess } from "./workspace-access";

const access = (role: WorkspaceAccess["role"]): WorkspaceAccess => ({
  workspaceId: "workspace-a",
  membershipId: "membership-a",
  role,
});

describe("PolicyService", () => {
  const policy = new PolicyService();

  it.each([
    ["OWNER", "workspace:update", true],
    ["ADMIN", "workspace:update", true],
    ["MEMBER", "workspace:update", false],
    ["VIEWER", "workspace:update", false],
    ["OWNER", "member:manage", true],
    ["ADMIN", "member:manage", true],
    ["MEMBER", "member:manage", false],
    ["VIEWER", "member:manage", false],
    ["OWNER", "workspace:read", true],
    ["ADMIN", "workspace:read", true],
    ["MEMBER", "workspace:read", true],
    ["VIEWER", "workspace:read", true],
  ] as const)("enforces %s permission %s", (role, permission, allowed) => {
    const operation = () => policy.assert(access(role), permission);

    if (allowed) {
      expect(operation).not.toThrow();
    } else {
      expect(operation).toThrowError(expect.objectContaining({ status: 403 }));
    }
  });
});
