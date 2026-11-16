import { defineConfig, devices } from "@playwright/test";

// Porta própria: nunca reaproveita um `npm run dev` e sempre testa o build.
const PORT = 4322;
const BASE = `http://localhost:${PORT}/vitrine-celular/`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  // O WebGL dos testes roda em software (SwiftShader): compilar os shaders com vários
  // testes em paralelo pode passar dos 5 s padrão. Num navegador com GPU leva bem menos.
  expect: { timeout: 15_000 },
  use: { baseURL: BASE },
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT}`,
    url: BASE,
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [
    { name: "unit", testMatch: /.*\.unit\.spec\.ts/ },
    {
      name: "desktop",
      testIgnore: /.*\.unit\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      testIgnore: /.*\.unit\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true },
    },
  ],
});
