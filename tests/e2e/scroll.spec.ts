import { test, expect, type Page } from "@playwright/test";

const scrollToScene = (page: Page, id: string) =>
  page.evaluate((sceneId) => {
    const section = document.getElementById(sceneId)!;
    const top = section.offsetTop + section.offsetHeight / 2 - window.innerHeight / 2;
    window.scrollTo(0, Math.max(0, top));
  }, id);

test("rolar até 'Por dentro' marca a cena inside, e voltar ao topo marca intro", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("data-stage", "ready");
  await expect(page.locator("body")).toHaveAttribute("data-scene", "intro");

  await scrollToScene(page, "inside");
  await expect(page.locator("body")).toHaveAttribute("data-scene", "inside");

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator("body")).toHaveAttribute("data-scene", "intro");
});

test("a última cena é marcada no fim da página", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("data-stage", "ready");

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

  await expect(page.locator("body")).toHaveAttribute("data-scene", "end");
});
