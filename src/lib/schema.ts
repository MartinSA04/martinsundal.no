import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "must be a 6-digit hex color");

/**
 * The four custom properties that define a world. Everything visual about a
 * project page derives from these; see src/styles/kernel.css.
 */
export const worldSchema = z.object({
  sub: hex,
  ink: hex,
  hair: hex,
  sig: hex,
});

export const projectSchema = z
  .object({
    /** 01..05, drives the PRJ_0n label and the ordering of the home index. */
    index: z.number().int().min(1).max(5),
    name: z.string().min(1),
    /** Capped because it seeds the meta description. */
    tagline: z.string().min(1).max(160),
    summary: z.string().min(1).max(300),
    world: worldSchema,
    spec: z.array(z.object({ label: z.string(), value: z.string() })).min(1),
    tags: z.array(z.string()).min(1),
    links: z
      .array(
        z.object({
          label: z.string(),
          href: z.url(),
          primary: z.boolean().optional(),
        }),
      )
      .min(1),
    repo: z.url().optional(),
    live: z.url().optional(),
    languages: z.array(z.string()).min(1),
    award: z.string().optional(),
    /** alt is required, so no project page can ship an undescribed image. */
    image: z
      .object({
        src: z.string(),
        alt: z.string().min(1),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .optional(),
    datePublished: z.iso.date(),
    dateModified: z.iso.date(),
  })
  .refine((p) => p.dateModified >= p.datePublished, {
    message: "dateModified must not precede datePublished",
    path: ["dateModified"],
  });

export type Project = z.infer<typeof projectSchema>;
export type World = z.infer<typeof worldSchema>;
