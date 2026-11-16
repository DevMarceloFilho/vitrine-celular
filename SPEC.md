# Spec: Vitrine de celular (Orbe One)

Status: rascunho, aguardando aprovação.

## Objetivo

Página de lançamento de um celular **fictício**, o "Orbe One" (nome provisório). O scroll conta a história do aparelho em 3D: ele gira, aproxima, se desmonta e troca de cor conforme a pessoa rola.

- **Para quê:** é o primeiro projeto do portfólio de Marcelo Filho e prova o domínio de Three.js com GSAP ScrollTrigger num visual de produto premium.
- **Quem vê:** recrutadores que chegam pelo portfólio, no celular ou no desktop.
- **Sucesso:** está no ar, roda liso, é acessível e tem um estudo de caso no portfólio com links para a demo e o código.

### Cenas (de cima para baixo)

| # | Cena | Conteúdo | O que o 3D faz (ligado ao scroll) |
|---|---|---|---|
| 1 | Abertura | Nome do aparelho e uma frase | Aparelho de frente, girando devagar sozinho; ao rolar, ele sobe e diminui. |
| 2 | Design | Materiais e acabamento (fictícios) | Gira 180° e mostra a traseira. |
| 3 | Câmera | Especificações da câmera | A câmera da cena aproxima do módulo de lentes. |
| 4 | Por dentro | Camadas: tela, estrutura, bateria, placa | Vista explodida: as camadas se separam, cada uma com um rótulo. |
| 5 | Cores | 3 acabamentos | Botões trocam a cor do aparelho (clique, transição de 0,6 s). |
| 6 | Especificações | Tabela de especificações (fictícias) | Aparelho parado, de lado. |
| 7 | Fim | Aviso "produto fictício, projeto de portfólio" e links para o portfólio e o GitHub | Nada. |

### Regras do 3D

- O aparelho é modelado em código, com primitivas do Three.js, materiais físicos e iluminação de ambiente gerada (`RoomEnvironment`). Não usa modelo, foto nem textura baixada.
- O canvas fica fixo atrás do texto, e uma única timeline GSAP com ScrollTrigger (`scrub`) controla rotação, câmera e explosão. O Lenis faz o scroll suave, como no portfólio.
- O texto de cada cena é HTML de verdade, legível por leitores de tela e buscadores, e não é desenhado no canvas.

### Sem WebGL, sem JS ou com movimento reduzido

O site mostra uma imagem estática (pôster) do aparelho em cada cena, sem canvas e sem animação. Os pôsteres são gerados por um script (`npm run posters`) que captura o próprio modelo 3D, então não há imagem de terceiros.

### Fora da v1

Compra, carrinho ou formulário, configurador com mais de 3 cores, modelo 3D externo, áudio e analytics.

## Tech Stack

| Item | Versão (npm em 2026-11-16) | Papel |
|---|---|---|
| Node | ≥ 22.23 | runtime |
| Astro | 7.4 | página estática e i18n (mesma base do portfólio) |
| TypeScript | strict | tipagem |
| Three.js | 0.187 | cena 3D (`RoundedBoxGeometry` e `RoomEnvironment` vêm dos addons do próprio pacote) |
| GSAP | 3.15 (ScrollTrigger) | timeline ligada ao scroll |
| Lenis | 1.3 | scroll suave |
| Playwright + @axe-core/playwright | 1.65 / atual | testes E2E, de acessibilidade e geração dos pôsteres |

## Commands

```bash
npm run dev          # servidor local (http://localhost:4321)
npm run build        # gera dist/
npm run preview      # serve dist/
npm run check        # astro check
npm run posters      # gera os pôsteres estáticos a partir da cena 3D
npx playwright test  # E2E, unidade e acessibilidade (porta 4322)
```

## Project Structure

