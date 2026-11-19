import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Movimento editorial do texto (só com movimento liberado; sem JS ou com movimento reduzido, tudo
 * já está no lugar):
 * - títulos de cena sobem linha por linha, recortados por máscara, ao entrar na tela;
 * - o nome gigante da abertura sobe e some devagar enquanto a página rola (paralaxe).
 */
export function initReveals(): void {
  gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
    for (const heading of document.querySelectorAll<HTMLElement>("[data-reveal]")) {
      SplitText.create(heading, {
        type: "lines",
        mask: "lines",
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 105,
            duration: 1.1,
            ease: "power4.out",
            stagger: 0.08,
            // Gatilho na seção: o título já está revelado quando a cena chega ao centro da tela.
            scrollTrigger: { trigger: heading.closest("section") ?? heading, start: "top 65%", once: true },
          }),
      });
    }

    gsap.to(".hero-title", {
      yPercent: -35,
      opacity: 0,
      ease: "none",
      scrollTrigger: { trigger: ".scene--intro", start: "top top", end: "bottom top", scrub: true },
    });
  });
}
