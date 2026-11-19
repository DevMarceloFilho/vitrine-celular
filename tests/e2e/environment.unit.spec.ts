import { test, expect } from "@playwright/test";
import { FloatType } from "three";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { encodeRGBE, writeRadiance } from "../../scripts/rgbe.mjs";
import { PMREM_STORED_SIZE, pmremLayout } from "../../src/three/pmrem-layout";

test("o layout guarda os 6 níveis do PMREM sem sobreposição dentro da faixa da face", () => {
  const { blockHeight, levels } = pmremLayout(128);

  expect(levels.map((l) => l.size)).toEqual([128, 64, 32, 16, 8, 4]);
  for (const a of levels) {
    expect(a.x + a.size).toBeLessThanOrEqual(128);
    expect(a.y + a.size).toBeLessThanOrEqual(blockHeight);
    for (const b of levels) {
      if (a === b) continue;
      const apart = a.x + a.size <= b.x || b.x + b.size <= a.x || a.y + a.size <= b.y || b.y + b.size <= a.y;
      expect(apart).toBe(true);
    }
  }
});

test("o .hdr gravado com RLE volta igual pelo HDRLoader do three", () => {
  const width = 40;
  const height = 3;
  const rgba = new Float32Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    // Corridas longas (zeros e um valor repetido) e trechos variados, para exercitar os dois pacotes.
    const v = i < 20 ? 0 : i < 60 ? 0.75 : 0.01 + (i % 7) * 3.3;
    rgba.set([v, v * 0.5, v * 0.25, 1], i * 4);
  }

  const file = writeRadiance(encodeRGBE(rgba, width, height), width, height);
  const loader = new HDRLoader().setDataType(FloatType);
  const parsed = loader.parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));

  expect([parsed.width, parsed.height]).toEqual([width, height]);
  const data = parsed.data;
  if (!data) throw new Error("o HDRLoader não devolveu dados");
  for (let i = 0; i < width * height * 4; i++) {
    if (i % 4 === 3) continue;
    expect(Math.abs(data[i] - rgba[i])).toBeLessThanOrEqual(Math.max(rgba[i] * 0.02, 1e-3));
  }
});

test("o ambiente publicado tem as 6 faces no layout esperado", async ({ request }) => {
  const response = await request.get("env/studio_small_09_pmrem.hdr");
  expect(response.ok()).toBe(true);
  const parsed = new HDRLoader().parse(new Uint8Array(await response.body()).buffer);
  const { size, blockHeight } = pmremLayout(PMREM_STORED_SIZE);

  expect([parsed.width, parsed.height]).toEqual([size, blockHeight * 6]);
});
