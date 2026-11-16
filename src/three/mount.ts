import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Group } from "three";
import { initSmoothScroll } from "../scripts/smooth-scroll";
import { bindScroll } from "../scripts/timeline";
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

/** Ponto de entrada do 3D, carregado por import dinâmico depois do load. */
export function mountPhoneStage(canvas: HTMLCanvasElement): PhoneStage {
  const stage = createStage(canvas);
  const phone = createPhone();

  // O "rig" recebe pose e enquadramento; o aparelho guarda só a própria escala.
  const rig = new Group();
  rig.add(phone.group);
  stage.scene.add(rig);

  let layout = DESKTOP;
  // As duas condições são declaradas: o matchMedia só chama a função quando alguma delas bate.
  gsap.matchMedia().add({ desktop: "(min-width: 1024px)", mobile: "(max-width: 1023.98px)" }, (context) => {
    const isDesktop = Boolean(context.conditions?.desktop);
    layout = isDesktop ? DESKTOP : MOBILE;
    document.documentElement.dataset.layout = isDesktop ? "desktop" : "mobile";
    ScrollTrigger.refresh();
  });

  initSmoothScroll();
  bindScroll((pose, scene) => {
    rig.rotation.set(pose.rotationX, pose.rotationY, 0);
    rig.position.set(layout.x, layout.y + pose.positionY * layout.scale, 0);
    rig.scale.setScalar(layout.scale);
    stage.camera.position.z = pose.cameraZ;
    stage.requestRender();
    if (document.body.dataset.scene !== scene) document.body.dataset.scene = scene;
  });

  document.documentElement.dataset.stage = "ready";
  return { stage, phone };
}
