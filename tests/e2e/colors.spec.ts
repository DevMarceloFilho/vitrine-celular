import { test, expect, type Page } from "@playwright/test";

const COLORS = [
  { id: "graphite", name: "Grafite" },
  { id: "sand", name: "Areia" },
  { id: "mist", name: "Névoa" },
];

const pressedButtons = (page: Page) =>
  page.getByRole("group", { name: "Acabamentos" }).locator('button[aria-pressed="true"]');

test("o acabamento inicial é Grafite", async ({ page }) => {
  await page.goto("./");

  await expect(pressedButtons(page)).toHaveText(["Grafite"]);
  await expect(page.locator("html")).toHaveAttribute("data-color", "graphite");
});

test("clicar em cada cor deixa só ela marcada e muda o data-color", async ({ page }) => {
  await page.goto("./");

  for (const color of COLORS) {
    await page.getByRole("button", { name: color.name }).click();

    await expect(pressedButtons(page)).toHaveText([color.name]);
    await expect(page.locator("html")).toHaveAttribute("data-color", color.id);
  }
});

test("as cores funcionam pelo teclado", async ({ page }) => {
  await page.goto("./");

  await page.getByRole("button", { name: "Névoa" }).focus();
  await page.keyboard.press("Space");
  await expect(page.locator("html")).toHaveAttribute("data-color", "mist");

  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-color", "sand");
});

test.describe("sem 3D", () => {
  test.use({ reducedMotion: "reduce" });

  test("os botões continuam trocando o acabamento", async ({ page }) => {
    await page.goto("./");

    await page.getByRole("button", { name: "Areia" }).click();

    await expect(page.locator("html")).toHaveAttribute("data-color", "sand");
  });
});
