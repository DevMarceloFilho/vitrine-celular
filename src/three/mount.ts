import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Group } from "three";
import type { SceneId } from "../i18n/ui";
import { initSmoothScroll } from "../scripts/smooth-scroll";
import { bindScroll } from "../scripts/timeline";
import { idleSway, keyframes, type Pose } from "./choreography";
import { createLabels } from "./labels";
import { createPhone, type Phone } from "./phone";
import { createStage, type Stage } from "./stage";

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
    /** Gancho mínimo para os testes verificarem a liberação de memória. */
    __orbe?: { dispose(): { geometries: number; textures: number } };
  }
}

/** Ponto de entrada do 3D, carregado por import dinâmico depois do load. */
export function mountPhoneStage(canvas: HTMLCanvasElement): PhoneStage {
  const stage = createStage(canvas);
  const phone = createPhone();

  // O "rig" recebe pose e enquadramento; o aparelho guarda só a própria escala.
  const rig = new Group();
  rig.add(phone.group);
  stage.scene.add(rig);

  const labelsRoot = document.querySelector<HTMLElement>("[data-labels]");
  const labels = labelsRoot ? createLabels(labelsRoot, phone.anchors, stage.camera, canvas) : null;
  if (labels) stage.onRender(labels.update);

  let layout = DESKTOP;
  let pose: Pose = keyframes.intro;
  let scene: SceneId = "intro";
  let sway = 0;

  const apply = () => {
    rig.rotation.set(pose.rotationX, pose.rotationY + sway, 0);
    rig.position.set(layout.x, layout.y + pose.positionY * layout.scale, 0);
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
  const scroll = bindScroll((nextPose, nextScene) => {
    pose = nextPose;
    scene = nextScene;
    apply();
    if (document.body.dataset.scene !== scene) document.body.dataset.scene = scene;
  });

  // Balanço da abertura: o único momento com render contínuo, e só enquanto há balanço.
  gsap.ticker.add((time) => {
    const next = scene === "intro" ? idleSway(time, window.scrollY, scroll.gapToNext()) : 0;
    if (next === 0 && sway === 0) return;
    sway = next;
    apply();
  });

  window.__orbe = { dispose: () => stage.dispose() };
  document.documentElement.dataset.stage = "ready";
  return { stage, phone };
}