```
src/
  pages/index.astro, pages/en/index.astro   → a vitrine em PT e EN
  components/                               → Scene (uma por cena), ColorPicker, SpecsTable, LangSwitch
  i18n/ui.ts                                → textos PT/EN e dados fictícios do aparelho
  three/
    phone.ts                                → monta o aparelho (corpo, tela, câmeras, camadas internas)
    stage.ts                                → renderer, câmera, luz, render sob demanda, dispose
    choreography.ts                         → funções puras: progresso do scroll → pose (rotação, câmera, explosão)
  scripts/main.ts                           → decide entre 3D e pôsteres, liga Lenis + timeline
public/posters/                             → pôsteres gerados (um por cena)
scripts/posters.ts                          → gera os pôsteres via Playwright
tests/e2e/                                  → testes
```

## Code Style

Mesmo estilo do portfólio: atributos `data-*` para os ganchos, `gsap.matchMedia()` para movimento reduzido e breakpoints, e só `transform`/`opacity` no DOM. Na parte 3D, a lógica de pose é pura e testável, separada do Three.js:

```ts
// src/three/choreography.ts
export interface Pose {
  rotationY: number; // radianos
  cameraZ: number;
  explode: number; // 0 = fechado, 1 = camadas separadas
}

/** Pose do aparelho para um progresso de scroll de 0 a 1 dentro da cena "Por dentro". */
export function insidePose(progress: number): Pose {
  const p = Math.min(Math.max(progress, 0), 1);
  return { rotationY: Math.PI * 0.15, cameraZ: 6 - p * 1.5, explode: p };
}
```

## Testing Strategy

- **Unidade (Playwright, projeto `unit`):** funções de `choreography.ts`, como limites de 0 e 1 e a continuidade entre cenas.
- **E2E (desktop 1440px e mobile 375px, contra o build):**
  - a página carrega sem erros no console e o canvas cria um contexto WebGL;
  - rolar até "Por dentro" muda o `data-scene` do `<body>` para `inside` (estado observável publicado pela timeline);
  - os botões de cor alternam `aria-pressed` e o `data-color` do aparelho;
  - com movimento reduzido não há canvas e os pôsteres aparecem;
  - sem JavaScript, os pôsteres e todo o texto aparecem;
  - o axe não encontra violação séria ou crítica;
  - não há rolagem horizontal da página.
- **Manual:** Lighthouse mobile no preview e um trace de performance do Chrome no desktop.

## Boundaries

- **Sempre:**
  - rodar build, check e testes antes de commit;
  - textos nos dois idiomas;
  - liberar geometrias, materiais e renderer (`dispose`) ao sair;
  - renderizar só quando algo muda.
- **Perguntar antes:**
  - dependência fora da tabela;
  - qualquer modelo, textura ou imagem externa;
  - mudar a estrutura de cenas.
- **Nunca:**
  - nome, logo, fonte, foto ou texto da Apple ou de outro fabricante real (nada de "iPhone");
  - copiar o layout de uma página de produto real;
  - travar o scroll;
  - commitar segredos.

## Success Criteria

1. **Lighthouse mobile:** Performance ≥ 85, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 95. A meta de performance fica abaixo dos 90 do portfólio por causa do WebGL.
2. **Web Vitals:** LCP < 2,5 s e CLS < 0,1. O LCP é o título, e o Three.js só carrega depois do primeiro paint.
3. **Fluidez:** no desktop, o trace de performance não mostra tarefas longas (> 50 ms) enquanto a página rola.
4. **Tamanho:** JavaScript total ≤ 250 KB gzip.
5. **Testes:** todos os testes da seção acima passam.
6. **Marcas:** `grep -riE "iphone|apple" src/` não encontra nada.
7. **No ar:** publicado no GitHub Pages, com README contendo GIF e um estudo de caso no portfólio linkando a demo e o repositório.

## Open Questions

1. **Nome do aparelho:** proponho "Orbe One". Quer outro?
2. **Idiomas:** assumo PT e EN, como no portfólio.
3. **Especificações:** eu invento números plausíveis (tela, câmera, bateria), sempre marcados como fictícios. Combinado?
4. **Repositório no GitHub:** `vitrine-celular`, com URL `<seu-usuario>.github.io/vitrine-celular/`. Ou outro nome?
