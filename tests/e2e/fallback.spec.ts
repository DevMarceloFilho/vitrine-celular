import { test, expect } from "@playwright/test";

const SCENES = ["intro", "design", "camera", "inside", "colors", "specs", "end"];

test.describe("com movimento reduzido", () => {
  test.use({ reducedMotion: "reduce" });

  test("cada cena mostra um pôster e não há canvas", async ({ page }) => {
    await page.goto("./");

    await expect(page.locator("canvas[data-stage]")).toBeHidden();
    for (const id of SCENES) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await expect(page.locator(`#${id} img[data-poster]:visible`)).toHaveCount(1);
    }
  });

  test("os pôsteres têm largura e altura definidas (sem salto de layout)", async ({ page }) => {
    await page.goto("./");

    for (const img of await page.locator("img[data-poster]").all()) {
      await expect(img).toHaveAttribute("width", /\d+/);
      await expect(img).toHaveAttribute("height", /\d+/);
    }
  });

  test("trocar a cor troca o pôster da cena Cores", async ({ page }) => {
    await page.goto("./");
    const colors = page.locator("#colors");

    await page.getByRole("button", { name: "Areia" }).click();

    await expect(colors.locator('img[data-poster-color="sand"]')).toBeVisible();
    await expect(colors.locator('img[data-poster-color="graphite"]')).toBeHidden();
  });
});

test.describe("sem JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("pôsteres e todo o texto aparecem", async ({ page }) => {
    await page.goto("./");

    for (const id of SCENES) {
      const scene = page.locator(`#${id}`);
      await scene.scrollIntoViewIfNeeded();
      await expect(scene.locator("img[data-poster]:visible")).toHaveCount(1);
      await expect(scene.getByRole("heading")).toBeVisible();
    }
  });
});

test.describe("com 3D", () => {
  test("os pôsteres somem quando o palco 3D fica pronto", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator("html")).toHaveAttribute("data-stage", "ready");

    await expect(page.locator("img[data-poster]:visible")).toHaveCount(0);
  });
});
