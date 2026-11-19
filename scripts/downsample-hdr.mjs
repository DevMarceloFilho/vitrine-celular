// Reduz um HDRI Radiance (.hdr) pela metade em cada eixo, com média 2x2 em ponto flutuante.
// Os reflexos do aparelho vêm de um ambiente desfocado (PMREM): 512x256 basta e pesa 1/3 do 1k.
// Uso: node scripts/downsample-hdr.mjs entrada.hdr saida.hdr
import { readFileSync, writeFileSync } from "node:fs";

const [input, output] = process.argv.slice(2);
const buf = readFileSync(input);

// Cabeçalho: linhas de texto até uma linha vazia, depois "-Y altura +X largura".
let pos = 0;
const line = () => {
  const end = buf.indexOf(0x0a, pos);
  const text = buf.subarray(pos, end).toString("latin1");
  pos = end + 1;
  return text;
};
if (!line().startsWith("#?")) throw new Error("não é um arquivo Radiance");
while (line() !== "");
const [, height, , width] = line().split(" ").map((v, i) => (i % 2 ? Number(v) : v));

// Lê as linhas (RLE "novo" ou plano) para RGBE bruto.
const rgbe = new Uint8Array(width * height * 4);
for (let y = 0; y < height; y++) {
  const row = rgbe.subarray(y * width * 4, (y + 1) * width * 4);
  if (buf[pos] === 2 && buf[pos + 1] === 2 && ((buf[pos + 2] << 8) | buf[pos + 3]) === width) {
    pos += 4;
    for (let c = 0; c < 4; c++) {
      for (let x = 0; x < width; ) {
        let count = buf[pos++];
        if (count > 128) {
          count -= 128;
          const value = buf[pos++];
          for (let i = 0; i < count; i++) row[(x++) * 4 + c] = value;
        } else {
          for (let i = 0; i < count; i++) row[(x++) * 4 + c] = buf[pos++];
        }
      }
    }
  } else {
    row.set(buf.subarray(pos, pos + width * 4));
    pos += width * 4;
  }
}

const toFloat = (i) => {
  const e = rgbe[i + 3];
  if (e === 0) return [0, 0, 0];
  const f = 2 ** (e - 136);
  return [rgbe[i] * f, rgbe[i + 1] * f, rgbe[i + 2] * f];
};
const toRgbe = (r, g, b) => {
  const max = Math.max(r, g, b);
  if (max < 1e-32) return [0, 0, 0, 0];
  const e = Math.ceil(Math.log2(max + 1e-32) + 1e-9);
  const f = 256 / 2 ** e;
  return [Math.min(255, Math.floor(r * f)), Math.min(255, Math.floor(g * f)), Math.min(255, Math.floor(b * f)), e + 128];
};

const w2 = width / 2;
const h2 = height / 2;
const out = new Uint8Array(w2 * h2 * 4);
for (let y = 0; y < h2; y++) {
  for (let x = 0; x < w2; x++) {
    const sum = [0, 0, 0];
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const px = toFloat(((y * 2 + dy) * width + (x * 2 + dx)) * 4);
      for (let c = 0; c < 3; c++) sum[c] += px[c] / 4;
    }
    out.set(toRgbe(...sum), (y * w2 + x) * 4);
  }
}

const header = `#?RADIANCE\n# Reduzido por scripts/downsample-hdr.mjs\nFORMAT=32-bit_rle_rgbe\n\n-Y ${h2} +X ${w2}\n`;
writeFileSync(output, Buffer.concat([Buffer.from(header, "latin1"), Buffer.from(out)]));
console.log(`${input} (${width}x${height}) → ${output} (${w2}x${h2}, ${header.length + out.length} B)`);
