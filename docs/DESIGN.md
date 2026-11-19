# Direção de design: Vitrine Orbe One

Status: aprovada em 2026-11-16 (direção "premium editorial").

## Trabalho da página

Fazer quem rola sentir um **objeto físico caro**. A página funciona como um tour guiado: cada cena mostra uma coisa só, com calma, e o aparelho é sempre o protagonista. O texto apoia e não compete com ele.

## Referências (evidência, não modelo)

| Referência | O que tirar dela | O que **não** copiar |
|---|---|---|
| Páginas de produto da Nothing | rótulos técnicos pequenos, linhas finas, monocromia com um acento só | tipografia de matriz de pontos, vermelho, layout |
| Páginas de produto da Teenage Engineering | fundo de estúdio claro, ficha técnica em mono, fotos ortogonais | laranja, ilustrações, grade exata |
| Páginas de produto da Bang & Olufsen | ritmo lento, muito espaço vazio, sensação de luxo | fotos, serifas, textos |

## Decisões

- **Estúdio claro, com duas cenas escuras.**
  - O fundo é cinza-quente de estúdio fotográfico, onde o metal e o vidro com reflexos de HDRI parecem foto de produto.
  - "Câmera" e "Por dentro" escurecem a página, como uma virada de capítulo: a cor do fundo muda junto com o scroll.
- **Aparelho realista.**
  - O modelo é feito no Blender, com chanfros e bordas suavizadas de verdade.
  - A luz vem de um HDRI de estúdio CC0 (Poly Haven).
  - Uma sombra de contato suave fica sob o aparelho.
  - Nada de formas primitivas visíveis.
- **Nome por trás do aparelho na abertura.** "ORBE ONE" aparece gigante, atrás do celular, dando profundidade. Nas outras cenas, o texto fica na coluna esquerda e o aparelho à direita.
- **Tipografia.**
  - Inter Tight (variável) nos títulos e no texto.
  - JetBrains Mono nos rótulos técnicos, números de seção (`01 / Design`) e ficha técnica.
- **Movimento.**
  - Títulos revelados por linha, com máscara.
  - Números da ficha técnica que contam até o valor.
  - Transições de cor do fundo.
  - Tudo com easing suave (`power3.out`), sem quique nem elástico. Com movimento reduzido, tudo aparece pronto.
- **Textura.** Grão sutil sobre a página (opacidade ~4%), para tirar a cara de tela lisa.

## Tokens

| Token | Valor | Uso |
|---|---|---|
| `--studio` | `#ebe8e3` | fundo claro (estúdio) |
| `--studio-deep` | `#d9d5ce` | piso / vinheta atrás do aparelho |
| `--night` | `#0d0d0e` | fundo das cenas escuras |
| `--ink` | `#141414` | texto no claro |
| `--paper` | `#f2f0eb` | texto no escuro |
| `--muted` | `#6d6a64` (claro) / `#8f8c86` (escuro) | texto secundário |
| `--line` | `rgb(20 20 20 / 0.12)` | linhas finas |
| `--accent` | `#2b44ff` (cobalto) | só foco, cor ativa e marcações pequenas |

Raio dos cantos: 0 nos blocos e 999px só nos chips de cor. Sem sombras em elementos de interface: a única sombra da página é a do aparelho.

## Padrões rejeitados

Violeta e índigo, degradês chamativos, cards arredondados em grade, glassmorphism, ícones genéricos, CTA de compra (o produto não existe), qualquer elemento que lembre a Apple (fonte SF, notch, ilha, módulo de câmera em triângulo dentro de um quadrado).

## Responsivo

- **Desktop (≥ 1024px):** duas colunas, texto à esquerda e aparelho à direita.
- **Celular:** o aparelho fica no alto, e o texto embaixo, sobre um degradê da cor do fundo.
- **Rótulos técnicos:** no celular viram lista sob o texto.
- **Larguras testadas:** 320, 768, 1024 e 1440px.
