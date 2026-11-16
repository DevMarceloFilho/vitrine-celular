// @ts-check
import { defineConfig, fontProviders } from "astro/config";

export default defineConfig({
  // O site mora em devmarcelofilho.github.io/vitrine-celular/
  site: "https://devmarcelofilho.github.io",
  base: "/vitrine-celular",
  // CSS pequeno: embutido no HTML para não bloquear a primeira renderização.
  build: { inlineStylesheets: "always" },
  i18n: {
    locales: ["pt", "en"],
    defaultLocale: "pt",
    routing: { prefixDefaultLocale: false },
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Manrope",
      cssVariable: "--font-sans",
      weights: ["200 800"],
      fallbacks: ["system-ui", "sans-serif"],
    },
  ],
});
