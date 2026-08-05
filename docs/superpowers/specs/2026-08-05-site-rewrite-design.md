# martinsundal.no — full rewrite

**Date:** 2026-08-05
**Branch:** `redesign/micrographics`
**Status:** approved design, ready for implementation planning

## Goal

Replace the single hand-written `index.html` with an Astro-built static site
where each of the five projects gets its own page and its own visual world,
under one shared "micrographics" design language. Full SEO and rich-results
treatment. Extreme polish.

## Design language

Reference: `study_companion/inspo/` — `micrographics.png`, `symbols.webp`,
`modu-grap-micro_graphic_sets-o.avif`, `lumon.webp`.

Technical spec-sheet ornamentation: hairline linework, dense monospace
microlabels, asset IDs, circled and roman numerals, dashed rules, crosshairs,
index dots, rotated marginal labels, barcode blocks. Lumon's calm grotesk
restraint carries the actual reading copy, so the ornament decorates a
document rather than becoming the document.

Copy is dense and structured — spec blocks, annotated diagrams, labelled
readouts — not paragraphs of prose. No section exists to fill space.

## Architecture

Astro 5, `output: 'static'`, no SSR, no runtime server. Deployed by GitHub
Actions to GitHub Pages.

```
src/
  layouts/Base.astro            head, skip link, chrome, theme boot, footer
  components/
    seo/Seo.astro               canonical, OG, Twitter, robots
    seo/JsonLd.astro            emits a @graph from typed props
    seo/Breadcrumbs.astro       visible trail + BreadcrumbList
    micro/                      Rule Index SpecBlock Crosshair Marginalia
                                Barcode Readout — the micrographics kit
  content/projects/*.md         five files; frontmatter is the source of truth
  content.config.ts             zod schema for the collection
  pages/
    index.astro
    projects/[slug].astro       shell that mounts the right world
    og/[slug].png.ts            build-time OG image endpoint
    404.astro
  styles/kernel.css             tokens + micrographics primitives only
  worlds/<slug>.css             one per project, loaded only on that page
  worlds/<slug>.ts              one per project, loaded only on that page
  scripts/                      life.ts (hero sim), theme.ts, rpg.ts
public/                         CNAME, robots.txt, favicons, images, sprites
.github/workflows/deploy.yml
```

### Single source of truth

Each project's frontmatter carries name, slug, summary, spec rows, tags,
links, dates, and image metadata. The page copy, the visible spec block, the
`SoftwareSourceCode` JSON-LD, the OG image, the sitemap entry, and the home
page card all read from that one record. Structured data cannot drift from
the rendered text, which is the usual cause of rich-result failures.

### Content collection schema

```ts
{
  index: number            // 01..05, drives the IDX_0n label and ordering
  name: string
  tagline: string          // one sentence, used as meta description seed
  summary: string          // 1–2 sentences for the home card and og:description
  world: { sub, ink, hair, sig }   // the four tokens this world overrides
  spec: { label: string, value: string }[]
  tags: string[]
  links: { label: string, href: string, primary?: boolean }[]
  repo?: string
  live?: string
  languages: string[]
  award?: string
  image?: { src, alt, width, height }
  datePublished: string
  dateModified: string
}
```

## The shared kernel

Four custom properties define a world; every micrographics component draws
only in terms of them:

| Token | Meaning |
| --- | --- |
| `--sub` | substrate (page background) |
| `--ink` | primary text and heavy linework |
| `--hair` | hairline rules, 1px ornament, muted labels |
| `--sig` | signal accent — one per world, used sparingly |

Base theme: bone `#f4f1ea` substrate, ink `#0b0b0c`. The toggle inverts to
ink substrate with bone ink. `deep-space` remains as the third state reached
by cycling. Theme is stored in `localStorage` under the existing `msa-theme`
key and applied by a blocking inline script in `<head>` to prevent FOUC.

Type scale: a single modular scale on an 8px baseline grid, shared by all
worlds. Worlds change proportion and weight, never the underlying rhythm.

### Fonts

Self-hosted `woff2`, subset to the glyphs used, `font-display: swap`, and
preloaded for the two kernel faces only. No Google Fonts request.

| Role | Face | License |
| --- | --- | --- |
| Kernel display / UI | Archivo | OFL |
| Kernel mono / microlabels | IBM Plex Mono | OFL |
| Serif accent (worlds 01, 04) | Newsreader | OFL |
| Pixel (world 03) | Departure Mono | MIT |

Licenses are re-verified during implementation; any face that does not check
out is replaced with an OFL equivalent before merge.

## The five worlds

Every world inherits the kernel, overrides the four tokens, and adds its own
layout proportions and one signature centerpiece.

| # | Slug | World | Centerpiece |
| --- | --- | --- | --- |
| 01 | `study-companion` | Bone paper, academic serif, KaTeX as ornament, wide marginalia | `course.yaml` scrolls on the left while the widget it produces builds on the right |
| 02 | `ntnu-api` | Near-black terminal, mono throughout, amber signal, boxed readouts | Live MCP client — see below |
| 03 | `cipherbound` | GBA-era: pixel type, CRT scanlines, framed panels, chiptune palette | Trailer video plus a working dialogue box that advances the page's content, sprite walking the margin |
| 04 | `black-hole` | Void black, thin display serif, physics readouts floating in space | Real-time WebGL Schwarzschild lensing, mouse orbit |
| 05 | `game-of-life` | Graph-paper grid, monospace, plotter-line aesthetic | Canvas running a real glider synthesis that settles into a word, with a generation scrubber |

