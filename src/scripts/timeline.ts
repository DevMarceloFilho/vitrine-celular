import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { SceneId } from "../i18n/ui";
import { poseAt, sceneAt, stopsFor, type Pose } from "../three/choreography";

gsap.registerPlugin(ScrollTrigger);

/**
 * Liga a posição do scroll à coreografia. As paradas de cada cena são medidas no DOM
 * e refeitas a cada refresh do ScrollTrigger (resize, fontes, conteúdo).
 */
export function bindScroll(onPose: (pose: Pose, scene: SceneId) => void): void {
  let stops: number[] = [];

  const measure = () => {
    const sections = [...document.querySelectorAll<HTMLElement>("[data-scene-id]")].map((el) => {
      const rect = el.getBoundingClientRect();
      return { top: rect.top + window.scrollY, height: rect.height };
    });
    stops = stopsFor(sections, window.innerHeight, ScrollTrigger.maxScroll(window));
  };

  const update = () => {
    const scroll = window.scrollY;
    onPose(poseAt(scroll, stops), sceneAt(scroll, stops));
  };

  ScrollTrigger.create({
    trigger: document.documentElement,
    start: 0,
    end: "max",
    onUpdate: update,
    onRefresh: () => {
      measure();
      update();
    },
  });

  measure();
  update();
}
