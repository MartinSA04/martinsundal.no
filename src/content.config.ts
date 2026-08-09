import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { projectSchema } from "./lib/schema.ts";

const projects = defineCollection({
  /* .mdx as well as .md: the Study Companion entry is authored the way a
     course section is, with the framework's widgets in its body. Every other
     entry stays plain Markdown. */
  loader: glob({ pattern: "*.{md,mdx}", base: "./src/content/projects" }),
  schema: projectSchema,
});

export const collections = { projects };