### World 02 — the page is an MCP client

`https://ntnu-mcp.martinsundal.no/mcp` is a Cloudflare Worker that returns
`access-control-allow-origin: *` on both preflight and POST. Verified
2026-08-05: `initialize` → `mcp-session-id` → `notifications/initialized` →
`tools/call` all succeed from an arbitrary origin.

The page ships a hand-written Streamable-HTTP MCP client (~80 lines, no SDK,
no dependency): POST JSON-RPC, parse the `text/event-stream` frames, retain
the session id. The console renders two synchronized panes — raw JSON-RPC
wire traffic beside the formatted result — so a visitor watches the protocol
execute against the real server rather than reading a claim that it exists.

All twelve tools are reachable. The console offers presets for
`search_courses`, `compare_courses`, `check_timetable_conflicts`, and
`get_grade_distribution`, plus free text input for course codes.

If the worker is cold, erroring, or unreachable, the console falls back to a
baked snapshot of genuine responses captured at build time, visibly labelled
as a snapshot. Fabricated data is never shown.

### Degradation

Every centerpiece degrades, and the page is complete without it:

- No WebGL → world 04 shows the existing `render.png` with its annotations.
- JS disabled → all five pages render their full content statically.
- `prefers-reduced-motion` → every centerpiece holds on a representative
  still frame; nothing autoplays.
- Network failure → world 02 falls back as described; nothing else fetches.

## Home page

Sections: hero, project index, about, contact.

The hero keeps the Game of Life canvas that converges to "MARTIN" around
generation 277, with the `visually-hidden` "Martin" for screen readers and
the mask feather that dissolves stray cells. This is the best thing on the
site and its behaviour is preserved exactly; only its framing is redrawn.

The project index replaces today's card grid with five spec-sheet rows, each
carrying its world's `--sig` and a small live preview of that world, linking
to its page.

**Cut:** the "What I work on" section. Five generic cards that say less than
one sharp sentence; the project rows now do that job and lead somewhere.

## Preserved behaviour

These are load-bearing and must survive the rewrite:

- Hero Game of Life convergence to "MARTIN" (`#life-canvas`, `martin_plan.txt`).
- The Konami-code RPG in `rpg.js`, including its hardcoded selectors:
  `.site-header`, `.card`, `.project-card`, `[data-rpg-spawn] img`, and
  `img[src*="render.png"]`. These class names and attributes are kept
  deliberately on the home page, and `render.png` is not renamed.
- The three-state theme system including the `deep-space` easter egg.
- GoatCounter analytics.
- `CNAME` (`martinsundal.no`), served from `public/`.

## SEO and rich results

Home page graph: `Person` + `WebSite` + `ProfilePage`, carried over from the
current site with corrections. Each project page emits `WebPage` +
`SoftwareSourceCode` + `BreadcrumbList`, generated from that project's
frontmatter.

- Per-page canonical, title, and meta description.
- OG and Twitter card tags per page.
- A generated OG image per project, rendered at build time from an SVG
  template in that world's own tokens, rasterized with `@resvg/resvg-js`.
- `sitemap.xml` generated by `@astrojs/sitemap`; the hand-maintained file is
  deleted.
- `robots.txt` retained, sitemap reference updated.
- Visible breadcrumbs on project pages, matching the `BreadcrumbList`.

URLs are purely additive — only `/` exists today — so no redirects are
needed. Project URLs are `/projects/<slug>/`.

Validation before merge: Google Rich Results Test and the schema.org
validator on the home page and all five project pages.

## Navigation

Cross-document view transitions via CSS `@view-transition { navigation: auto }`,
with a named transition on the project title so the home row morphs into the
page heading. No client-side router, so per-world JS keeps a simple lifecycle
and the effect degrades silently in browsers without support. Disabled under
`prefers-reduced-motion`.

## Deployment

`.github/workflows/deploy.yml` builds with Node 22 and publishes `dist/` via
`actions/deploy-pages`.

**Manual step required:** the repository's Pages source must be switched from
"Deploy from a branch" to "GitHub Actions" in repo settings. The site will
not update until this is done. Flagged here because it cannot be automated
from the repo.

## Quality bar

- Lighthouse ≥ 98 performance and 100 accessibility on mobile, all six pages.
- Zero cumulative layout shift; all media carry explicit dimensions.
- WCAG AA contrast in every world, in both light and dark states.
- Complete keyboard path including every centerpiece; visible focus rings.
- No horizontal overflow at 390px, verified with CDP device metrics
  (`Emulation.setDeviceMetricsOverride`, not `--window-size`).
- Every centerpiece works, or degrades, with JS disabled.

## Verification plan

1. `astro build` clean, no warnings.
2. Lighthouse CI against the built output for all six pages.
3. CDP screenshots at 390px and 1440px, light and dark, all six pages.
4. The hero Game of Life verified converging to "MARTIN" by stepping the
   simulation synchronously in a throwaway copy, since rAF does not advance
   under headless virtual time.
5. Konami code exercised on the built home page; RPG spawn and the
   `render.png` black-hole easter egg both confirmed working.
6. World 02 exercised against the live worker, then again with the worker
   blocked, to confirm the labelled snapshot fallback.
7. Rich Results Test and schema.org validator on all six pages.
8. Links checked, including every external project link.

## Out of scope

- Any change to the five project repositories themselves.
- Norwegian translation. `og:locale:alternate` stays, but no `nb` pages.
- A blog or writing section.
- Changes to `ntnu-mcp`'s Worker; the site adapts to the server as deployed.
