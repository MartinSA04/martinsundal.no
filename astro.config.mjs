import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export default defineConfig({
  site: "https://martinsundal.no",
  output: "static",
  trailingSlash: "always",
  integrations: [
    /* MDX and server-rendered math exist for exactly one file: the course
       excerpt the Study Companion page shows and renders from the same bytes
       (src/pages/projects/_study-companion-demo.mdx). Both plugins mirror what
       study-companion's own integration puts in `markdown` — the versions are
       pinned to the framework's in package.json — so that excerpt goes through
       the pipeline a real course goes through. Every other page here is plain
       Markdown with no `$` in it, so nothing else changes. */
    mdx(),
    sitemap({
      filter: (page) => !page.includes("/kitchen-sink"),
    }),
  ],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  build: { inlineStylesheets: "auto" },
  vite: { build: { cssCodeSplit: true } },
});
