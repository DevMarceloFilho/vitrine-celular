import { test, expect } from "@playwright/test";

const SCENES = ["intro", "design", "camera", "inside", "colors", "specs", "end"];

test("a página PT responde 200 e mostra o nome do aparelho", async ({ page }) => {
  const response = await page.goto("./");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Orbe One");
});

test("as 7 cenas aparecem na ordem certa", async ({ page }) => {
  await page.goto("./");

  const ids = await page.locator("[data-scene-id]").evaluateAll((els) => els.map((el) => el.getAttribute("data-scene-id")));
  expect(ids).toEqual(SCENES);
});

test("a página carrega sem erros no console", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("./");
  await page.waitForLoadState("networkidle");

  expect(errors).toEqual([]);
});

test("PT declara lang pt-BR e EN declara lang en", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");

  await page.goto("en/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("o seletor de idioma funciona dentro da base", async ({ page }) => {
  await page.goto("./");

  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/vitrine-celular\/en\/$/);

  await page.getByRole("link", { name: "Português" }).click();
  await expect(page).toHaveURL(/\/vitrine-celular\/$/);
});

test("a tabela de especificações tem legenda e linhas", async ({ page }) => {
  await page.goto("./");

  const table = page.getByRole("table");
  await expect(table.locator("caption")).toBeVisible();
  expect(await table.getByRole("row").count()).toBeGreaterThan(4);
});

test("o fim avisa que o produto é fictício", async ({ page }) => {
  await page.goto("./");

  await expect(page.getByText(/produto fictício/i)).toBeVisible();
});

test("nenhuma página cita marcas reais", async ({ page }) => {
  for (const path of ["./", "en/"]) {
    await page.goto(path);
    expect(await page.content()).not.toMatch(/iphone|apple/i);
  }
});
