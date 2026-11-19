// Grava imagens HDR no formato Radiance (.hdr) com RLE, na mesma convenção que o HDRLoader do three
// lê (valor = byte × 2^(expoente − 128) / 255). Sem dependências.

/** RGBA em ponto flutuante (linear) → RGBE de 4 bytes por pixel; o canal A é ignorado. */
export function encodeRGBE(rgba, width, height) {
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    const max = Math.max(r, g, b);
    if (!(max > 1e-32)) continue; // zero, negativo ou NaN → preto
    const exponent = Math.ceil(Math.log2(max));
    const scale = 255 / 2 ** exponent;
    out[i * 4] = Math.min(255, Math.round(Math.max(0, r) * scale));
    out[i * 4 + 1] = Math.min(255, Math.round(Math.max(0, g) * scale));
    out[i * 4 + 2] = Math.min(255, Math.round(Math.max(0, b) * scale));
    out[i * 4 + 3] = exponent + 128;
  }
  return out;
}

/** Um canal de uma linha → pacotes RLE (corrida: 128 + n, byte; literal: n, bytes). */
function rleChannel(bytes, out) {
  const n = bytes.length;
  let i = 0;
  const runAt = (at) => {
    let run = 1;
    while (at + run < n && run < 127 && bytes[at + run] === bytes[at]) run++;
    return run;
  };
  while (i < n) {
    const run = runAt(i);
    if (run >= 3) {
      out.push(128 + run, bytes[i]);
      i += run;
      continue;
    }
    const start = i;
    while (i < n && i - start < 128 && runAt(i) < 3) i++;
    out.push(i - start);
    for (let k = start; k < i; k++) out.push(bytes[k]);
  }
}

/** RGBE → arquivo .hdr completo (cabeçalho + linhas em RLE "novo"; largura entre 8 e 32767). */
export function writeRadiance(rgbe, width, height) {
  if (width < 8 || width > 0x7fff) throw new Error(`largura ${width} fora do intervalo do RLE`);
  const header = `#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`;
  const body = [];
  const channel = new Uint8Array(width);
  for (let y = 0; y < height; y++) {
    body.push(2, 2, width >> 8, width & 0xff);
    for (let c = 0; c < 4; c++) {
      for (let x = 0; x < width; x++) channel[x] = rgbe[(y * width + x) * 4 + c];
      rleChannel(channel, body);
    }
  }
  return Buffer.concat([Buffer.from(header, "latin1"), Buffer.from(body)]);
}
