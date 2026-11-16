// Script inicial: pequeno de propósito. O 3D (Three.js) só é baixado depois do load,
// e só quando há WebGL e o movimento não está reduzido; caso contrário ficam os pôsteres.

/**
 * Checagem barata: não cria contexto WebGL (criar um só para testar acordava o processo da GPU
 * e gerava uma tarefa longa). Se o contexto real falhar, a montagem cai nos pôsteres.
 */
const hasWebGLApi = () => typeof WebGL2RenderingContext !== "undefined" || typeof WebGLRenderingContext !== "undefined";

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
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !hasWebGLApi()) return;

  const canvas = document.querySelector<HTMLCanvasElement>("canvas[data-stage]");
  if (!canvas) return;

  try {
    const { mountPhoneStage } = await import("../three/mount");
    await mountPhoneStage(canvas);
  } catch {
    // WebGL indisponível ou bloqueado: a página segue com os pôsteres.
    delete document.documentElement.dataset.stage;
  }
}

if (document.readyState === "complete") void start();
else window.addEventListener("load", () => void start(), { once: true });
