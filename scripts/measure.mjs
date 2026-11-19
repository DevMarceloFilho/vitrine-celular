// Mede LCP, CLS, tempo até o 3D e tarefas longas durante o scroll, com a GPU da máquina.
// Uso: npm run build && npm run preview -- --port 4331  (noutro terminal)  →  npm run measure
// O Astro só permite um preview por projeto: feche este antes de rodar os testes.
import { chromium } from "@playwright/test";

const URL = process.env.MEASURE_URL ?? "http://localhost:4331/vitrine-celular/";

const profiles = [
  { name: "desktop", viewport: { width: 1440, height: 900 }, cpu: 1, network: null },
  {
    name: "celular (CPU 4x, 4G lento)",
    viewport: { width: 375, height: 812 },
    cpu: 4,
    network: { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
  },
];

const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });

for (const profile of profiles) {
  const context = await browser.newContext({ viewport: profile.viewport, isMobile: profile.cpu > 1, hasTouch: profile.cpu > 1 });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });
  if (profile.network) await cdp.send("Network.emulateNetworkConditions", profile.network);

  await page.addInitScript(() => {
    window.__perf = { lcp: 0, cls: 0, longTasks: [] };
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__perf.lcp = e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__perf.longTasks.push(`${Math.round(e.duration)}@${Math.round(e.startTime)}`);
    }).observe({ type: "longtask" });
  });

  const start = Date.now();
  await page.goto(URL);
  await page.evaluate(() => window.dispatchEvent(new Event("pointerdown"))); // em toque, o 3D liga no 1º gesto
  await page.waitForFunction(() => document.documentElement.dataset.stage === "ready", null, { timeout: 60_000 });
  const readyMs = Date.now() - start;
  const gpu = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "desconhecida";
  });
  const beforeScroll = await page.evaluate(() => ({ ...window.__perf, longTasks: [...window.__perf.longTasks] }));
  const marks = await page.evaluate(() =>
    performance
      .getEntriesByType("mark")
      .filter((m) => m.name.startsWith("orbe:"))
      .map((m) => `${m.name.slice(5)}@${Math.round(m.startTime)}`),
  );

  // Rola a página inteira com a roda do mouse (passa pelo Lenis), contando frames.
  await page.evaluate(() => {
    window.__perf.longTasks = [];
    window.__frames = 0;
    const tick = () => {
      window.__frames++;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const scrollStart = Date.now();
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 120) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(1500);
  const seconds = (Date.now() - scrollStart) / 1000;
  const during = await page.evaluate(() => ({ longTasks: window.__perf.longTasks, frames: window.__frames }));

  console.log(`\n== ${profile.name}`);
  console.log(`GPU: ${gpu}`);
  console.log(`LCP: ${Math.round(beforeScroll.lcp)} ms · CLS: ${beforeScroll.cls.toFixed(3)} · 3D pronto em ${readyMs} ms`);
  console.log(`Tarefas longas até o 3D (duração@início, ms): ${beforeScroll.longTasks.join(", ") || "nenhuma"}`);
  console.log(`Etapas do 3D (ms): ${marks.join(" → ")}`);
  console.log(`Durante o scroll: ${during.longTasks.length ? during.longTasks.join(", ") + " ms" : "nenhuma tarefa longa"}`);
  console.log(`Frames: ${(during.frames / seconds).toFixed(0)} fps em média`);
  await context.close();
}

await browser.close();
