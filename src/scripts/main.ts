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

/**
 * Telas de toque: o 3D liga no primeiro toque ou scroll. Até lá fica o pôster da abertura (mesma pose),
 * e o scroll por toque é composto fora da thread principal, então segue liso enquanto o 3D monta.
 * Quem abre e sai não gasta bateria nem dados com WebGL. Com mouse, o 3D carrega sozinho após o load.
 */
function scheduleStart(): void {
  if (!matchMedia("(pointer: coarse)").matches) {
    void start();
    return;
  }
  const events = ["pointerdown", "touchstart", "wheel", "keydown", "scroll"] as const;
  const go = () => {
    for (const name of events) window.removeEventListener(name, go);
    void start();
  };
  for (const name of events) window.addEventListener(name, go, { passive: true, once: true });
}

if (document.readyState === "complete") scheduleStart();
else window.addEventListener("load", scheduleStart, { once: true });
