# Implementation Plan: Vitrine Orbe One

Spec: [../SPEC.md](../SPEC.md). Tarefas detalhadas: [todo.md](todo.md).

## Overview

Página Astro 7 em PT/EN com um celular fictício modelado em Three.js. Uma timeline GSAP + ScrollTrigger, com scroll suave pelo Lenis, move o aparelho por 7 cenas. Sem WebGL, sem JS ou com movimento reduzido, cada cena mostra um pôster estático.

A ordem segue o risco: primeiro o esqueleto com o texto das cenas, depois o palco 3D mínimo (WebGL, carregamento tardio, tamanho do bundle) e a coreografia ligada ao scroll. Só então vem o detalhe do modelo.

## Architecture Decisions

- **Mesma base do portfólio.** Config do Astro, tokens, i18n, `LangSwitch`, Lenis + ticker do GSAP e Playwright na porta 4322 são copiados do repositório do portfólio, e não reescritos do zero.
- **`base: "/vitrine-celular"` desde a primeira tarefa.** O site vai morar em `<usuario>.github.io/vitrine-celular/`. Links e assets usam `import.meta.env.BASE_URL`, e os testes rodam com a base, para que um link quebrado apareça cedo.
- **Three.js só por import dinâmico**, depois do primeiro paint e só se WebGL estiver disponível e o movimento não for reduzido. A decisão fica em `scripts/main.ts`. O bundle inicial não leva Three.js.
- **Pose como função pura.** `choreography.ts` transforma o progresso do scroll (0–1) numa `Pose` (rotação, posição da câmera, explosão, cena atual), sem importar Three.js, e por isso é testável em unidade. O `stage.ts` só aplica a pose.
- **Render sob demanda.** `renderer.render()` roda só quando a pose ou a cor mudam (sem loop contínuo) e pausa com a aba oculta. Pixel ratio máximo de 2 no desktop e 1,5 no celular. Sem sombras em tempo real.
- **Aparelho em código:**
  - corpo com `RoundedBoxGeometry` (addons do pacote `three`);
  - tela com `CanvasTexture`, desenhando uma interface fictícia;
  - lentes com cilindros de vidro (`MeshPhysicalMaterial`);
  - luz de `RoomEnvironment` via `PMREMGenerator`.

  Nenhum arquivo externo.
- **Estado observável.** A timeline escreve `data-scene` no `<body>` e o aparelho expõe `data-color`. Os testes leem esse estado em vez de pixels do canvas.
- **Pôsteres sem dependência nova.** Um script Playwright captura o canvas na pose de cada cena e salva PNGs em `src/assets/posters/`. O `<Picture>` do `astro:assets` converte para WebP/AVIF no build, com o sharp que já vem com o Astro.

## Task List

### Fase 1: Base e risco

- [x] V1: Esqueleto Astro + 7 cenas em HTML (PT/EN) + testes de fumaça
- [x] V2: Palco 3D mínimo com carregamento tardio
- [x] V3: Coreografia pura + timeline ligada ao scroll

### Checkpoint: Base

- [x] Build, check e testes passam
- [x] O aparelho (ainda simples) gira e se move com o scroll, em desktop e celular
- [x] Bundle medido: JS inicial sem Three.js; total dentro da meta ou com plano para caber
- [ ] Revisão com você

### Fase 2: Cenas

- [ ] V4: Modelo completo (traseira, lentes, botões, materiais, tela)
- [ ] V5: Vista explodida com rótulos
- [ ] V6: Seletor de cores

### Checkpoint: Cenas

- [ ] Todas as cenas funcionam; revisão visual com você

- [ ] V7: Pôsteres e caminhos sem WebGL, sem JS e com movimento reduzido
- [ ] V8: Acessibilidade, SEO e performance (axe, Lighthouse, trace, tamanho do bundle)

### Checkpoint: Completo

- [ ] Critérios 1–6 da spec atendidos

### Fase 3: Publicação

- [ ] V9: Repositório no GitHub, deploy no Pages e README com GIF
- [ ] V10: Estudo de caso no portfólio (entra junto da T5 do portfólio)

### Checkpoint: Pronto

- [ ] Critério 7 da spec atendido e site no ar

## Risks and Mitigations

| Risco | Impacto | Mitigação |
|---|---|---|
| WebGL no Chromium headless é lento ou instável nos testes | Médio | Testes leem `data-scene`/`data-color` e a criação do contexto, nunca pixels; se precisar, flags SwiftShader só no projeto de teste |
| Bundle passa de 250 KB gzip (Three.js ~150 KB + GSAP + Lenis) | Médio | Medir na V2; importar só módulos usados; se não couber, reavaliar a meta com você antes de cortar recurso |
| Queda de FPS em celular fraco | Alto | Render sob demanda, pixel ratio limitado, geometrias com poucos segmentos, sem sombras; testar no perfil mobile do Chrome |
| Rótulos HTML da vista explodida desalinham do 3D | Médio | Projetar a posição 3D→2D só no mesmo frame do render; os rótulos também existem como lista no HTML |
| Links quebram por causa do `base` do GitHub Pages | Médio | `base` configurado na V1 e testes rodando sob ele |
| Lembrar a marca ou o desenho de um produto real | Alto | Formas e nomes próprios; o critério 6 da spec é verificado por `grep` em cada checkpoint |

## Dependências a instalar

`astro`, `three`, `gsap`, `lenis`, `typescript`, `@astrojs/check`, `@types/three`, `@playwright/test`, `@axe-core/playwright`.

O `@types/three` (0.187.0) não estava na spec, mas o Three.js não traz tipos próprios e o TypeScript strict precisa dele. Aprovar este plano inclui aprová-lo.

## Assumido das questões em aberto da spec

Como a spec foi aprovada sem resposta às questões em aberto, sigo os padrões propostos; mudar depois é barato:
- nome "Orbe One";
- PT e EN;
- especificações inventadas e marcadas como fictícias;
- repositório `vitrine-celular`.
