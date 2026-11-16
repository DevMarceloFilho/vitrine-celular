import { test, expect } from "@playwright/test";
import { switchLangPath } from "../../src/i18n/ui";

const BASE = "/vitrine-celular";

test("da página PT vai para /en/ dentro da base", () => {
  expect(switchLangPath("/vitrine-celular/", "en", BASE)).toBe("/vitrine-celular/en/");
});

test("da página EN volta para a raiz da base", () => {
  expect(switchLangPath("/vitrine-celular/en/", "pt", BASE)).toBe("/vitrine-celular/");
});

test("aceita caminho e base com ou sem barra final", () => {
  expect(switchLangPath("/vitrine-celular/en", "pt", "/vitrine-celular/")).toBe("/vitrine-celular/");
});

test("funciona sem base", () => {
  expect(switchLangPath("/", "en", "/")).toBe("/en/");
});

test("mantém o caminho quando o idioma de destino é o atual", () => {
  expect(switchLangPath("/vitrine-celular/en/", "en", BASE)).toBe("/vitrine-celular/en/");
});
