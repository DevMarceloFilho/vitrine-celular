// Pré-calcula o ambiente de estúdio (o PMREM do three) uma única vez, num Chromium, e grava o cubemap
// com os níveis de desfoque num .hdr (layout em src/three/pmrem-layout.ts). No site, o stage só carrega
// esse arquivo: nenhum shader do PMREM é compilado no navegador (eram ~0,9 s de página travada).
// Rode de novo ao trocar o HDRI ou atualizar o three.
// Uso: node scripts/bake-environment.mjs [entrada.hdr] [saida.hdr]
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { chromium } from "@playwright/test";
import { PMREM_STORED_SIZE, pmremLayout } from "../src/three/pmrem-layout.ts";
import { writeRadiance } from "./rgbe.mjs";

const [input = "blender/studio_small_09_512.hdr", output = "public/env/studio_small_09_pmrem.hdr"] = process.argv.slice(2);
const root = process.cwd();

const page = /* html */ `<!doctype html>
<script type="importmap">
  { "imports": { "three": "/node_modules/three/build/three.module.js", "three/addons/": "/node_modules/three/examples/jsm/" } }
</script>
<script type="module">
  import { EquirectangularReflectionMapping, PMREMGenerator, WebGLRenderer } from "three";
  import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
  import { encodeRGBE } from "/scripts/rgbe.mjs";

  window.bake = async (src, { size, blockHeight, levels }) => {
    const renderer = new WebGLRenderer();
    const equirect = await new HDRLoader().loadAsync(src);
    equirect.mapping = EquirectangularReflectionMapping;
    const target = new PMREMGenerator(renderer).fromEquirectangular(equirect);
    const sourceLevels = target.texture.mipmaps.length;
    if (target.width !== size * 2 || sourceLevels !== levels.length) {
      throw new Error("o PMREM do three mudou: " + target.width + " px e " + sourceLevels + " níveis; esperado " + size * 2 + " px e " + levels.length);
    }

    const gl = renderer.getContext();
    gl.bindFramebuffer(gl.FRAMEBUFFER, gl.createFramebuffer());
    const cube = renderer.properties.get(target.texture).__webglTexture;
    const packed = new Float32Array(size * blockHeight * 6 * 4);
    // Um CubeTexture comum é lido espelhado em X em relação ao alvo do PMREM (o WebGLMaterials do three
    // multiplica a direção por diag(-1, 1, 1)). Para compensar: troca as faces ±X e inverte cada linha.
    const sourceFace = [1, 0, 2, 3, 4, 5];
    for (let face = 0; face < 6; face++) {
      for (const { level, size: s, x, y } of levels) {
        const source = s * 2;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + sourceFace[face], cube, level);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("framebuffer incompleto");
        const pixels = new Float32Array(source * source * 4);
        gl.readPixels(0, 0, source, source, gl.RGBA, gl.FLOAT, pixels);
        // Média 2x2 (metade do lado) já com a coluna invertida.
        for (let row = 0; row < s; row++) {
          for (let col = 0; col < s; col++) {
            const to = ((face * blockHeight + y + row) * size + x + col) * 4;
            const sx = (s - 1 - col) * 2;
            for (let c = 0; c < 4; c++) {
              let sum = 0;
              for (const [dy, dx] of [[0, 0], [0, 1], [1, 0], [1, 1]]) sum += pixels[((row * 2 + dy) * source + sx + dx) * 4 + c];
              packed[to + c] = sum / 4;
            }
          }
        }
      }
    }
    const rgbe = encodeRGBE(packed, size, blockHeight * 6);
    let binary = "";
    for (let i = 0; i < rgbe.length; i += 0x8000) binary += String.fromCharCode(...rgbe.subarray(i, i + 0x8000));
    return btoa(binary);
  };
  window.ready = true;
</script>`;

// Servidor mínimo: a página acima e arquivos de dentro do projeto (three, o script RGBE e o HDRI).
const types = { ".js": "text/javascript", ".mjs": "text/javascript", ".ts": "text/javascript" };
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path === "/") return res.writeHead(200, { "content-type": "text/html" }).end(page);
  const file = resolve(root, `.${path}`);
  if (!file.startsWith(root + sep)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    const ext = file.slice(file.lastIndexOf("."));
    res.writeHead(200, { "content-type": types[ext] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;

const layout = pmremLayout(PMREM_STORED_SIZE);

const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  const tab = await browser.newPage();
  tab.on("pageerror", (error) => console.error(error));
  await tab.goto(origin);
  await tab.waitForFunction(() => window.ready === true);
  const base64 = await tab.evaluate(([src, l]) => window.bake(src, l), [`/${input.replaceAll("\\", "/")}`, layout]);
  const rgbe = new Uint8Array(Buffer.from(base64, "base64"));
  const file = writeRadiance(rgbe, layout.size, layout.blockHeight * 6);
  await writeFile(output, file);
  console.log(`${output}: ${layout.size}×${layout.blockHeight * 6}, ${layout.levels.length} níveis, ${Math.round(file.length / 1024)} KB`);
} finally {
  await browser.close();
  server.close();
}
