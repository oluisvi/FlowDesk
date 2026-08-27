import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001/api/v1";
export const SEED_EMAIL = process.env.SEED_OWNER_EMAIL ?? "owner@flowdesk.local";
export const SEED_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "ChangeMeNow123!";

export async function loginSeed(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(SEED_EMAIL);
  await page.getByLabel("Senha").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/app(?:\/)?$/);
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
}

export async function registerApi(
  request: APIRequestContext,
  email: string,
  name = "FlowDesk E2E",
) {
  const response = await request.post(`${API_URL}/auth/register`, {
    data: { email, name, password: "StrongPassword123!" },
  });
  expect(response.status()).toBe(201);
  const body = (await response.json()) as {
    accessToken: string;
    user: { id: string; email: string; name: string };
  };
  return body;
}

export async function createWorkspaceApi(
  request: APIRequestContext,
  accessToken: string,
  name: string,
) {
  const response = await request.post(`${API_URL}/workspaces`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { name },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as { id: string; name: string; slug: string };
}
