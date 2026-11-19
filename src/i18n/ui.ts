export const languages = { pt: "Português", en: "English" } as const;
export type Lang = keyof typeof languages;
export const defaultLang: Lang = "pt";

/** Valor do atributo `lang` do <html> por idioma. */
export const htmlLang: Record<Lang, string> = { pt: "pt-BR", en: "en" };

export function isLang(value: string | undefined): value is Lang {
  return value !== undefined && value in languages;
}

/** Caminho equivalente de `pathname` no idioma `to`, dentro de `base`. PT fica na raiz; EN em /en/. */
export function switchLangPath(pathname: string, to: Lang, base = "/"): string {
  const prefix = base.replace(/\/+$/, "");
  const rest = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname;
  const segments = rest.split("/").filter(Boolean);
  if (segments[0] === "en") segments.shift();

  const parts = to === "en" ? ["en", ...segments] : segments;
  return `${prefix}/${parts.length ? `${parts.join("/")}/` : ""}`;
}

/** Cenas da vitrine, na ordem do scroll. */
export const sceneIds = ["intro", "design", "camera", "inside", "colors", "specs", "end"] as const;
export type SceneId = (typeof sceneIds)[number];

export const colorIds = ["graphite", "sand", "mist"] as const;
export type ColorId = (typeof colorIds)[number];
export const defaultColor: ColorId = "graphite";

/** Cores de cada acabamento: estrutura metálica e traseira de vidro fosco. */
export const colorways: Record<ColorId, { frame: string; back: string }> = {
  graphite: { frame: "#56575c", back: "#3e3f44" },
  sand: { frame: "#b9a68a", back: "#d2c4ac" },
  mist: { frame: "#8c9fb2", back: "#aebdcb" },
};

export function isColor(value: string | undefined): value is ColorId {
  return value !== undefined && (colorIds as readonly string[]).includes(value);
}

/** Camadas da vista explodida, de frente para trás. */
export const layerIds = ["screen", "frame", "battery", "board"] as const;
export type LayerId = (typeof layerIds)[number];

interface SceneCopy {
  eyebrow: string;
  title: string;
  body: string;
}

interface Copy {
  meta: { title: string; description: string };
  /** Linha técnica acima do nome e metadados no pé da abertura. */
  hero: { kicker: string; meta: string[] };
  scenes: Record<SceneId, SceneCopy>;
  /** Links do fim da página. */
  links: { label: string; href: string }[];
  layers: string[];
  /** Rótulos curtos que flutuam sobre cada camada no 3D. */
  labels: Record<LayerId, string>;
  colors: Record<ColorId, string>;
  colorsLabel: string;
  specs: { caption: string; rows: [string, string][] };
}

