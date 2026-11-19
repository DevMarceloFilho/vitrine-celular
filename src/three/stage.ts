import {
  DirectionalLight,
  EquirectangularReflectionMapping,
  HemisphereLight,
  type Material,
  Mesh,
  NeutralToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Texture,
  WebGLRenderer,
  type WebGLRenderTarget,
} from "three";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";

export interface Stage {
  scene: Scene;
  camera: PerspectiveCamera;
  /** Agenda um único render no próximo frame (render sob demanda, sem loop contínuo). */
  requestRender(): void;
  /** Chamado logo depois de cada render, no mesmo frame (ex.: posicionar rótulos HTML). */
  onRender(callback: () => void): void;
  /** Render síncrono (usado para capturar os pôsteres). */
  renderNow(): void;
  /** Luzes diretas: deixam o aparelho bonito já no primeiro frame, antes do HDRI chegar. */
  buildLighting(): void;
  /**
   * Reflexos reais: carrega o HDRI de estúdio e gera o ambiente (PMREM). O PMREM compila shaders
   * de forma síncrona (~0,2–0,6 s): a página chama isto antes de compilar, com o pôster ainda na tela.
   */
  loadEnvironment(url: string): Promise<void>;
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
  // Tone mapping "neutro" (Khronos PBR Neutral): mantém as cores do produto fiéis, como foto de estúdio.
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new Scene();
  const lights: (DirectionalLight | HemisphereLight)[] = [];
  const buildLighting = () => {
    if (lights.length) return;
    const key = new DirectionalLight("#fff6ec", 2.4);
    key.position.set(4, 5, 6);
    const rim = new DirectionalLight("#dfe7ff", 2.2);
    rim.position.set(-6, 3, -4);
    const fill = new DirectionalLight("#ffffff", 0.8);
    fill.position.set(-4, -2, 5);
    lights.push(new HemisphereLight("#f4f2ee", "#3a3936", 1.6), key, rim, fill);
    scene.add(...lights);
  };

  let envTarget: WebGLRenderTarget | null = null;
  const loadEnvironment = async (url: string) => {
    if (envTarget) return;
    const equirect = await new HDRLoader().loadAsync(url);
    equirect.mapping = EquirectangularReflectionMapping;
    const pmrem = new PMREMGenerator(renderer);
    envTarget = pmrem.fromEquirectangular(equirect);
    equirect.dispose();
    pmrem.dispose();
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 1.1;
    // Com reflexos reais, as luzes diretas viram só realce.
    for (const light of lights) light.intensity *= 0.35;
    requestRender();
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
    loadEnvironment,
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
          // O material não libera as próprias texturas (ex.: as CanvasTextures da tela, bateria e placa).
          for (const key in material) {
            const value = (material as unknown as Record<string, unknown>)[key];
            if (value instanceof Texture) value.dispose();
          }
          material.dispose();
        }
      });
      envTarget?.dispose();
      renderer.dispose();
      const { geometries, textures } = renderer.info.memory;
      return { geometries, textures };
    },
  };
}
