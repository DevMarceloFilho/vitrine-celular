import {
  ACESFilmicToneMapping,
  type Material,
  Mesh,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Texture,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export interface Stage {
  scene: Scene;
  camera: PerspectiveCamera;
  /** Agenda um único render no próximo frame (render sob demanda, sem loop contínuo). */
  requestRender(): void;
  /** Chamado logo depois de cada render, no mesmo frame (ex.: posicionar rótulos HTML). */
  onRender(callback: () => void): void;
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
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  // O ambiente é um render target: precisa ser liberado inteiro, não só a textura.
  const envTarget = pmrem.fromScene(room, 0.04);
  scene.environment = envTarget.texture;
  room.dispose();
  pmrem.dispose();

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
      envTarget.dispose();
      renderer.dispose();
      const { geometries, textures } = renderer.info.memory;
      return { geometries, textures };
    },
  };
}