// Todos os dados do aparelho são fictícios.
export const copy: Record<Lang, Copy> = {
  pt: {
    meta: {
      title: "Orbe One · Vitrine (projeto fictício)",
      description: "Página de lançamento de um celular fictício em 3D, feita com Three.js e GSAP por Marcelo Filho.",
    },
    hero: { kicker: "Celular conceito — 2026", meta: ["Projeto fictício", "Portfólio de Marcelo Filho", "Role para explorar"] },
    links: [
      { label: "Código no GitHub", href: "https://github.com/DevMarceloFilho/vitrine-celular" },
      { label: "Mais projetos de Marcelo Filho", href: "https://github.com/DevMarceloFilho" },
    ],
    scenes: {
      intro: { eyebrow: "Novo", title: "Orbe One", body: "Leve na mão. Pesado no que importa." },
      design: {
        eyebrow: "Design",
        title: "Alumínio reciclado e vidro fosco.",
        body: "Bordas suaves que somem na palma e uma traseira que não guarda marca de dedo. 7,9 mm de espessura e 178 g.",
      },
      camera: {
        eyebrow: "Câmera",
        title: "Três câmeras. Luz de sobra.",
        body: "Principal de 50 MP com estabilização no sensor, ultra-angular de 48 MP e teleobjetiva de 12 MP com zoom óptico de 3x.",
      },
      inside: {
        eyebrow: "Por dentro",
        title: "Tudo no lugar certo.",
        body: "Quatro camadas empilhadas em menos de 8 milímetros.",
      },
      colors: { eyebrow: "Cores", title: "Três acabamentos.", body: "Escolha o seu." },
      specs: { eyebrow: "Especificações", title: "Ficha técnica.", body: "Os números de um aparelho que só existe aqui." },
      end: {
        eyebrow: "Fim",
        title: "O Orbe One não existe.",
        body: "É um produto fictício, criado por Marcelo Filho como projeto de portfólio para mostrar 3D e animação no scroll.",
      },
    },
    layers: ["Tela OLED de 6,3\" a 120 Hz", "Estrutura em alumínio", "Bateria de 4.800 mAh", "Placa com o chip Núcleo N1"],
    labels: { screen: "Tela", frame: "Estrutura", battery: "Bateria", board: "Placa" },
    colors: { graphite: "Grafite", sand: "Areia", mist: "Névoa" },
    colorsLabel: "Acabamentos",
    specs: {
      caption: "Especificações do Orbe One (fictícias)",
      rows: [
        ["Tela", "6,3\" OLED, 120 Hz"],
        ["Chip", "Núcleo N1"],
        ["Câmeras traseiras", "50 MP + 48 MP + 12 MP (3x)"],
        ["Câmera frontal", "24 MP"],
        ["Bateria", "4.800 mAh, até 2 dias"],
        ["Dimensões", "149 × 71 × 7,9 mm"],
        ["Peso", "178 g"],
      ],
    },
  },
  en: {
    meta: {
      title: "Orbe One · Showcase (fictional product)",
      description: "Launch page for a fictional 3D phone, built with Three.js and GSAP by Marcelo Filho.",
    },
    hero: { kicker: "Concept phone — 2026", meta: ["Fictional product", "Portfolio of Marcelo Filho", "Scroll to explore"] },
    links: [
      { label: "Code on GitHub", href: "https://github.com/DevMarceloFilho/vitrine-celular" },
      { label: "More projects by Marcelo Filho", href: "https://github.com/DevMarceloFilho" },
    ],
    scenes: {
      intro: { eyebrow: "New", title: "Orbe One", body: "Light in the hand. Heavy where it counts." },
      design: {
        eyebrow: "Design",
        title: "Recycled aluminum and frosted glass.",
        body: "Soft edges that disappear in your palm and a back that keeps no fingerprints. 7.9 mm thin, 178 g.",
      },
      camera: {
        eyebrow: "Camera",
        title: "Three cameras. Plenty of light.",
        body: "50 MP main with sensor-shift stabilization, 48 MP ultra wide and 12 MP telephoto with 3x optical zoom.",
      },
      inside: {
        eyebrow: "Inside",
        title: "Everything in its place.",
        body: "Four layers stacked in under 8 millimeters.",
      },
      colors: { eyebrow: "Colors", title: "Three finishes.", body: "Pick yours." },
      specs: { eyebrow: "Specs", title: "Tech specs.", body: "The numbers of a phone that only exists here." },
      end: {
        eyebrow: "The end",
        title: "Orbe One doesn't exist.",
        body: "It's a fictional product, made by Marcelo Filho as a portfolio project to show 3D and scroll animation.",
      },
    },
    layers: ["6.3\" 120 Hz OLED display", "Aluminum frame", "4,800 mAh battery", "Logic board with the Núcleo N1 chip"],
    labels: { screen: "Display", frame: "Frame", battery: "Battery", board: "Board" },
    colors: { graphite: "Graphite", sand: "Sand", mist: "Mist" },
    colorsLabel: "Finishes",
    specs: {
      caption: "Orbe One specifications (fictional)",
      rows: [
        ["Display", "6.3\" OLED, 120 Hz"],
        ["Chip", "Núcleo N1"],
        ["Rear cameras", "50 MP + 48 MP + 12 MP (3x)"],
        ["Front camera", "24 MP"],
        ["Battery", "4,800 mAh, up to 2 days"],
        ["Dimensions", "149 × 71 × 7.9 mm"],
        ["Weight", "178 g"],
      ],
    },
  },
};
