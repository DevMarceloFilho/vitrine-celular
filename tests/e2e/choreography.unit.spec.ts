import { test, expect } from "@playwright/test";
import { keyframes, poseAt, sceneAt, stopsFor, type Pose } from "../../src/three/choreography";

const STOPS = [0, 800, 1600, 2400, 3200, 4000, 4800];
const FIELDS: (keyof Pose)[] = ["rotationX", "rotationY", "positionY", "cameraZ", "explode"];

test("antes do topo, a pose é a da abertura", () => {
  expect(poseAt(-500, STOPS)).toEqual(keyframes.intro);
});

test("depois do fim, a pose é a do fim", () => {
  expect(poseAt(99_999, STOPS)).toEqual(keyframes.end);
});

test("em cada parada, a pose é exatamente a da cena", () => {
  expect(poseAt(2400, STOPS)).toEqual(keyframes.inside);
  expect(poseAt(4000, STOPS)).toEqual(keyframes.specs);
});

test("não há salto ao passar de uma cena para a próxima", () => {
  for (const stop of STOPS.slice(1, -1)) {
    const before = poseAt(stop - 0.01, STOPS);
    const after = poseAt(stop + 0.01, STOPS);
    for (const field of FIELDS) expect(Math.abs(before[field] - after[field])).toBeLessThan(1e-3);
  }
});

test("entre duas cenas, a pose fica entre as duas", () => {
  const middle = poseAt(2000, STOPS);
  expect(middle.explode).toBeGreaterThan(keyframes.camera.explode);
  expect(middle.explode).toBeLessThan(keyframes.inside.explode);
});

test("a cena atual é a da parada mais próxima", () => {
  expect(sceneAt(0, STOPS)).toBe("intro");
  expect(sceneAt(2300, STOPS)).toBe("inside");
  expect(sceneAt(4800, STOPS)).toBe("end");
});

test("as paradas centralizam cada seção e respeitam os limites do scroll", () => {
  const sections = [
    { top: 0, height: 900 },
    { top: 900, height: 900 },
    { top: 1800, height: 1200 },
  ];

  expect(stopsFor(sections, 900, 2100)).toEqual([0, 900, 1950]);
});

test("as paradas nunca passam do scroll máximo", () => {
  const sections = [
    { top: 0, height: 900 },
    { top: 900, height: 600 },
  ];

  expect(stopsFor(sections, 900, 600)).toEqual([0, 600]);
});
