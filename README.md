# martinsundal.no

Personal site. Astro 6, static output, deployed to GitHub Pages.

Seven pages: home, `/work/`, and one page per project — each project in its own
visual world under a shared "micrographics" design language.

## Running it

```sh
pnpm install
pnpm dev          # http://localhost:4321
pnpm build        # static output to dist/
pnpm preview
```

## Tests

Two tiers. Pure logic lives in `src/lib/` precisely so it can be tested without
a browser; anything needing a rendered page goes through Playwright.

```sh
pnpm test         # node --test, pure modules only, ~200ms
pnpm test:e2e     # Playwright against a real build
pnpm typecheck
pnpm lint
```

Playwright runs **one worker locally** (`playwright.config.ts`). The default is
one per core, which makes the machine unusable while the suite runs. CI goes
wider.

Extra checks, run manually:

```sh
node scripts/check-contrast.mjs   # every world's palette against WCAG
node scripts/check-links.mjs      # every external link in dist/
```

Visual review, written to `shots/` (gitignored):

```sh
SHOTS=1 pnpm test:e2e e2e/shots.spec.ts --project=desktop
```

## How a "world" works

Every page's identity is four CSS custom properties:

| Token    | Meaning                         |
| -------- | ------------------------------- |
| `--sub`  | substrate (page background)     |
| `--ink`  | primary text and heavy linework |
| `--hair` | hairline rules and 1px ornament |
| `--sig`  | signal accent, used sparingly   |

The micrographics components in `src/components/micro/` draw **only** in terms
of those four, so a world changes identity by redefining them — never by
rewriting a component. `src/pages/kitchen-sink.astro` renders the whole kit in
every theme plus a world override; that page is the proof the architecture
holds.

One gotcha worth knowing: custom properties are substituted where they are
_declared_. A derived token like `--muted` declared at `:root` resolves against
the root theme and then inherits down as a fixed colour, so any world that
overrides `--ink`/`--sub` must re-derive it (see `src/styles/project.css`).

Project pages are five separate files rather than one `[slug]` route, so each
bundles only its own CSS and JS.

## Content

`src/content/projects/*.md` frontmatter is the single source of truth for page
copy, spec blocks, JSON-LD, OG images, and sitemap entries. The zod schema in
`src/lib/schema.ts` enforces hex world tokens, required image alt text, a
160-character tagline cap, and date ordering. Structured data cannot drift from
the visible text because both come from the same record.

## Things that look incidental but are not

- **The home page Game of Life converges to "MARTIN"** and becomes a still life
  at generation 276, which is when the readout beside the board switches to
  `Still life · stable` and the scene stops stepping. `src/components/home/Board.astro`
  steps the same plan at build time so the generation and population readouts
  are correct with no script at all, then hands the live run to
  `createLifeScene`. It is the real B3/S23 rule over `public/martin_plan.txt`,
  not an animation of a finished picture, and `e2e/home.spec.ts` asserts that by
  watching the population pass through values the settled board never has.
  `test/life.test.ts` asserts the settle generation, the population, and that
  the settled word is 206 of the board's 356 columns.
- **`--life-cell`** is read by `src/lib/life.ts` to colour live cells.
- **`public/sprites/girl_sheet.png` has no references and is kept on purpose.**
  It is a Cipherbound character sheet, held for a future use on that page.
  `player_sheet.png` beside it _is_ referenced, by `src/worlds/cipherbound.css`
  for the sprite that walks the page's margin.

## Two manual steps

1. **GitHub Pages source must be set to "GitHub Actions"** in repository
   settings. It cannot be changed from the repo, and the site will not update
   until it is.
2. **`/work/` is built only from material Aker Solutions has published** — their
   Verdal production site page and the captions in their own highlights video.
   Nothing on it comes from internal repositories, scan data, or tooling, and
   the "10x faster" and "opened 2024" claims that circulate in search results
   are deliberately absent because neither appears on Aker's own page. Keep it
   that way. The video is Aker's copyright, republished with credit and a link
   back.

## Fonts

Self-hosted woff2 in `public/fonts/`, all OFL 1.1, license text alongside.
`scripts/convert-og-fonts.sh` regenerates the TTF copies the OG card renderer
needs — resvg has no browser font stack and does not read woff2.

## Docs

- `docs/superpowers/specs/2026-08-05-site-rewrite-design.md` — the design
- `docs/superpowers/plans/2026-08-05-site-rewrite.md` — the implementation plan
- `docs/superpowers/specs/2026-08-05-home-plates-design.md` — the home page as
  one technical plate
- `docs/superpowers/specs/2026-08-06-masthead-orbital.md` — the masthead figure,
  and the SVG and Playwright traps found building it. Read before touching
  `Masthead.astro`.

`docs/inspo/` holds the reference sheets the specs are argued against. It is
gitignored — the images are not ours to redistribute — so a fresh clone will not
have them. Ask for them rather than guessing at what the specs are describing.
