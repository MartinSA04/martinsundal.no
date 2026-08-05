import type { APIRoute } from "astro";
import { Resvg } from "@resvg/resvg-js";
import { getCollection } from "astro:content";
import { ogSvg, OG_WIDTH, type OgCard } from "../../lib/og.ts";
import type { World } from "../../lib/schema.ts";

/**
 * Per-page Open Graph cards, rendered at build time.
 *
 * Fonts are passed to resvg explicitly as TTF (converted from the site's woff2
 * by scripts/convert-og-fonts.sh) — resvg has no browser font stack to fall
 * back on, and a card that silently renders in DejaVu is worse than no card.
 */

const FONT_DIR = new URL("../../../scripts/og-fonts/", import.meta.url).pathname;

const BASE_WORLD: World = {
  sub: "#f4f1ea",
  ink: "#0b0b0c",
  hair: "#b8b2a6",
  sig: "#b3431a",
};

const WORK_WORLD: World = {
  sub: "#16181b",
  ink: "#eceef0",
  hair: "#5a6068",
  sig: "#f2c200",
};

export async function getStaticPaths() {
  const projects = await getCollection("projects");

  const paths = projects.map((entry) => ({
    params: { slug: entry.id },
    props: {
      card: {
        index: entry.data.index,
        eyebrow: entry.data.tags[0] ?? "Project",
        title: entry.data.name,
        tags: entry.data.tags,
        world: entry.data.world,
      } satisfies OgCard,
    },
  }));

  paths.push({
    params: { slug: "home" },
    props: {
      card: {
        eyebrow: "Trondheim · NO",
        title: "Martin Sundal Aspås",
        tags: ["Robotics", "Simulation", "Industrial software"],
        world: BASE_WORLD,
      } satisfies OgCard,
    },
  });

  paths.push({
    params: { slug: "work" },
    props: {
      card: {
        eyebrow: "Aker Solutions · Verdal",
        title: "Software for a robotised production line",
        tags: ["Robotics", "Welding automation", "Scanning"],
        world: WORK_WORLD,
      } satisfies OgCard,
    },
  });

  return paths;
}

export const GET: APIRoute = ({ props }) => {
  const svg = ogSvg(props.card as OgCard);

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: OG_WIDTH },
    font: {
      fontDirs: [FONT_DIR],
      loadSystemFonts: false,
      defaultFontFamily: "Archivo",
    },
  });

  const png = resvg.render().asPng();

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
