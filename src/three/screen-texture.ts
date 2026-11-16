import { CanvasTexture, SRGBColorSpace } from "three";

/** Tela de bloqueio fictícia desenhada num canvas: papel de parede com um orbe, hora e dock. */
export function createScreenTexture(): CanvasTexture {
  const width = 512;
  const height = 1104;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#1a1540");
  bg.addColorStop(1, "#07060f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const orb = ctx.createRadialGradient(width * 0.62, height * 0.58, 10, width * 0.5, height * 0.6, width * 0.62);
  orb.addColorStop(0, "#d9d2ff");
  orb.addColorStop(0.35, "#9b8cff");
  orb.addColorStop(1, "rgba(155, 140, 255, 0)");
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(width * 0.5, height * 0.6, width * 0.62, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f0efe9";
  ctx.textAlign = "center";
  ctx.font = "600 132px system-ui, sans-serif";
  ctx.fillText("08:30", width / 2, 300);
  ctx.font = "500 30px system-ui, sans-serif";
  ctx.globalAlpha = 0.7;
  ctx.fillText("ORBE", width / 2, 350);
  ctx.globalAlpha = 1;

  const dockY = height - 150;
  ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
  for (let i = 0; i < 4; i++) {
    const x = 64 + i * 104;
    ctx.beginPath();
    ctx.roundRect(x, dockY, 76, 76, 20);
    ctx.fill();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
