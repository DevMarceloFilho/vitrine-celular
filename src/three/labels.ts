import { type Camera, type Object3D, Vector3 } from "three";
import { layerIds, type LayerId } from "../i18n/ui";

export interface Labels {
  /** 0 = escondidos; 1 = visíveis. */
  setVisibility(amount: number): void;
  /** Reposiciona os rótulos; chamado logo depois do render, no mesmo frame. */
  update(): void;
}

/** Rótulos HTML que acompanham as camadas do 3D, projetando cada âncora para a tela. */
export function createLabels(
  container: HTMLElement,
  anchors: Record<LayerId, Object3D>,
  camera: Camera,
  canvas: HTMLCanvasElement,
): Labels {
  const elements = layerIds.map((id) => ({ id, el: container.querySelector<HTMLElement>(`[data-label="${id}"]`) }));
  const point = new Vector3();
  let visibility = 0;

  return {
    setVisibility(amount) {
      visibility = amount;
    },
    update() {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      for (const { id, el } of elements) {
        if (!el) continue;
        el.style.opacity = String(visibility);
        if (visibility === 0) continue;
        anchors[id].getWorldPosition(point).project(camera);
        const x = ((point.x + 1) / 2) * width;
        const y = ((1 - point.y) / 2) * height;
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      }
    },
  };
}
