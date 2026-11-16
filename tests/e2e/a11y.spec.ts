import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";

const seriousViolations = async (page: Page) => {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.length} nó(s) — ${v.help}`);
};

for (const path of ["./", "en/"]) {
  test(`axe sem violação séria ou crítica em ${path} com 3D`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-stage", "ready");

    expect(await seriousViolations(page)).toEqual([]);
  });

  test.describe("com movimento reduzido", () => {
    test.use({ reducedMotion: "reduce" });

    test(`axe sem violação séria ou crítica em ${path} com pôsteres`, async ({ page }) => {
      await page.goto(path);

      expect(await seriousViolations(page)).toEqual([]);
    });
  });
}

test("cada idioma tem título, descrição e Open Graph próprios", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /Orbe One/);
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "pt_BR");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /^https?:\/\/.+\.(png|jpg|webp)$/);

  await page.goto("en/");
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "en_US");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /fictional/);
});
