# Orbe One — vitrine 3D de um celular fictício

Página de lançamento de um celular que não existe, contada pelo scroll. O aparelho, modelado por script no Blender e renderizado com Three.js sob um HDRI de estúdio, gira, mostra a câmera, se desmonta em camadas e troca de cor conforme você rola. O visual é editorial, num estúdio fotográfico claro com duas cenas escuras.

**Demo:** https://devmarcelofilho.github.io/vitrine-celular/ · Código: https://github.com/DevMarceloFilho/vitrine-celular · Projeto de portfólio de Marcelo Filho.

![Rolando a vitrine: o aparelho gira, mostra a câmera, se desmonta e muda de cor](docs/demo.gif)

> O Orbe One, a marca Orbe e todas as especificações são fictícios. Nenhuma marca, imagem ou texto de fabricante real foi usado.

## Destaques

- **Modelo próprio, gerado por código.**
  - `blender/orbe-one.py` monta o aparelho com medidas reais (71 × 149 × 7,9 mm): perfil arredondado com chanfros, módulo de câmera circular com lentes em camadas, botões, porta USB-C, alto-falante e camadas internas.
  - Exporta um GLB de 444 KB, com materiais PBR e clearcoat.
- **Reflexos de verdade.** A luz vem de um HDRI de estúdio CC0 (Poly Haven, `studio_small_09`), reduzido para 512×256 por `scripts/downsample-hdr.mjs`, com tone mapping PBR Neutral. A tela, o rótulo da bateria e as trilhas da placa são desenhados em canvas.
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
| Mobile | 99 | 100 | 100 | 100 | 1,8 s | 80 ms | 0,001 |
| Desktop | 80 | 100 | 100 | 100 | 0,2 s | 470 ms | 0,005 |

Com `npm run measure` (GPU real, desktop e celular com CPU 4×), não há nenhuma tarefa longa durante o scroll e a página roda a 58–60 fps. O TBT do desktop vem da geração do ambiente (PMREM) antes de o 3D aparecer; o próximo passo é pré-calcular esse ambiente no build.

## Decisões que valeram a pena

- **Ambiente gerado antes de compilar.** Ligar o HDRI depois que o 3D aparecia obrigava todos os materiais a recompilar no meio do scroll (~1,2 s de travadas). Agora modelo e HDRI baixam juntos, o ambiente é gerado antes e os shaders compilam em paralelo (`compileAsync`).
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
npx playwright test  # 86 testes: unidade, E2E desktop/mobile, acessibilidade
npm run posters      # regenera os pôsteres a partir do 3D
npm run gif          # regenera docs/demo.gif
npm run measure      # LCP, CLS, tarefas longas e FPS (com o preview na porta 4331)
blender -b -P blender/orbe-one.py -- --out public/models/orbe-one.glb   # regenera o modelo
```

O deploy no GitHub Pages roda a cada push na `main` (`.github/workflows/deploy.yml`).

**Créditos:** HDRI "Studio Small 09" de Sergej Majboroda, Poly Haven (CC0).

---

**EN:** A scroll-driven launch page for a fictional phone, modeled by script in Blender and rendered with Three.js under a CC0 studio HDRI, with an editorial art direction. It falls back to static posters without WebGL, JavaScript or with reduced motion, and scores 99 on Lighthouse mobile performance. Portfolio project by Marcelo Filho.
