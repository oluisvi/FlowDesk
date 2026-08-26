import { expect, test } from "@playwright/test";

test("renders the FlowDesk landing shell", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Keep client work moving." }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Request early access" }),
  ).toBeVisible();
});
