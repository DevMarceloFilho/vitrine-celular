// Gera docs/demo.gif para o README: rola a página de cima a baixo com o 3D ligado (GPU da máquina).
// Uso: npm run gif  →  build, preview, ~56 quadros, GIF animado montado com o sharp (já vem com o Astro).
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { build, preview } from "astro";
import sharp from "sharp";

const PORT = 4330;
const PAGE_URL = `http://localhost:${PORT}/vitrine-celular/`;
const OUT_DIR = new URL("../docs/", import.meta.url);
const FRAMES = 56;
const SIZE = { width: 720, height: 450 };

await build({ logLevel: "warn" });
const server = await preview({ logLevel: "warn", server: { port: PORT } });
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(PAGE_URL);
  await page.waitForFunction(() => document.documentElement.dataset.stage === "ready", null, { timeout: 60_000 });
  const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);

  const frames = [];
  for (let i = 0; i < FRAMES; i++) {
    await page.evaluate((top) => window.scrollTo(0, top), Math.round((max * i) / (FRAMES - 1)));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.waitForTimeout(60);
    frames.push(await sharp(await page.screenshot()).resize(SIZE.width, SIZE.height).png().toBuffer());
  }

  // Primeiro e último quadro ficam mais tempo na tela.
  const delay = frames.map((_, i) => (i === 0 || i === frames.length - 1 ? 1200 : 90));
  await mkdir(OUT_DIR, { recursive: true });
  const out = fileURLToPath(new URL("demo.gif", OUT_DIR));
  await sharp(frames, { join: { animated: true } }).gif({ delay, loop: 0, effort: 7 }).toFile(out);
  console.log(`GIF: ${out}`);
} finally {
  await browser.close();
  await server.stop();
}
