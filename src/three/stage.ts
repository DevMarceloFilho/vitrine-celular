import {
  ACESFilmicToneMapping,
  DirectionalLight,
  HemisphereLight,
  type Material,
  Mesh,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Texture,
  WebGLRenderer,
} from "three";

export interface Stage {
  scene: Scene;
  camera: PerspectiveCamera;
  /** Agenda um único render no próximo frame (render sob demanda, sem loop contínuo). */
  requestRender(): void;
  /** Chamado logo depois de cada render, no mesmo frame (ex.: posicionar rótulos HTML). */
  onRender(callback: () => void): void;
  /** Render síncrono (usado para capturar os pôsteres). */
  renderNow(): void;
  /**
   * Luzes da cena. Luzes diretas em vez de ambiente PMREM: o PMREM compilava shaders de forma
   * síncrona e travava a página por ~600 ms; estas compilam em paralelo com o resto no `compile()`.
   */
  buildLighting(): void;
  /** Compila os shaders da cena em paralelo, sem travar a página (KHR_parallel_shader_compile). */
  compile(): Promise<void>;
  /** Libera tudo e devolve o que ainda restou na GPU (deve ser zero). */
  dispose(): { geometries: number; textures: number };
}

const MAX_PIXEL_RATIO_DESKTOP = 2;
const MAX_PIXEL_RATIO_MOBILE = 1.5;

export function createStage(canvas: HTMLCanvasElement): Stage {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;

  const scene = new Scene();
  let lit = false;
  const buildLighting = () => {
    if (lit) return;
    lit = true;
    const key = new DirectionalLight("#ffffff", 3.2);
    key.position.set(3, 4, 6);
    const rim = new DirectionalLight("#9b8cff", 3); // contraluz violeta da marca
    rim.position.set(-5, 3, -4);
    const fill = new DirectionalLight("#ffffff", 1.2);
    fill.position.set(-4, -2, 5);
    scene.add(new HemisphereLight("#e6e4ff", "#2a2a33", 2.2), key, rim, fill);
  };

  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  let frame = 0;
  const afterRender: (() => void)[] = [];
  const render = () => {
    frame = 0;
    renderer.render(scene, camera);
    for (const callback of afterRender) callback();
  };
  const requestRender = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const maxRatio = width < 768 ? MAX_PIXEL_RATIO_MOBILE : MAX_PIXEL_RATIO_DESKTOP;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxRatio));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    requestRender();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  return {
    scene,
    camera,
    requestRender,
    onRender: (callback) => afterRender.push(callback),
    renderNow: () => {
      cancelAnimationFrame(frame);
      render();
    },
    buildLighting,
    compile: async () => {
      await renderer.compileAsync(scene, camera);
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        object.geometry.dispose();
        const materials: Material[] = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          // O material não libera as próprias texturas (ex.: a CanvasTexture da tela).
          for (const key in material) {
            const value = (material as unknown as Record<string, unknown>)[key];
            if (value instanceof Texture) value.dispose();
          }
          material.dispose();
        }
      });
      renderer.dispose();
      const { geometries, textures } = renderer.info.memory;
      return { geometries, textures };
    },
  };
}
