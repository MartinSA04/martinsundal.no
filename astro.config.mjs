import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://martinsundal.no",
  output: "static",
  trailingSlash: "always",
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/kitchen-sink"),
    }),
  ],
  build: { inlineStylesheets: "auto" },
  vite: { build: { cssCodeSplit: true } },
});
