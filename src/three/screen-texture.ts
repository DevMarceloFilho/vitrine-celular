import { CanvasTexture, SRGBColorSpace } from "three";

/** Proporção da tela do modelo (69,8 × 147,8 mm). */
const SCREEN = { width: 640, height: 1356 };

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const el = document.createElement("canvas");
  el.width = width;
  el.height = height;
  return [el, el.getContext("2d")!];
}

function texture(el: HTMLCanvasElement): CanvasTexture {
  const tex = new CanvasTexture(el);
  tex.colorSpace = SRGBColorSpace;
  // O UV do glTF já vem invertido em V: sem flipY, o topo do canvas fica no topo do aparelho.
  tex.flipY = false;
  tex.anisotropy = 4;
  return tex;
}

/** Tela de bloqueio fictícia: papel de parede em degradê, barra de status, hora e atalhos. */
export function createScreenTexture(): CanvasTexture {
  const { width: w, height: h } = SCREEN;
  const [el, ctx] = canvas(w, h);

  // Papel de parede: luz quente vinda de baixo sobre azul profundo (sem violeta).
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "#0b1426");
  base.addColorStop(0.55, "#13233f");
  base.addColorStop(1, "#2a1c16");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.55, h * 0.86, 10, w * 0.5, h * 0.8, w * 0.95);
  glow.addColorStop(0, "rgba(255, 176, 120, 0.85)");
  glow.addColorStop(0.35, "rgba(214, 96, 64, 0.35)");
  glow.addColorStop(1, "rgba(214, 96, 64, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Barra de status.
  ctx.fillStyle = "#f2f0eb";
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("08:30", 52, 62);
  for (let i = 0; i < 4; i++) ctx.fillRect(w - 168 + i * 12, 72 - (i + 1) * 7, 8, (i + 1) * 7);
  ctx.strokeStyle = "#f2f0eb";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(w - 104, 50, 46, 24);
  ctx.fillRect(w - 100, 54, 32, 16);
  ctx.fillRect(w - 56, 57, 4, 10);

  // Câmera frontal em furo, centralizada.
  ctx.fillStyle = "#020203";
  ctx.beginPath();
  ctx.arc(w / 2, 62, 17, 0, Math.PI * 2);
  ctx.fill();

  // Data e hora.
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(242, 240, 235, 0.82)";
  ctx.font = "500 32px system-ui, sans-serif";
  ctx.fillText("segunda, 16 de novembro", w / 2, 250);
  ctx.fillStyle = "#f2f0eb";
  ctx.font = "200 208px system-ui, sans-serif";
  ctx.fillText("08:30", w / 2, 390);

  // Atalhos e indicador inferior.
  for (const x of [96, w - 96]) {
    ctx.fillStyle = "rgba(242, 240, 235, 0.16)";
    ctx.beginPath();
    ctx.arc(x, h - 150, 46, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(242, 240, 235, 0.9)";
  ctx.beginPath();
  ctx.roundRect(w / 2 - 90, h - 42, 180, 9, 5);
  ctx.fill();

  return texture(el);
}

/** Rótulo técnico da bateria (dados fictícios). */
export function createBatteryTexture(): CanvasTexture {
  const [el, ctx] = canvas(512, 656);
  ctx.fillStyle = "#1e1f26";
  ctx.fillRect(0, 0, 512, 656);
  ctx.strokeStyle = "rgba(242, 240, 235, 0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, 456, 600);
  ctx.fillStyle = "#f2f0eb";
  ctx.textAlign = "left";
  ctx.font = "700 46px system-ui, sans-serif";
  ctx.fillText("ORBE", 56, 108);
  ctx.font = "500 26px ui-monospace, monospace";
  ctx.fillStyle = "rgba(242, 240, 235, 0.75)";
  ["Li-ion polymer", "4.800 mAh · 3,87 V", "18,58 Wh", "Modelo OB-01"].forEach((line, i) => ctx.fillText(line, 56, 180 + i * 42));
  ctx.fillRect(56, 380, 400, 2);
  ctx.font = "400 18px ui-monospace, monospace";
  ctx.fillStyle = "rgba(242, 240, 235, 0.45)";
  ctx.fillText("Produto fictício · não descartar no lixo comum", 56, 420);
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = "rgba(242, 240, 235, 0.5)";
    ctx.strokeRect(56 + i * 84, 460, 64, 64);
  }
  return texture(el);
}

/** Placa de circuito: fundo verde-escuro com trilhas douradas pseudoaleatórias (semente fixa). */
export function createBoardTexture(): CanvasTexture {
  const [el, ctx] = canvas(512, 1056);
  ctx.fillStyle = "#0f2a24";
  ctx.fillRect(0, 0, 512, 1056);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  ctx.strokeStyle = "rgba(201, 164, 92, 0.55)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 90; i++) {
    let x = rand() * 512;
    let y = rand() * 1056;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 4; s++) {
      if (rand() > 0.5) x += (rand() - 0.5) * 160;
      else y += (rand() - 0.5) * 160;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(201, 164, 92, 0.8)";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return texture(el);
}
