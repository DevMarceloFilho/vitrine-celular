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

async function start(): Promise<void> {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !supportsWebGL()) return;

  const canvas = document.querySelector<HTMLCanvasElement>("canvas[data-stage]");
  if (!canvas) return;

  const { mountPhoneStage } = await import("../three/mount");
  mountPhoneStage(canvas);
}

if (document.readyState === "complete") void start();
else window.addEventListener("load", () => void start(), { once: true });
