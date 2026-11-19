import { test, expect, type Page } from "@playwright/test";
import { ready3D } from "./helpers";

/** Arquivos JS baixados antes do evento load, com o tamanho do corpo em bytes. */
const scriptsBeforeLoad = (page: Page) =>
  page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    return performance
      .getEntriesByType("resource")
      .map((r) => r as PerformanceResourceTiming)
      .filter((r) => r.name.endsWith(".js") && r.startTime < nav.loadEventStart)
      .map((r) => ({ name: r.name, bytes: r.encodedBodySize }));
  });

const scriptBytes = (page: Page) =>
  page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((r) => r as PerformanceResourceTiming)
      .filter((r) => r.name.endsWith(".js"))
      .reduce((sum, r) => sum + r.encodedBodySize, 0),
  );

test.describe("com movimento liberado", () => {
  test("o palco 3D fica pronto e o canvas aparece", async ({ page }) => {
    await page.goto("./");

    await ready3D(page);
    await expect(page.locator("canvas[data-stage]")).toBeVisible();
  });

  test("o enquadramento acompanha a largura da tela", async ({ page }) => {
    await page.goto("./");
    await ready3D(page);
    const expected = page.viewportSize()!.width >= 1024 ? "desktop" : "mobile";

    await expect(page.locator("html")).toHaveAttribute("data-layout", expected);
  });

  test("nenhum JS grande é baixado antes do load", async ({ page }) => {
    await page.goto("./");
    await ready3D(page);

    const early = await scriptsBeforeLoad(page);

    expect(early.filter((s) => s.bytes > 20_000)).toEqual([]);
  });
});

test.describe("com movimento reduzido", () => {
  test.use({ reducedMotion: "reduce" });

  test("o 3D não carrega e o canvas fica escondido", async ({ page }) => {
    await page.goto("./");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("html")).not.toHaveAttribute("data-stage", "ready");
    await expect(page.locator("canvas[data-stage]")).toBeHidden();
    expect(await scriptBytes(page)).toBeLessThan(20_000);
  });
});

test.describe("recursos do 3D", () => {
  test("o dispose libera todas as geometrias e texturas", async ({ page }) => {
    await page.goto("./");
    await ready3D(page);

    const memory = await page.evaluate(() => (window as unknown as { __orbe: { dispose(): unknown } }).__orbe.dispose());

    expect(memory).toEqual({ geometries: 0, textures: 0 });
  });

  test("nenhum shader é usado antes de terminar de compilar (sem travar a página)", async ({ page }) => {
    // Simula o KHR_parallel_shader_compile com compilação lenta: cada programa responde "ainda
    // compilando" às primeiras 20 consultas (~200 ms de espera no compileAsync). Usar o programa antes
    // disso é o que trava a página de verdade: o navegador para tudo até o shader ficar pronto.
    await page.addInitScript(() => {
      (window as unknown as { __early: number }).__early = 0;
      const proto = WebGL2RenderingContext.prototype;
      const COMPLETION_STATUS_KHR = 0x91b1;
      const getExtension = proto.getExtension as (this: WebGL2RenderingContext, name: string) => unknown;
      proto.getExtension = function (this: WebGL2RenderingContext, name: string) {
        const extension = getExtension.call(this, name);
        return name === "KHR_parallel_shader_compile" ? (extension ?? { COMPLETION_STATUS_KHR }) : extension;
      } as typeof proto.getExtension;
      const pending = new WeakMap<WebGLProgram, number>();
      const getProgramParameter = proto.getProgramParameter;
      proto.getProgramParameter = function (program, pname) {
        if (pname !== COMPLETION_STATUS_KHR) return getProgramParameter.call(this, program, pname);
        const left = pending.get(program) ?? 20;
        pending.set(program, Math.max(0, left - 1));
        return left <= 0;
      };
      const useProgram = proto.useProgram;
      proto.useProgram = function (program) {
        if (program && (pending.get(program) ?? 20) > 0) (window as unknown as { __early: number }).__early++;
        return useProgram.call(this, program);
      };
    });
    await page.goto("./");
    await ready3D(page);

    expect(await page.evaluate(() => (window as unknown as { __early: number }).__early)).toBe(0);
  });

  test("o ambiente chega pronto: nenhum shader do PMREM é compilado no navegador", async ({ page }) => {
    // O three escreve "#define SHADER_NAME <nome do material>" em cada shader; o PMREM usa nomes "PMREM...".
    await page.addInitScript(() => {
      const names: string[] = ((window as unknown as { __shaders: string[] }).__shaders = []);
      const original = WebGL2RenderingContext.prototype.shaderSource;
      WebGL2RenderingContext.prototype.shaderSource = function (shader, source) {
        const name = /#define SHADER_NAME (\S+)/.exec(source)?.[1];
        if (name) names.push(name);
        return original.call(this, shader, source);
      };
    });
    await page.goto("./");
    await ready3D(page);

    const shaders = await page.evaluate(() => (window as unknown as { __shaders: string[] }).__shaders);

    expect(shaders.length).toBeGreaterThan(0);
    expect(shaders.filter((name) => name.startsWith("PMREM"))).toEqual([]);
  });
});

test.describe("em tela de toque", () => {
  test("o 3D só liga no primeiro gesto", async ({ page }) => {
    test.skip(!(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)), "regra de telas de toque");
    await page.goto("./");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("html")).not.toHaveAttribute("data-stage", "ready");
    expect(await scriptBytes(page)).toBeLessThan(20_000);

    await ready3D(page);
  });
});
