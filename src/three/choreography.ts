// Coreografia pura: posição do scroll → pose do aparelho. Não importa Three.js nem toca no DOM.
import { sceneIds, type SceneId } from "../i18n/ui";

export interface Pose {
  rotationX: number; // radianos
  rotationY: number; // radianos
  positionY: number; // unidades da cena
  cameraZ: number; // distância da câmera
  explode: number; // 0 = fechado, 1 = camadas separadas
}

/** Pose de cada cena, no instante em que ela está centralizada na tela. */
export const keyframes: Record<SceneId, Pose> = {
  intro: { rotationX: 0.12, rotationY: -0.45, positionY: 0, cameraZ: 9, explode: 0 },
  design: { rotationX: 0.05, rotationY: Math.PI - 0.3, positionY: 0, cameraZ: 8.5, explode: 0 },
  camera: { rotationX: -0.1, rotationY: Math.PI + 0.25, positionY: -1, cameraZ: 5, explode: 0 },
  inside: { rotationX: 0.35, rotationY: Math.PI * 2 - 0.6, positionY: 0, cameraZ: 9.5, explode: 1 },
  colors: { rotationX: 0.1, rotationY: Math.PI * 2 - 0.35, positionY: 0, cameraZ: 8.5, explode: 0 },
  specs: { rotationX: 0, rotationY: Math.PI * 1.5 + 0.15, positionY: 0, cameraZ: 9, explode: 0 },
  end: { rotationX: 0.12, rotationY: Math.PI * 2 - 0.45, positionY: 0, cameraZ: 11, explode: 0 },
};

const ordered = sceneIds.map((id) => keyframes[id]);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const smoothstep = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Posição de scroll em que cada seção fica centralizada na tela, limitada a [0, maxScroll].
 * `sections` vem na ordem da página, com `top` e `height` em pixels do documento.
 */
export function stopsFor(sections: { top: number; height: number }[], viewportHeight: number, maxScroll: number): number[] {
  return sections.map(({ top, height }) => clamp(top + height / 2 - viewportHeight / 2, 0, maxScroll));
}

/** Pose para a posição de scroll `scroll`, interpolando entre as cenas vizinhas. */
export function poseAt(scroll: number, stops: number[]): Pose {
  const count = Math.min(stops.length, ordered.length);
  if (count === 0) return ordered[0];
  if (scroll <= stops[0]) return ordered[0];
  if (scroll >= stops[count - 1]) return ordered[count - 1];

  let i = 0;
  while (i < count - 2 && scroll > stops[i + 1]) i++;
  const span = stops[i + 1] - stops[i];
  const t = smoothstep(span > 0 ? (scroll - stops[i]) / span : 1);
  const from = ordered[i];
  const to = ordered[i + 1];

  return {
    rotationX: lerp(from.rotationX, to.rotationX, t),
    rotationY: lerp(from.rotationY, to.rotationY, t),
    positionY: lerp(from.positionY, to.positionY, t),
    cameraZ: lerp(from.cameraZ, to.cameraZ, t),
    explode: lerp(from.explode, to.explode, t),
  };
}

/**
 * Balanço lento do aparelho na abertura (radianos, somado à rotação Y). Tem força total no topo
 * e some suavemente até a metade do caminho para a próxima cena (`gapToNext` em pixels).
 */
export function idleSway(timeSeconds: number, scroll: number, gapToNext: number): number {
  const fade = gapToNext > 0 ? clamp(scroll / (gapToNext / 2), 0, 1) : 1;
  const weight = 1 - smoothstep(fade);
  if (weight === 0) return 0;
  return Math.sin(timeSeconds * 0.8) * 0.35 * weight;
}

/** Cena cuja parada está mais perto de `scroll`. */
export function sceneAt(scroll: number, stops: number[]): SceneId {
  let nearest = 0;
  stops.forEach((stop, i) => {
    if (Math.abs(stop - scroll) < Math.abs(stops[nearest] - scroll)) nearest = i;
  });
  return sceneIds[Math.min(nearest, sceneIds.length - 1)];
}
