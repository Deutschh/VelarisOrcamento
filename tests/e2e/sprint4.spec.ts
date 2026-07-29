import { expect, test } from "@playwright/test";

test("renders Sprint 4 public discovery entry points", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /encontre empresas/i })).toBeVisible();
  await expect(page.getByPlaceholder(/cidade ou cep/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /buscar/i })).toBeVisible();
  await page.getByRole("link", { name: "Buscar" }).click();

  await expect(
    page.getByRole("heading", { name: /empresas disponiveis/i }),
  ).toBeVisible();
});

test("renders company registration entry point", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Empresa" }).click();

  await expect(
    page.getByRole("heading", { name: /cadastro empresarial/i }),
  ).toBeVisible();
  await expect(page.getByLabel(/nome comercial/i)).toBeVisible();
});

test("renders admin route shell", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "Empresas" })).toBeVisible();
  await expect(page.getByLabel("Status")).toBeVisible();
});
