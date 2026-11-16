// Gera os pôsteres estáticos (sem WebGL, sem JS ou com movimento reduzido) a partir do próprio 3D.
// Uso: npm run posters  →  build, preview, captura cada cena em PNG transparente em src/assets/posters/.
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { build, preview } from "astro";

const PORT = 4330;
const PAGE_URL = `http://localhost:${PORT}/vitrine-celular/?poster`;
const OUT = new URL("../src/assets/posters/", import.meta.url);
const SCENES = ["intro", "design", "camera", "inside", "colors", "specs", "end"];
const COLORS = ["graphite", "sand", "mist"];

await build({ logLevel: "warn" });
const server = await preview({ logLevel: "warn", server: { port: PORT } });
const browser = await chromium.launch();

try {
  const page = await browser.newPage({ viewport: { width: 900, height: 1100 }, deviceScaleFactor: 1 });
  await page.goto(PAGE_URL);
  await page.waitForFunction(() => document.documentElement.dataset.poster === "ready", null, { timeout: 60_000 });
  await mkdir(OUT, { recursive: true });

  for (const scene of SCENES) {
    const colors = scene === "colors" ? COLORS : ["graphite"];
    for (const color of colors) {
      const dataUrl = await page.evaluate(([s, c]) => window.__orbe.snapshot(s, c), [scene, color]);
      const name = scene === "colors" ? `colors-${color}.png` : `${scene}.png`;
      await writeFile(new URL(name, OUT), Buffer.from(dataUrl.split(",")[1], "base64"));
      console.log(`pôster: ${name}`);
    }
  }
} finally {
  await browser.close();
  await server.stop();
}
