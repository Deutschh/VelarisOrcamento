import { expect, test } from "@playwright/test";

test("renders Sprint 3 entry points", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /ativacao manual/i })).toBeVisible();
  await page.getByRole("link", { name: /cadastrar empresa/i }).click();

  await expect(
    page.getByRole("heading", { name: /cadastro empresarial/i }),
  ).toBeVisible();
  await expect(page.getByLabel(/nome comercial/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /criar cadastro/i })).toBeVisible();
});

test("renders admin route shell", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "Empresas" })).toBeVisible();
  await expect(page.getByLabel("Status")).toBeVisible();
});
