import { test, expect, type Page } from "@playwright/test";

/** Arquivos JS baixados antes do evento load, com o tamanho do corpo em bytes. */
const scriptsBeforeLoad = (page: Page) =>
  page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    return performance
      .getEntriesByType("resource")
      .map((r) => r as PerformanceResourceTiming)
      .filter((r) => r.name.endsWith(".js") && r.startTime < nav.loadEventStart)
      .map((r) => ({ name: r.name, bytes: r.encodedBodySize }));
  });

const scriptBytes = (page: Page) =>
  page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((r) => r as PerformanceResourceTiming)
      .filter((r) => r.name.endsWith(".js"))
      .reduce((sum, r) => sum + r.encodedBodySize, 0),
  );

test.describe("com movimento liberado", () => {
  test("o palco 3D fica pronto e o canvas aparece", async ({ page }) => {
    await page.goto("./");

    await expect(page.locator("html")).toHaveAttribute("data-stage", "ready");
    await expect(page.locator("canvas[data-stage]")).toBeVisible();
  });

  test("o enquadramento acompanha a largura da tela", async ({ page }) => {
    await page.goto("./");
    const expected = page.viewportSize()!.width >= 1024 ? "desktop" : "mobile";

    await expect(page.locator("html")).toHaveAttribute("data-layout", expected);
  });

  test("nenhum JS grande é baixado antes do load", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator("html")).toHaveAttribute("data-stage", "ready");

    const early = await scriptsBeforeLoad(page);

    expect(early.filter((s) => s.bytes > 20_000)).toEqual([]);
  });
});

test.describe("com movimento reduzido", () => {
  test.use({ reducedMotion: "reduce" });

  test("o 3D não carrega e o canvas fica escondido", async ({ page }) => {
    await page.goto("./");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("html")).not.toHaveAttribute("data-stage", "ready");
    await expect(page.locator("canvas[data-stage]")).toBeHidden();
    expect(await scriptBytes(page)).toBeLessThan(20_000);
  });
});
