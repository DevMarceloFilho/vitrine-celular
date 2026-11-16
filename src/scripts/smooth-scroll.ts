import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Lenis movido pelo ticker do GSAP, para o ScrollTrigger ler a mesma posição de scroll. */
export function initSmoothScroll(): Lenis {
  // respectReducedMotion (padrão true) desliga a suavização com prefers-reduced-motion.
  const lenis = new Lenis({ anchors: true });

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  return lenis;
}
