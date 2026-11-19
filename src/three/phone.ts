import { Box3, Color, type Group, Mesh, MeshPhysicalMaterial, Object3D, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { layerIds, type LayerId } from "../i18n/ui";
import { createBatteryTexture, createBoardTexture, createScreenTexture } from "./screen-texture";

export interface Colorway {
  frame: string;
  back: string;
}

export interface Phone {
  group: Group;
  /** Camadas da vista explodida, cada uma com um ponto de ancoragem para o rótulo. */
  layers: Record<LayerId, Object3D>;
  anchors: Record<LayerId, Object3D>;
  /** 0 = aparelho fechado; 1 = camadas afastadas em Z. */
  setExplode(amount: number): void;
  setColorway(colorway: Colorway): void;
  materials: { frame: MeshPhysicalMaterial; back: MeshPhysicalMaterial };
}

/** O modelo vem em metros (149 mm de altura); na cena ele fica com ~3 unidades. */
const SCALE = 20;
const NODE: Record<LayerId, string> = { screen: "Layer_Screen", frame: "Layer_Frame", battery: "Layer_Battery", board: "Layer_Board" };
/** Afastamento de cada camada com a explosão completa, em metros (eixo Z = frente). */
const EXPLODE_Z: Record<LayerId, number> = { screen: 0.034, frame: 0, battery: -0.034, board: -0.068 };
const EXPLODE_CENTER = Object.values(EXPLODE_Z).reduce((sum, z) => sum + z, 0) / layerIds.length;

function physical(mesh: Object3D | undefined): MeshPhysicalMaterial | null {
  if (!(mesh instanceof Mesh)) return null;
  return mesh.material instanceof MeshPhysicalMaterial ? mesh.material : null;
}

/** Carrega o GLB modelado no Blender (blender/orbe-one.py) e prepara tela, cores e camadas. */
export async function loadPhone(url: string): Promise<Phone> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const group = gltf.scene;
  group.scale.setScalar(SCALE);

  const byName = (name: string) => group.getObjectByName(name);

  // Tela: preto brilhante com a interface como emissão e vidro (clearcoat) por cima.
  const display = physical(byName("Display"));
  if (display) {
    display.color.set("#000000");
    display.emissive = new Color("#ffffff");
    display.emissiveMap = createScreenTexture();
    display.emissiveIntensity = 0.9;
    display.roughness = 0.08;
    display.clearcoat = 1;
    display.clearcoatRoughness = 0.02;
  }
  const battery = physical(byName("Battery"));
  if (battery) battery.map = createBatteryTexture();
  const board = physical(byName("Board"));
  if (board) board.map = createBoardTexture();

  const frame = physical(byName("Frame"));
  const back = physical(byName("BackGlass"));
  if (!frame || !back) throw new Error("orbe-one.glb sem os materiais FrameMetal/BackGlass");

  const layers = {} as Record<LayerId, Object3D>;
  const restZ = {} as Record<LayerId, number>;
  for (const id of layerIds) {
    const node = byName(NODE[id]);
    if (!node) throw new Error(`orbe-one.glb sem o nó ${NODE[id]}`);
    layers[id] = node;
    restZ[id] = node.position.z;
  }

  // Rótulos alternam entre o topo e a base das camadas, para não se encostarem.
  group.updateMatrixWorld(true);
  const anchors = {} as Record<LayerId, Object3D>;
  const box = new Box3();
  const size = new Vector3();
  const center = new Vector3();
  layerIds.forEach((id, i) => {
    box.setFromObject(layers[id]).getSize(size);
    box.getCenter(center);
    const anchor = new Object3D();
    const local = layers[id].worldToLocal(center.clone().setY(center.y + (i % 2 === 0 ? 1 : -1) * (size.y / 2 + 0.2)));
    anchor.position.copy(local);
    layers[id].add(anchor);
    anchors[id] = anchor;
  });

  return {
    group,
    layers,
    anchors,
    setExplode(amount) {
      for (const id of layerIds) layers[id].position.z = restZ[id] + EXPLODE_Z[id] * amount;
      group.position.z = -EXPLODE_CENTER * amount * SCALE;
    },
    materials: { frame, back },
    setColorway({ frame: frameColor, back: backColor }) {
      frame.color.set(frameColor);
      back.color.set(backColor);
    },
  };
}
