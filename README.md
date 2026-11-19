# Orbe One — vitrine 3D de um celular fictício

Página de lançamento de um celular que não existe, contada pelo scroll. O aparelho, modelado por script no Blender e renderizado com Three.js sob um HDRI de estúdio, gira, mostra a câmera, se desmonta em camadas e troca de cor conforme você rola. O visual é editorial, num estúdio fotográfico claro com duas cenas escuras.

**Demo:** https://devmarcelofilho.github.io/vitrine-celular/ · Código: https://github.com/DevMarceloFilho/vitrine-celular · Projeto de portfólio de Marcelo Filho.

![Rolando a vitrine: o aparelho gira, mostra a câmera, se desmonta e muda de cor](docs/demo.gif)

> O Orbe One, a marca Orbe e todas as especificações são fictícios. Nenhuma marca, imagem ou texto de fabricante real foi usado.

## Destaques

- **Modelo próprio, gerado por código.**
  - `blender/orbe-one.py` monta o aparelho com medidas reais (71 × 149 × 7,9 mm): perfil arredondado com chanfros, módulo de câmera circular com lentes em camadas, botões, porta USB-C, alto-falante e camadas internas.
  - Exporta um GLB de 444 KB, com materiais PBR e clearcoat.
- **Reflexos de verdade.** A luz vem de um HDRI de estúdio CC0 (Poly Haven, `studio_small_09`), reduzido para 512×256 por `scripts/downsample-hdr.mjs` e convertido em ambiente PMREM uma única vez por `npm run bake:env`, com tone mapping PBR Neutral. A tela, o rótulo da bateria e as trilhas da placa são desenhados em canvas.
- **7 cenas ligadas ao scroll.** A pose de cada cena é uma função pura (`poseAt`, `sceneAt`, `stopsFor`), testada em unidade. Um ScrollTrigger aplica a pose, e o Lenis suaviza.
- **Direção editorial** (`docs/DESIGN.md`).
  - O nome "ORBE ONE" gigante fica atrás do aparelho.
  - Índice de cena em mono e títulos revelados por linha (SplitText com máscara).
  - O fundo muda de estúdio para noite nas cenas de câmera e de vista explodida.
  - Grão fotográfico sutil.
- **Funciona sem 3D.** Sem WebGL, sem JavaScript ou com `prefers-reduced-motion`, cada cena mostra um pôster gerado do próprio modelo (`npm run posters`), em AVIF/WebP.
- **Respeita o aparelho.** O JS inicial tem 1,3 KB. Com mouse, o 3D carrega depois do `load`. Em tela de toque, só no primeiro gesto: até lá aparece o pôster da mesma pose, e o scroll por toque segue liso.

## Números

Lighthouse 13.6, no preview local:

| Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| Mobile | 99–100 | 100 | 100 | 100 | 1,9 s | 21 ms | 0 |
| Desktop | 100 | 100 | 100 | 100 | 0,2 s | 19 ms | 0,005 |

No desktop, com o Chrome recém-aberto (GPU e cache de shaders frios), a nota fica entre 84 e 100: o que sobra é o processo da GPU subindo ao criar o contexto WebGL. Antes do ambiente pré-calculado, nas mesmas condições, ficava em 69–75 (TBT ~1 s).

Com `npm run measure` (GPU real, desktop e celular com CPU 4×), não há nenhuma tarefa longa durante o scroll e a página roda a 58–60 fps. No desktop, o 3D fica pronto em ~1 s (antes 2,6 s).

## Decisões que valeram a pena

- **Ambiente pré-calculado.** O `PMREMGenerator` compilava seus shaders de forma síncrona no navegador (~0,9 s de página travada no desktop). Agora `scripts/bake-environment.mjs` gera o cubemap com os 6 níveis de desfoque num Chromium e grava um `.hdr` (320 KB com gzip, o mesmo que o HDRI); o site o carrega direto como textura PMREM, sem shader extra. Os níveis ficam com metade do lado: o shader escolhe o nível pela rugosidade, não pelo tamanho, e o HDRI de 512 px não tem detalhe para mais que isso.
- **Nada é desenhado antes de os shaders compilarem.** Um render no meio do `compileAsync` usava programas ainda incompletos e travava a página esperando por eles (~0,5 s com a GPU fria). O ambiente entra antes da compilação, então nada recompila depois, no meio do scroll.
- **Grão em PNG, não em filtro SVG.** O `feTurbulence` em tela cheia, somado a um `mix-blend-mode` no cabeçalho, repintava a página e custava ~850 ms de TBT no mobile.
- **Nada de criar contexto WebGL "só para testar".** A checagem de suporte acordava o processo da GPU. Agora a checagem é pela API, e se o contexto real falhar a página cai nos pôsteres.
- **Estado observável para os testes.** A página publica `data-scene`, `data-layout`, `data-color` e `data-environment` no DOM, e os testes leem isso em vez de comparar pixels do canvas.

## Stack

Astro 7 · TypeScript (strict) · Three.js 0.187 · GSAP 3.15 (ScrollTrigger, SplitText) · Lenis 1.3 · Blender 5.3 (modelo por script) · Playwright + axe

## Comandos

```bash
npm install
npm run dev          # http://localhost:4321/vitrine-celular/
npm run build        # gera dist/
npm run check        # astro check
npx playwright test  # 93 testes: unidade, E2E desktop/mobile, acessibilidade
npm run posters      # regenera os pôsteres a partir do 3D
npm run gif          # regenera docs/demo.gif
npm run measure      # LCP, CLS, tarefas longas e FPS (com o preview na porta 4331)
npm run bake:env     # pré-calcula o ambiente (rode de novo ao trocar o HDRI ou atualizar o three)
blender -b -P blender/orbe-one.py -- --out public/models/orbe-one.glb   # regenera o modelo
```

O deploy no GitHub Pages roda a cada push na `main` (`.github/workflows/deploy.yml`).

**Créditos:** HDRI "Studio Small 09" de Sergej Majboroda, Poly Haven (CC0).

---

**EN:** A scroll-driven launch page for a fictional phone, modeled by script in Blender and rendered with Three.js under a CC0 studio HDRI, with an editorial art direction. It falls back to static posters without WebGL, JavaScript or with reduced motion, and scores 99–100 on Lighthouse performance, mobile and desktop. Portfolio project by Marcelo Filho.
