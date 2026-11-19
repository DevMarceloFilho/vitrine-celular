import { expect, type Page } from "@playwright/test";

/**
 * Espera o palco 3D ficar pronto. Em telas de toque o 3D só liga no primeiro gesto
 * (toque/scroll), então simulamos esse gesto antes; com mouse ele já carrega sozinho.
 */
export async function ready3D(page: Page): Promise<void> {
  await page.evaluate(() => window.dispatchEvent(new Event("pointerdown")));
  await expect(page.locator("html")).toHaveAttribute("data-stage", "ready");
}
