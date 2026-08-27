import { expect, test } from "@playwright/test";
import { loginSeed } from "./helpers";

test("authenticated shell avoids horizontal document overflow", async ({ page, isMobile }) => {
  await loginSeed(page);
  await page.goto("/app/board");
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(metrics.document).toBeLessThanOrEqual(metrics.viewport + (isMobile ? 2 : 1));

  if (isMobile) {
    const menu = page.getByRole("button", { name: "Abrir navegação" });
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(page.getByRole("link", { name: "Workflows" }).last()).toBeVisible();
  }
});
