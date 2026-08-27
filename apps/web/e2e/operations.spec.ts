import { expect, test } from "@playwright/test";
import { loginSeed } from "./helpers";

test("owner creates a client and the new record appears in the operational view", async ({ page }) => {
  await loginSeed(page);
  await page.goto("/app/clients");
  await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();
  await page.getByRole("button", { name: /Novo cliente/i }).click();

  const name = `E2E Studio ${Date.now()}`;
  const dialog = page.getByRole("dialog", { name: /Novo cliente/i });
  await dialog.getByLabel("Nome").fill(name);
  await dialog.getByLabel("Empresa").fill("FlowDesk QA");
  await dialog.getByRole("button", { name: /Criar cliente/i }).click();

  await expect(page.getByText(name, { exact: true })).toBeVisible();
});

test("seed task board renders all five operational states", async ({ page }) => {
  await loginSeed(page);
  await page.goto("/app/board");
  await expect(page.getByText("Backlog", { exact: true })).toBeVisible();
  await expect(page.getByText("A fazer", { exact: true })).toBeVisible();
  await expect(page.getByText("Em andamento", { exact: true })).toBeVisible();
  await expect(page.getByText("Revisão", { exact: true })).toBeVisible();
  await expect(page.getByText("Concluído", { exact: true })).toBeVisible();
});
