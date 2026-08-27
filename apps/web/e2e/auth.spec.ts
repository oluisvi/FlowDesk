import { expect, test } from "@playwright/test";
import { loginSeed } from "./helpers";

test("seed owner signs in, reaches the workspace and can sign out", async ({ page }) => {
  await loginSeed(page);
  await expect(page.getByLabel("Workspace atual")).toContainText("ServAgency");
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("registration surfaces client-side password policy before network submission", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Nome").fill("Nova Pessoa");
  await page.getByLabel("E-mail").fill(`e2e-${Date.now()}@flowdesk.test`);
  await page.getByLabel("Senha").fill("short");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Use pelo menos 12 caracteres")).toBeVisible();
  await expect(page).toHaveURL(/\/register$/);
});
