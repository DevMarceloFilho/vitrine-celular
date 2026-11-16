import {
  type BufferGeometry,
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  Shape,
  ShapeGeometry,
} from "three";
import { createScreenTexture } from "./screen-texture";

// Medidas em decímetros (1 unidade = 100 mm): 71 × 149 × 7,9 mm.
const WIDTH = 0.71;
const HEIGHT = 1.49;
const DEPTH = 0.079;
const CORNER = 0.11;
const BEVEL = 0.018;
const SCREEN_INSET = 0.025;

/** Módulo de câmera circular (a marca é "Orbe"), no alto da traseira. */
const MODULE = { x: 0, y: HEIGHT / 2 - 0.2, radius: 0.15, depth: 0.012 };
const LENSES: [number, number][] = [
  [-0.06, 0.035],
  [0.06, 0.035],
  [0, -0.065],
];

function roundedRect(width: number, height: number, radius: number): Shape {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

/** O ShapeGeometry usa a posição como UV; normaliza para 0–1 para a textura cobrir a tela inteira. */
function normalizeUVs(geometry: BufferGeometry): BufferGeometry {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox!;
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (position.getX(i) - min.x) / (max.x - min.x), (position.getY(i) - min.y) / (max.y - min.y));
  }
  uv.needsUpdate = true;
  return geometry;
}

export interface Colorway {
  frame: string;
  back: string;
}

export interface Phone {
  group: Group;
  /** Camadas que a vista explodida (V5) separa. */
  layers: { screen: Group; frame: Group };
  setColorway(colorway: Colorway): void;
  materials: { frame: MeshPhysicalMaterial; back: MeshPhysicalMaterial };
}

export function createPhone(): Phone {
  const group = new Group();
  // Escala para a cena ficar com números confortáveis (aparelho com ~3 unidades de altura).
  group.scale.setScalar(2);

  const frameMaterial = new MeshPhysicalMaterial({
    color: new Color("#3a3b40"),
    metalness: 0.85,
    roughness: 0.32,
    clearcoat: 0.6,
    clearcoatRoughness: 0.35,
  });
  const backMaterial = new MeshPhysicalMaterial({
    color: new Color("#2b2c30"),
    metalness: 0.1,
    roughness: 0.55, // vidro fosco
    clearcoat: 0.3,
    clearcoatRoughness: 0.6,
  });
  const lensRingMaterial = new MeshPhysicalMaterial({ color: new Color("#1c1c20"), metalness: 0.9, roughness: 0.25 });
  const lensGlassMaterial = new MeshPhysicalMaterial({
    color: new Color("#0b0b18"),
    metalness: 0,
    roughness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    sheen: 1,
    sheenColor: new Color("#5a4fd6"),
  });

  // Estrutura: corpo metálico, traseira de vidro fosco, módulo de câmera e botões.
  const frame = new Group();
  const bodyDepth = DEPTH - BEVEL * 2;
  const body = new Mesh(
    new ExtrudeGeometry(roundedRect(WIDTH - BEVEL * 2, HEIGHT - BEVEL * 2, CORNER - BEVEL), {
      depth: bodyDepth,
      bevelEnabled: true,
      bevelThickness: BEVEL,
      bevelSize: BEVEL,
      bevelSegments: 4,
      curveSegments: 16,
    }),
    frameMaterial,
  );
  body.position.z = -bodyDepth / 2;
  frame.add(body);

  const back = new Mesh(new ShapeGeometry(roundedRect(WIDTH - 0.03, HEIGHT - 0.03, CORNER - 0.015), 16), backMaterial);
  back.rotation.y = Math.PI;
  back.position.z = -DEPTH / 2 - 0.0005;
  frame.add(back);

  const module = new Mesh(new CylinderGeometry(MODULE.radius, MODULE.radius, MODULE.depth, 64), frameMaterial);
  module.rotation.x = Math.PI / 2;
  module.position.set(MODULE.x, MODULE.y, -DEPTH / 2 - MODULE.depth / 2);
  frame.add(module);

  const moduleBackZ = -DEPTH / 2 - MODULE.depth;
  for (const [dx, dy] of LENSES) {
    const ring = new Mesh(new CylinderGeometry(0.045, 0.045, 0.012, 48), lensRingMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(MODULE.x + dx, MODULE.y + dy, moduleBackZ - 0.006);
    frame.add(ring);

    const glass = new Mesh(new CircleGeometry(0.034, 48), lensGlassMaterial);
    glass.rotation.y = Math.PI;
    glass.position.set(MODULE.x + dx, MODULE.y + dy, moduleBackZ - 0.0125);
    frame.add(glass);
  }

  const flash = new Mesh(new CircleGeometry(0.012, 24), new MeshBasicMaterial({ color: new Color("#f2efe0") }));
  flash.rotation.y = Math.PI;
  flash.position.set(MODULE.x + 0.085, MODULE.y - 0.075, moduleBackZ - 0.0005);
  frame.add(flash);

  const buttonGeometry = (length: number) => new BoxGeometry(0.01, length, 0.03);
  const buttons: [number, number, number][] = [
    [WIDTH / 2 + 0.003, 0.25, 0.16], // liga/desliga (direita)
    [-WIDTH / 2 - 0.003, 0.36, 0.11], // volume + (esquerda)
    [-WIDTH / 2 - 0.003, 0.22, 0.11], // volume − (esquerda)
  ];
  for (const [x, y, length] of buttons) {
    const button = new Mesh(buttonGeometry(length), frameMaterial);
    button.position.set(x, y, 0);
    frame.add(button);
  }
  group.add(frame);

  // Tela: interface fictícia e câmera frontal.
  const screenLayer = new Group();
  const screenTexture = createScreenTexture();
  const screen = new Mesh(
    normalizeUVs(new ShapeGeometry(roundedRect(WIDTH - SCREEN_INSET * 2, HEIGHT - SCREEN_INSET * 2, CORNER - SCREEN_INSET), 16)),
    new MeshBasicMaterial({ map: screenTexture, toneMapped: false }),
  );
  screen.position.z = DEPTH / 2 + 0.0005;
  screenLayer.add(screen);

  const frontCamera = new Mesh(new CircleGeometry(0.018, 32), new MeshBasicMaterial({ color: new Color("#020203") }));
  frontCamera.position.set(0, HEIGHT / 2 - 0.065, DEPTH / 2 + 0.001);
  screenLayer.add(frontCamera);
  group.add(screenLayer);

  return {
    group,
    layers: { screen: screenLayer, frame },
    materials: { frame: frameMaterial, back: backMaterial },
    setColorway({ frame: frameColor, back: backColor }) {
      frameMaterial.color.set(frameColor);
      backMaterial.color.set(backColor);
    },
  };
}
