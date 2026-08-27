import { expect, test } from "@playwright/test";
import { loginSeed } from "./helpers";

test("workflow studio exposes the visual builder and validation controls", async ({
  page,
  isMobile,
}) => {
  await loginSeed(page);
  await page.goto("/app/workflows");
  await expect(page.getByRole("heading", { name: "Workflows" })).toBeVisible();
  await page.getByText("Client onboarding", { exact: true }).first().click();

  const palette = page.getByLabel("Blocos de workflow");
  if (isMobile) await expect(palette).toBeHidden();
  else await expect(palette).toBeVisible();
  const triggerNode = page.locator(".flow-node").filter({ hasText: "Cliente criado" }).first();
  await triggerNode.click();
  await expect(page.getByText("Inspector", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Validar/i })).toBeVisible();
  await expect(triggerNode.getByText("Cliente criado", { exact: true })).toBeVisible();
});

test("creating a client reaches a persisted successful workflow execution", async ({ page }) => {
  await loginSeed(page);
  await page.goto("/app/workflows");
  const baseline = await page.locator(".execution-row").count();

  await page.goto("/app/clients");
  await page.getByRole("button", { name: /Novo cliente/i }).click();
  const dialog = page.getByRole("dialog", { name: /Novo cliente/i });
  const name = `Workflow Client ${Date.now()}`;
  await dialog.getByLabel("Nome").fill(name);
  await dialog.getByLabel("Empresa").fill("Automation QA");
  await dialog.getByRole("button", { name: /Criar cliente/i }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();

  await page.goto("/app/workflows");
  await expect
    .poll(async () => page.locator(".execution-row").count(), {
      timeout: 20_000,
      message: "a worker should persist a new onboarding execution",
    })
    .toBeGreaterThan(baseline);

  const latest = page.locator(".execution-row").first();
  await expect(latest.getByText("Concluída", { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await latest.click();
  await expect(page.getByRole("heading", { name: /Execução #/i })).toBeVisible();
  await expect(page.locator(".step")).toHaveCount(5);
  await expect(page.getByText("SUCCEEDED", { exact: true }).first()).toBeVisible();
});
