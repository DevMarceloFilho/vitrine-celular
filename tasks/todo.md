# Tarefas: Vitrine Orbe One

Plano: [plan.md](plan.md) · Spec: [../SPEC.md](../SPEC.md)

Verificação padrão de toda tarefa: `npm run build && npm run check && npx playwright test`.

## Fase 1: Base e risco

### V1: Esqueleto Astro + 7 cenas em HTML + testes de fumaça

**Descrição:** Cria o projeto Astro 7 reaproveitando do portfólio a config, os tokens, as fontes, o i18n, o `LangSwitch` e o Playwright, com `base: "/vitrine-celular"`. As 7 cenas entram como seções HTML com o texto PT/EN e as especificações fictícias, ainda sem 3D.

**Aceite:**
- [x] `/vitrine-celular/` e `/vitrine-celular/en/` carregam com as 7 seções, o `lang` certo e sem erro no console
- [x] O seletor de idioma funciona sob a base
- [x] `grep -riE "iphone|apple" src/` não encontra nada

> Feita em 2026-11-16: 21 testes (5 de unidade + 8 E2E × desktop/mobile). Fonte Manrope e acento violeta `#9b8cff`, para a marca Orbe ter identidade própria, diferente do portfólio.

**Dependências:** nenhuma · **Tamanho:** M

**Arquivos:** configs (`package.json`, `astro.config.mjs`, `tsconfig.json`, `playwright.config.ts`), `src/i18n/ui.ts`, `src/layouts/Base.astro`, `src/components/Scene.astro`, `src/pages/{index,en/index}.astro`, `tests/e2e/smoke.spec.ts`

### V2: Palco 3D mínimo com carregamento tardio

**Descrição:** Cria o `stage.ts` (renderer, câmera, `RoomEnvironment`, render sob demanda, resize, `dispose`) e um `phone.ts` provisório (corpo arredondado + tela). O `main.ts` importa o 3D dinamicamente depois do primeiro paint, só com WebGL disponível e movimento liberado.

**Aceite:**
- [x] O canvas aparece atrás do texto e cria um contexto WebGL, sem erro no console
- [x] O chunk do Three.js não é baixado antes do evento `load`, e não é baixado com `reducedMotion: "reduce"`
- [x] Tamanho do JS medido e anotado aqui (inicial e total, em gzip)

> Feita em 2026-11-16. JS inicial: 1,2 KB gzip. Chunk do 3D (`mount`): 140,7 KB gzip. Total: 141,7 KB; sobram ~108 KB para GSAP + ScrollTrigger + Lenis (~45 KB) e o resto do modelo.
> Desvio: o corpo usa `ExtrudeGeometry` com chanfro em vez de `RoundedBoxGeometry`, que só aceita um raio para todas as arestas e deixava os cantos da tela quase retos.

**Dependências:** V1 · **Tamanho:** M

**Arquivos:** `src/three/stage.ts`, `src/three/phone.ts`, `src/scripts/main.ts`, `src/layouts/Base.astro`, `tests/e2e/stage.spec.ts`

### V3: Coreografia pura + timeline ligada ao scroll

**Descrição:** Cria o `choreography.ts` com uma pose por cena e a interpolação entre elas, coberto por testes de unidade. Liga Lenis + ScrollTrigger (`scrub`) ao progresso de cada seção, aplica a pose no palco e escreve `data-scene` no `<body>`.

**Aceite:**
- [x] Testes de unidade: progresso fora de 0–1 é limitado, e a pose no fim de uma cena é igual à do início da próxima (sem salto)
- [x] Rolar até "Por dentro" deixa `data-scene="inside"`, e voltar ao topo deixa `data-scene="intro"`
- [x] Nenhum ScrollTrigger com `markers`, e nenhum ScrollTrigger em tween filho de timeline

> Feita em 2026-11-16. 41 testes, estáveis em 3 rodadas seguidas. JS total: 191,7 KB gzip (meta: 250).
> Desvios: (1) em vez de um tween com `scrub`, um único ScrollTrigger chama `poseAt()` no `onUpdate`; a suavização vem do Lenis e a lógica fica pura e testável. (2) `expect.timeout` de 15 s no Playwright, porque o WebGL em software dos testes demora a compilar shaders com testes em paralelo.
> Bug achado e corrigido: o `gsap.matchMedia()` com só a condição `desktop` nunca rodava no celular; agora há `desktop` e `mobile`, e o `data-layout` no `<html>` é testado.
> Pendências para a V4: no celular o texto passa por cima do aparelho (degradê atrás do texto); a abertura ainda não gira sozinha.

**Dependências:** V2 · **Tamanho:** M

**Arquivos:** `src/three/choreography.ts`, `src/scripts/timeline.ts`, `src/scripts/main.ts`, `tests/e2e/choreography.unit.spec.ts`, `tests/e2e/scroll.spec.ts`

### Checkpoint: Base

- [ ] Build, check e testes passam; o aparelho simples acompanha o scroll; bundle medido; revisão com você

## Fase 2: Cenas

### V4: Modelo completo

**Descrição:** Completa o aparelho:
- traseira com módulo de câmera (3 lentes de vidro);
- botões laterais;
- moldura metálica;
- tela com interface fictícia desenhada em `CanvasTexture`.

As poses de "Design" e "Câmera" passam a mostrar esses detalhes.

**Aceite:**
- [x] Pose "Design" mostra a traseira e pose "Câmera" enquadra o módulo de lentes (conferido no navegador em 1440px e 375px)
- [x] Nenhuma textura ou modelo externo (só código)
- [x] `dispose` libera todas as geometrias, materiais e texturas (contagem de `renderer.info.memory` volta a zero no teste)

