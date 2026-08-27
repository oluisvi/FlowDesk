import { expect, test } from "@playwright/test";
import { API_URL, createWorkspaceApi, registerApi } from "./helpers";

test("a known client UUID from another workspace is not readable", async ({ request }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const a = await registerApi(request, `tenant-a-${suffix}@flowdesk.test`, "Tenant A");
  const workspaceA = await createWorkspaceApi(request, a.accessToken, `Tenant A ${suffix}`);
  const b = await registerApi(request, `tenant-b-${suffix}@flowdesk.test`, "Tenant B");
  const workspaceB = await createWorkspaceApi(request, b.accessToken, `Tenant B ${suffix}`);

  const created = await request.post(`${API_URL}/workspaces/${workspaceB.id}/clients`, {
    headers: { Authorization: `Bearer ${b.accessToken}` },
    data: { name: "Foreign E2E Client" },
  });
  expect(created.status()).toBe(201);
  const foreign = (await created.json()) as { id: string };

  const attempt = await request.get(
    `${API_URL}/workspaces/${workspaceA.id}/clients/${foreign.id}`,
    { headers: { Authorization: `Bearer ${a.accessToken}` } },
  );
  expect(attempt.status()).toBe(404);
});
