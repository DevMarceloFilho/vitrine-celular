/**
 * Como o ambiente pré-calculado (PMREM) é guardado num único .hdr: uma faixa por face do cubo
 * (+X, -X, +Y, -Y, +Z, -Z, de cima para baixo). Em cada faixa, o nível 0 ocupa o topo e os níveis
 * menores ficam lado a lado logo abaixo. Usado pelo `scripts/bake-environment.mjs` (que grava) e pelo
 * stage (que lê). Arquivo sem dependências: o Node o importa direto.
 */
export interface MipRect {
  level: number;
  size: number;
  x: number;
  y: number;
}

export interface PmremLayout {
  /** Lado da face no nível 0. */
  size: number;
  /** Altura da faixa de cada face. */
  blockHeight: number;
  levels: MipRect[];
}

/**
 * O PMREMGenerator do three r187 gera faces de 256 px com 6 níveis (256 → 8 px). O shader escolhe o
 * nível pela rugosidade e pelo índice do nível (não pelo tamanho), então guardamos os mesmos 6 níveis
 * com metade do lado: o HDRI de 512 px não tem detalhe para mais que ~128 px por face.
 */
export const PMREM_LEVELS = 6;
export const PMREM_STORED_SIZE = 128;

export function pmremLayout(size: number, levelCount = PMREM_LEVELS): PmremLayout {
  const levels: MipRect[] = [{ level: 0, size, x: 0, y: 0 }];
  let x = 0;
  for (let level = 1; level < levelCount; level++) {
    const s = size >> level;
    levels.push({ level, size: s, x, y: size });
    x += s;
  }
  return { size, blockHeight: size + size / 2, levels };
}
