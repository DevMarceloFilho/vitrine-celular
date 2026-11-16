// Script inicial: pequeno de propósito. O 3D (Three.js) só é baixado depois do load,
// e só quando há WebGL e o movimento não está reduzido; caso contrário ficam os pôsteres.

function supportsWebGL(): boolean {
  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return gl !== null;
  } catch {
    return false;
  }
}

/**
 * Seletor de acabamento: funciona com ou sem 3D. Marca o botão, grava `data-color` no <html>
 * (que também escolhe o pôster sem 3D) e avisa o 3D pelo evento `orbe:color`.
 */
function initColorPicker(): void {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-color-option]")];
  for (const button of buttons) {
    button.addEventListener("click", () => {
      const color = button.dataset.colorOption;
      if (!color) return;
      for (const other of buttons) other.setAttribute("aria-pressed", String(other === button));
      document.documentElement.dataset.color = color;
      document.dispatchEvent(new CustomEvent("orbe:color", { detail: color }));
    });
  }
}

initColorPicker();

async function start(): Promise<void> {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !supportsWebGL()) return;

  const canvas = document.querySelector<HTMLCanvasElement>("canvas[data-stage]");
  if (!canvas) return;

  const { mountPhoneStage } = await import("../three/mount");
  mountPhoneStage(canvas);
}

if (document.readyState === "complete") void start();
else window.addEventListener("load", () => void start(), { once: true });
