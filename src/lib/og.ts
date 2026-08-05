/**
 * Open Graph card composition.
 *
 * Built as SVG from the same micrographics vocabulary the site uses, in the
 * page's own world tokens, then rasterised at build time. Kept pure so the
 * markup can be unit-tested without rendering anything.
 */
import type { World } from "./schema.ts";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export interface OgCard {
  /** IDX_0n label; omitted for pages that are not numbered projects. */
  index?: number;
  eyebrow: string;
  title: string;
  tags: string[];
  world: World;
}

/**
 * Blends two hex colours. `--hair` is tuned for hairlines against a full-size
 * page; as footer text on a card viewed at thumbnail size it disappears, so
 * card metadata is mixed toward `--ink`. resvg has no color-mix().
 */
function blend(from: string, to: string, amount: number): string {
  const parse = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = parse(from);
  const [r2, g2, b2] = parse(to);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * amount);
  return (
    "#" +
    [mix(r1!, r2!), mix(g1!, g2!), mix(b1!, b2!)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );

/** Deterministic bar strip, same FNV-1a hash the Barcode component uses. */
function barcode(seed: string, count: number): number[] {
  let h = 2166136261;
  for (const ch of seed) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return Array.from({ length: count }, (_, i) => {
    h = Math.imul(h ^ i, 16777619);
    return ((h >>> 8) % 3) + 1;
  });
}

/**
 * Rough advance width per character, as a fraction of font size. Archivo
 * SemiBold measures ~0.54em averaged over mixed-case English; capitals are
 * wider, so they are weighted up. Good enough to wrap on, and far cheaper than
 * shaping the text.
 */
function textWidth(text: string, size: number): number {
  let units = 0;
  for (const ch of text) {
    if (ch === " ") units += 0.26;
    else if (/[A-Z]/.test(ch)) units += 0.66;
    else if (/[ilj.,;:'!|]/.test(ch)) units += 0.28;
    else if (/[mwMW]/.test(ch)) units += 0.85;
    else units += 0.54;
  }
  return units * size;
}

/** Wraps to a pixel width, and shrinks the size if it still will not fit. */
function fitTitle(
  text: string,
  maxWidth: number,
  startSize: number,
): { lines: string[]; size: number } {
  for (let size = startSize; size >= 44; size -= 6) {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (textWidth(next, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    if (
      lines.length <= 3 &&
      lines.every((l) => textWidth(l, size) <= maxWidth)
    ) {
      return { lines, size };
    }
  }
  return { lines: [text], size: 44 };
}

export function ogSvg(card: OgCard): string {
  const { world } = card;
  const pad = 72;
  // Footer metadata is legible at thumbnail size; hairlines stay hairlines.
  const meta = blend(world.hair, world.ink, 0.45);
  const contentWidth = OG_WIDTH - pad * 2;

  const { lines: titleLines, size: titleSize } = fitTitle(
    card.title,
    contentWidth,
    96,
  );
  // Bottom-align the block so one-, two- and three-line cards share a baseline.
  const titleBottom = 420;
  const lineHeight = titleSize * 1.08;
  const titleTop = titleBottom - (titleLines.length - 1) * lineHeight;

  const bars = barcode(card.title, 30);
  let barX = pad;
  const barSvg = bars
    .map((w) => {
      const rect = `<rect x="${barX}" y="${OG_HEIGHT - pad - 22}" width="${w}" height="22" fill="${world.hair}"/>`;
      barX += w + 4;
      return rect;
    })
    .join("");
  const barsEnd = barX;

  // Tags share the footer with the site name, so they get a hard budget and
  // any that will not fit are dropped rather than overprinting it.
  const tagY = OG_HEIGHT - pad - 4;
  const tagSize = 21;
  const siteName = "MARTINSUNDAL.NO";
  const tagBudget = OG_WIDTH - pad - textWidth(siteName, tagSize) * 1.35 - 48;
  let tagX = barsEnd + 40;
  const tagSvg = card.tags
    .map((tag) => {
      const label = tag.toUpperCase();
      // Mono advance is uniform: 0.6em plus the tracking.
      const width = label.length * (tagSize * 0.6 + 2.4);
      if (tagX + width > tagBudget) return "";
      const el = `<text x="${tagX}" y="${tagY}" font-family="IBM Plex Mono" font-size="${tagSize}" letter-spacing="2.4" fill="${meta}">${escape(label)}</text>`;
      tagX += width + 32;
      return el;
    })
    .join("");

  const idx =
    card.index !== undefined
      ? `<text x="${pad}" y="${pad + 34}" font-family="IBM Plex Mono" font-size="26" letter-spacing="3" fill="${world.sig}">IDX_${String(card.index).padStart(2, "0")}</text>`
      : "";

  const eyebrowX = card.index !== undefined ? pad + 150 : pad;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="${world.sub}"/>

  <rect x="0" y="0" width="${OG_WIDTH}" height="6" fill="${world.sig}"/>
  <line x1="${pad}" y1="${pad + 62}" x2="${OG_WIDTH - pad}" y2="${pad + 62}" stroke="${world.hair}" stroke-width="1"/>
  <line x1="${pad}" y1="${OG_HEIGHT - pad - 62}" x2="${OG_WIDTH - pad}" y2="${OG_HEIGHT - pad - 62}" stroke="${world.hair}" stroke-width="1"/>

  ${idx}
  <text x="${eyebrowX}" y="${pad + 34}" font-family="IBM Plex Mono" font-size="26" letter-spacing="3" fill="${meta}">${escape(card.eyebrow.toUpperCase())}</text>

  ${titleLines
    .map(
      (line, i) =>
        `<text x="${pad}" y="${titleTop + i * lineHeight}" font-family="Archivo" font-size="${titleSize}" fill="${world.ink}" letter-spacing="-2">${escape(line)}</text>`,
    )
    .join("\n  ")}

  ${barSvg}
  ${tagSvg}

  <text x="${OG_WIDTH - pad}" y="${tagY}" text-anchor="end" font-family="IBM Plex Mono" font-size="${tagSize}" letter-spacing="2.4" fill="${meta}">${siteName}</text>
</svg>`;
}
