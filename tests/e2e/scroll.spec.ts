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

test("na cena 'Por dentro', os 4 rótulos aparecem sem se sobrepor", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("data-stage", "ready");

  await scrollToScene(page, "inside");
  const labels = page.locator("[data-label]");
  await expect(labels).toHaveCount(4);
  for (const label of await labels.all()) await expect(label).toHaveCSS("opacity", "1");

  const boxes = await labels.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
  const viewport = page.viewportSize()!;
  for (const b of boxes) {
    expect(b.left).toBeGreaterThanOrEqual(0);
    expect(b.right).toBeLessThanOrEqual(viewport.width);
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const overlap = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      expect(overlap, `rótulos ${i} e ${j} se sobrepõem`).toBe(false);
    }
  }
});

test("os rótulos flutuantes ficam fora da árvore de acessibilidade, e a lista de camadas não", async ({ page }) => {
  await page.goto("./");

  await expect(page.locator("[data-labels]")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#inside").getByRole("listitem")).toHaveCount(4);
});
