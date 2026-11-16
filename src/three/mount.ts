import { createPhone, type Phone } from "./phone";
import { createStage, type Stage } from "./stage";

export interface PhoneStage {
  stage: Stage;
  phone: Phone;
}

/** Ponto de entrada do 3D, carregado por import dinâmico depois do load. */
export function mountPhoneStage(canvas: HTMLCanvasElement): PhoneStage {
  const stage = createStage(canvas);
  const phone = createPhone();
  phone.group.rotation.set(0.12, -0.45, 0);
  stage.scene.add(phone.group);
  stage.requestRender();

  document.documentElement.dataset.stage = "ready";
  return { stage, phone };
}