> Feita em 2026-11-16. 46 testes. Módulo de câmera circular (identidade "Orbe"), 3 lentes em triângulo e flash; tela de bloqueio em `CanvasTexture` com hora 08:30.
> Também entraram as pendências da V3: balanço da abertura (`idleSway`, puro e testado; único render contínuo, só no topo) e degradê atrás do texto no celular.
> Achados: o ambiente do PMREM é um render target e precisa de `dispose()` inteiro; o renderer r187 guarda um LUT de DFG que só sai no `renderer.dispose()`.

**Dependências:** V3 · **Tamanho:** M

**Arquivos:** `src/three/phone.ts`, `src/three/screen-texture.ts`, `src/three/choreography.ts`, `tests/e2e/stage.spec.ts`

### V5: Vista explodida com rótulos

**Descrição:** Separa o aparelho em 4 camadas (tela, estrutura, bateria, placa), que se afastam com `explode` de 0 a 1. Rótulos HTML acompanham cada camada, projetados de 3D para 2D no mesmo frame do render. As camadas também existem como lista no HTML.

**Aceite:**
- [x] Na cena "Por dentro" com `explode` = 1, os 4 rótulos ficam visíveis e não se sobrepõem em 1440px e 375px
- [x] A lista de camadas é lida por leitor de tela, e os rótulos flutuantes ficam `aria-hidden`

> Feita em 2026-11-16. 50 testes. A cena "Por dentro" virou quase de lado (rotação Y de −1,15 rad) para o afastamento em Z abrir um leque; os rótulos alternam topo e base.
> Achado: com o novo ângulo, `a + (b − a)·t` não devolvia `b` exato em t = 1; a interpolação agora usa `a·(1 − t) + b·t`, exata nas pontas.

**Dependências:** V4 · **Tamanho:** M

**Arquivos:** `src/three/phone.ts`, `src/three/labels.ts`, `src/components/Scene.astro`, `tests/e2e/scroll.spec.ts`

### V6: Seletor de cores

**Descrição:** Cria 3 botões de acabamento na cena "Cores". Clicar troca a cor do material em 0,6 s, atualiza o `aria-pressed` e o `data-color`.

**Aceite:**
- [ ] Clicar em cada botão deixa só ele com `aria-pressed="true"` e muda o `data-color`
- [ ] Os botões funcionam por teclado (Tab + Enter/Espaço) e têm nome acessível com o nome da cor
- [ ] Sem 3D (pôster), os botões trocam o pôster da cor correspondente

**Dependências:** V4 · **Tamanho:** S

**Arquivos:** `src/components/ColorPicker.astro`, `src/three/phone.ts`, `tests/e2e/colors.spec.ts`

### Checkpoint: Cenas

- [ ] Todas as cenas funcionam e revisão visual com você

### V7: Pôsteres e caminhos alternativos

**Descrição:** Cria o `npm run posters`, um script Playwright que captura o canvas na pose de cada cena e em cada cor, salvando em `src/assets/posters/`. Sem WebGL, sem JS ou com movimento reduzido, cada cena mostra o seu pôster via `<Picture>`, sem canvas.

**Aceite:**
- [ ] Com `reducedMotion: "reduce"`: nenhum canvas, os pôsteres visíveis, e o Three.js não é baixado
- [ ] Com JavaScript desligado: pôsteres e todo o texto visíveis
- [ ] Os pôsteres saem em WebP/AVIF com `width`/`height` (sem CLS)

**Dependências:** V5, V6 · **Tamanho:** M

**Arquivos:** `scripts/posters.ts`, `src/components/Scene.astro`, `src/scripts/main.ts`, `src/assets/posters/*`, `tests/e2e/fallback.spec.ts`

### V8: Acessibilidade, SEO e performance

**Descrição:** Roda o axe e corrige o que aparecer. Adiciona `title`, `description` e Open Graph por idioma. Mede Lighthouse mobile, trace de performance no desktop e tamanho do bundle, e corrige até bater as metas.

**Aceite:**
- [ ] O axe não encontra violação séria ou crítica nas duas páginas
- [ ] Lighthouse mobile: Performance ≥ 85, Acessibilidade/Boas práticas/SEO ≥ 95; LCP < 2,5 s; CLS < 0,1
- [ ] JS total ≤ 250 KB gzip; trace do desktop sem tarefas longas (> 50 ms) durante o scroll

**Dependências:** V7 · **Tamanho:** M

**Arquivos:** `tests/e2e/a11y.spec.ts`, `src/layouts/Base.astro`, e o que as medições apontarem

### Checkpoint: Completo

- [ ] Critérios 1–6 da spec atendidos

## Fase 3: Publicação

### V9: Repositório, deploy e README

**Descrição:** Cria o repositório `vitrine-celular` no GitHub (com a sua autorização na hora) e o workflow `withastro/action` + `deploy-pages`. Escreve o README com GIF, stack, decisões e aviso de produto fictício.

**Aceite:**
- [ ] Um push na `main` publica o site em `<usuario>.github.io/vitrine-celular/`, com PT e EN abrindo
- [ ] O README mostra o GIF e os comandos

**Dependências:** V8 · **Tamanho:** S

**Arquivos:** `.github/workflows/deploy.yml`, `astro.config.mjs` (`site`), `README.md`

### V10: Estudo de caso no portfólio

**Descrição:** No repositório do portfólio, cria `content/projects/{pt,en}/orbe-one.md` com problema, decisões, resultado, GIF e links da demo e do código. Depende da T5 do portfólio (coleção de projetos).

**Aceite:**
- [ ] O card e a página do estudo de caso aparecem no portfólio em PT e EN, com links funcionando

**Dependências:** V9, T5 do portfólio · **Tamanho:** S

### Checkpoint: Pronto

- [ ] Critério 7 da spec atendido e site no ar
