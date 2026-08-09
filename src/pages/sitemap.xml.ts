import { orderedProjects } from "../lib/content.ts";
import { SITE } from "../lib/jsonld.ts";

/**
 * Prerendered to a static /sitemap.xml at build. Hand-rolled rather than
 * pulling in @astrojs/sitemap, for the reasons study-companion's own
 * src/pages/sitemap.xml.ts gives: it emits `lastmod` from the frontmatter the
 * pages already carry, and what stays out of the map is decided here rather
 * than in a config-file filter that can drift from the page's own noindex.
 *
 * The origin comes from SITE, the same constant every canonical and JSON-LD
 * @id is built from — a sitemap that disagrees with the canonical about the
 * host is worse than no sitemap.
 */
export const prerender = true;

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET(): Promise<Response> {
  const projects = await orderedProjects();

  // The home page has no date of its own, and it indexes the projects. Its
  // freshness is therefore the freshest project it lists: a page whose newest
  // entry moved yesterday is worth recrawling.
  const newest = projects.reduce<string | undefined>(
    (max, p) => (!max || p.data.dateModified > max ? p.data.dateModified : max),
    undefined,
  );

  // /work/ carries no date: nothing on it is dated, and inventing a lastmod
  // is a freshness claim, not a fact. Omitted rather than guessed.
  const urls: { loc: string; lastmod?: string }[] = [
    { loc: `${SITE}/`, lastmod: newest },
    ...projects.map((p) => ({
      loc: `${SITE}/projects/${p.id}/`,
      lastmod: p.data.dateModified,
    })),
    { loc: `${SITE}/work/` },
  ];

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map(
        (u) =>
          `  <url><loc>${xmlEscape(u.loc)}</loc>` +
          (u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : "") +
          `</url>`,
      )
      .join("\n") +
    "\n</urlset>\n";

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
