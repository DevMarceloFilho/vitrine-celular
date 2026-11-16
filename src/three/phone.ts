import { Color, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, Shape, ShapeGeometry } from "three";

// Medidas em decímetros (1 unidade = 100 mm): 71 × 149 × 7,9 mm.
const WIDTH = 0.71;
const HEIGHT = 1.49;
const DEPTH = 0.079;
const CORNER = 0.11;
const BEVEL = 0.018;
const SCREEN_INSET = 0.025;

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

export interface Phone {
  group: Group;
  body: MeshPhysicalMaterial;
}

/** Aparelho provisório da V2: corpo arredondado e tela. Detalhes (câmeras, botões, camadas) chegam na V4. */
export function createPhone(): Phone {
  const group = new Group();
  // Escala para a cena ficar com números confortáveis (aparelho com ~3 unidades de altura).
  group.scale.setScalar(2);

  const bodyMaterial = new MeshPhysicalMaterial({
    color: new Color("#3a3b40"),
    metalness: 0.85,
    roughness: 0.35,
    clearcoat: 0.6,
    clearcoatRoughness: 0.4,
  });
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
    bodyMaterial,
  );
  body.position.z = -bodyDepth / 2;
  group.add(body);

  const screen = new Mesh(
    new ShapeGeometry(roundedRect(WIDTH - SCREEN_INSET * 2, HEIGHT - SCREEN_INSET * 2, CORNER - SCREEN_INSET), 16),
    new MeshBasicMaterial({ color: new Color("#0d0d12") }),
  );
  screen.position.z = DEPTH / 2 + 0.0005;
  group.add(screen);

  return { group, body: bodyMaterial };
}
