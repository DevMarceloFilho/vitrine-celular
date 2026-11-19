import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Color, Group } from "three";
import { type ColorId, colorways, isColor, type SceneId } from "../i18n/ui";
import { initReveals } from "../scripts/reveal";
import { initSmoothScroll } from "../scripts/smooth-scroll";
import { bindScroll } from "../scripts/timeline";
import { idleSway, keyframes, type Pose } from "./choreography";
import { createLabels } from "./labels";
import { loadPhone, type Phone } from "./phone";
import { createStage, type Stage } from "./stage";

/** Caminho dos arquivos de `public/` dentro da base do site (`/vitrine-celular`). */
const ASSETS = import.meta.env.BASE_URL.replace(/\/+$/, "");

export interface PhoneStage {
  stage: Stage;
  phone: Phone;
}

/** Enquadramento por largura: no desktop o aparelho fica à direita do texto; no celular, acima. */
interface Layout {
  x: number;
  y: number;
  scale: number;
}
const DESKTOP: Layout = { x: 1.3, y: 0, scale: 1 };
const MOBILE: Layout = { x: 0, y: 0.75, scale: 0.8 };

declare global {
  interface Window {
    /** Ganchos mínimos: os testes verificam a memória e o `npm run posters` captura as cenas. */
    __orbe?: {
      dispose(): { geometries: number; textures: number };
      snapshot?(scene: SceneId, color: ColorId): string;
    };
  }
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * Ponto de entrada do 3D, carregado por import dinâmico depois do load. A montagem cede um frame
 * entre as etapas pesadas e compila os shaders em paralelo, para não travar a página de uma vez.
 */
export async function mountPhoneStage(canvas: HTMLCanvasElement): Promise<PhoneStage> {
  // Marcas de performance por etapa (visíveis no painel Performance do DevTools e no `npm run measure`).
  performance.mark("orbe:start");
  const stage = createStage(canvas);
  performance.mark("orbe:renderer");
  await nextFrame();
  stage.buildLighting();
  performance.mark("orbe:lighting");
  // Modelo e HDRI baixam em paralelo. O ambiente (PMREM) é gerado ANTES de compilar: assim os
  // shaders já nascem com reflexo e nada recompila depois, no meio do scroll (eram ~1,2 s de travadas).
  const [phone] = await Promise.all([
    loadPhone(`${ASSETS}/models/orbe-one.glb`),
    stage.loadEnvironment(`${ASSETS}/env/studio_small_09_512.hdr`),
  ]);
  document.documentElement.dataset.environment = "ready";
  performance.mark("orbe:environment");

  // O "rig" recebe pose e enquadramento; o aparelho guarda só a própria escala.
  const rig = new Group();
  rig.add(phone.group);
  stage.scene.add(rig);
  performance.mark("orbe:model");
  await stage.compile();
  performance.mark("orbe:compiled");

  // Modo pôster (?poster): sem scroll; o script pede cada cena e lê o canvas como PNG transparente.
  if (new URLSearchParams(location.search).has("poster")) {
    window.__orbe = {
      dispose: () => stage.dispose(),
      snapshot(sceneId, colorId) {
        const p = keyframes[sceneId];
        rig.rotation.set(p.rotationX, p.rotationY, 0);
        rig.position.set(0, p.positionY, 0);
        phone.setExplode(p.explode);
        phone.setColorway(colorways[colorId]);
        stage.camera.position.z = p.cameraZ;
        stage.renderNow();
        return canvas.toDataURL("image/png");
      },
    };
    document.documentElement.dataset.stage = "ready";
    document.documentElement.dataset.poster = "ready";
    return { stage, phone };
  }

  const labelsRoot = document.querySelector<HTMLElement>("[data-labels]");
  const labels = labelsRoot ? createLabels(labelsRoot, phone.anchors, stage.camera, canvas) : null;
  if (labels) stage.onRender(labels.update);

  let layout = DESKTOP;
  let pose: Pose = keyframes.intro;
  let scene: SceneId = "intro";
  let sway = 0;

  const apply = () => {
    rig.rotation.set(pose.rotationX, pose.rotationY + sway, 0);
    rig.position.set(layout.x * pose.offsetX, layout.y + pose.positionY * layout.scale, 0);
    rig.scale.setScalar(layout.scale);
    phone.setExplode(pose.explode);
    // Os rótulos só aparecem perto da explosão completa (a partir de 60%).
    labels?.setVisibility(Math.min(Math.max((pose.explode - 0.6) / 0.3, 0), 1));
    stage.camera.position.z = pose.cameraZ;
    stage.requestRender();
  };

  // As duas condições são declaradas: o matchMedia só chama a função quando alguma delas bate.
  gsap.matchMedia().add({ desktop: "(min-width: 1024px)", mobile: "(max-width: 1023.98px)" }, (context) => {
    const isDesktop = Boolean(context.conditions?.desktop);
    layout = isDesktop ? DESKTOP : MOBILE;
    document.documentElement.dataset.layout = isDesktop ? "desktop" : "mobile";
    ScrollTrigger.refresh();
  });

  initSmoothScroll();
  const sceneIndex = document.querySelector<HTMLElement>("[data-scene-index]");
  const scroll = bindScroll((nextPose, nextScene) => {
    pose = nextPose;
    scene = nextScene;
    apply();
    if (document.body.dataset.scene === scene) return;
    document.body.dataset.scene = scene;
    // Índice editorial no cabeçalho ("03 / Câmera"); decorativo, o título da seção já diz isso.
    if (sceneIndex) sceneIndex.textContent = document.getElementById(scene)?.dataset.sceneLabel ?? "";
  });
  initReveals();

  // Balanço da abertura: o único momento com render contínuo, e só enquanto há balanço.
  gsap.ticker.add((time) => {
    const next = scene === "intro" ? idleSway(time, window.scrollY, scroll.gapToNext()) : 0;
    if (next === 0 && sway === 0) return;
    sway = next;
    apply();
  });

  // Acabamento: começa no que já está escolhido (o clique pode ter vindo antes do 3D carregar)
  // e depois faz a transição de 0,6 s a cada troca.
  const current = document.documentElement.dataset.color;
  if (isColor(current)) phone.setColorway(colorways[current]);
  document.addEventListener("orbe:color", (event) => {
    const id = (event as CustomEvent<string>).detail;
    if (!isColor(id)) return;
    const targets = [
      [phone.materials.frame.color, new Color(colorways[id].frame)],
      [phone.materials.back.color, new Color(colorways[id].back)],
    ] as const;
    for (const [color, target] of targets) {
      gsap.to(color, { r: target.r, g: target.g, b: target.b, duration: 0.6, ease: "power2.inOut", onUpdate: stage.requestRender });
    }
  });

  window.__orbe = { dispose: () => stage.dispose() };
  document.documentElement.dataset.stage = "ready";
  performance.mark("orbe:ready");
  return { stage, phone };
}
