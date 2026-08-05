# martinsundal.no Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-written single-page `index.html` with an Astro static site of seven pages — home, `/work`, and five project pages — each project in its own visual world under a shared "micrographics" design language, with full SEO and rich-results treatment.

**Architecture:** Astro 6 static output, no SSR. One `Base.astro` layout owns head, chrome, and theme. All page copy, spec blocks, JSON-LD, OG images, and sitemap entries derive from a single typed content collection, so structured data cannot drift from visible text. Each world is one scoped CSS file plus one TS module, loaded only on its own page. All non-trivial logic lives in pure modules under `src/lib/` so it is unit-testable without a browser.

**Tech Stack:** Astro 6, TypeScript 6, zod 4, pnpm 10, `node --test` (built-in runner, native type stripping) for pure logic, `@playwright/test` for page behaviour and SEO invariants, `@astrojs/sitemap`, `@resvg/resvg-js` for OG images, prettier + prettier-plugin-astro, markdownlint-cli2.

**Source spec:** `docs/superpowers/specs/2026-08-05-site-rewrite-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **Branch:** `redesign/micrographics`. Never commit to `main`.
- **Astro 6**, `output: 'static'`, `site: 'https://martinsundal.no'`. No SSR, no runtime server.
- **Package manager is pnpm.** Never run `npm install` in this repo.
- **Four world tokens only:** `--sub` (substrate), `--ink` (text/heavy line), `--hair` (hairline/muted), `--sig` (signal accent). Every micrographics component draws *only* in terms of these. A world changes identity by redefining these four, never by rewriting components.
- **Base theme:** bone `#f4f1ea` substrate, ink `#0b0b0c`. Toggle inverts. `deep-space` is the third cycled state. `localStorage` key is exactly `msa-theme`.
- **Fonts self-hosted woff2**, subset, `font-display: swap`. No Google Fonts request. Archivo (display/UI), IBM Plex Mono (microlabels), Newsreader (serif accent, worlds 01/04), Departure Mono (pixel, world 03).
- **Must survive the rewrite, exactly:** the hero Game of Life converging to "MARTIN" (`#life-canvas`, `martin_plan.txt`); the Konami RPG in `rpg.js` including its hardcoded selectors `.site-header`, `.card`, `.project-card`, `[data-rpg-spawn] img`, `img[src*="render.png"]`; the three-state theme system; GoatCounter analytics; `CNAME`.
- **`render.png` is never renamed.** `rpg.js` selects on its filename.
- **Confidentiality (work page):** build only from published Aker material. Never read or reference `~/weldstack`, `~/weldstack_new`, `~/autoweld`, `~/.autoweld`, `~/aw_archive/*.npy`, `~/repos/vpl_mqtt`, `vpl_fabunit`, `scanAutoWeld`, `weldlogger`, `post_weld_gui`, `~/Profiles/ABB_VPL`, `VPL_production`, `VPL_test_more_points`, `~/vm_share_2/weldlog*`, `~/.ssh/id_gt_vpl_integration*`, `~/Downloads/Weld bead modeller Gitlab repo copy`, `~/Downloads/Aker Solutions logo primary navy orange.svg`. No Aker logo. No internal figures.
- **Never print unsourced claims.** "Opened 2024" and "10x faster" appear only in search snippets, not on Aker's own page — omit both.
- **Copy rule:** dense and structured — spec blocks, annotated diagrams, labelled readouts. Not paragraphs of prose. No section exists to fill space. When writing prose, do not use the "intro clause + triadic list" cadence; weave lists into real sentences.
- **Every centerpiece degrades:** no WebGL → static image; JS disabled → full static content; `prefers-reduced-motion` → holds on a still frame, nothing autoplays; network failure → labelled real snapshot, never fabricated data.
- **Quality bar:** Lighthouse ≥ 98 performance / 100 accessibility mobile on all seven pages; zero CLS; WCAG AA contrast in every world in both themes; complete keyboard path; no horizontal overflow at 390px.
- **Commit after every task.** Conventional commit messages. End each commit body with:
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

## File Structure

```text
astro.config.mjs                 site, integrations, build config
package.json                     pnpm scripts
tsconfig.json
playwright.config.ts             runs against `astro preview` on :4321
.github/workflows/deploy.yml     build + deploy-pages

src/
  content.config.ts              collection definitions
  lib/
    schema.ts                    zod schemas, exported types
    jsonld.ts                    pure JSON-LD graph builders
    mcp.ts                       pure Streamable-HTTP MCP client
    life.ts                      pure Game of Life engine + plan parser
    lensing.ts                   shader source + camera math
    dialogue.ts                  pure dialogue-state machine
  layouts/Base.astro             head, skip link, chrome, theme boot, footer
  components/
    seo/Seo.astro
    seo/JsonLd.astro
    seo/Breadcrumbs.astro
    micro/Rule.astro             hairline / dashed / hazard rules
    micro/Index.astro            IDX_0n label
    micro/SpecBlock.astro        label/value readout table
    micro/Crosshair.astro
    micro/Marginalia.astro       rotated margin label
    micro/Barcode.astro
    home/Hero.astro  WorkBand.astro  ProjectIndex.astro  Contact.astro
    work/VideoFacade.astro  LineSchematic.astro
  pages/
    index.astro
    work.astro
    projects/[slug].astro
    og/[slug].png.ts
    404.astro
  styles/kernel.css              tokens, type scale, micrographics primitives
  worlds/<slug>.css              6 files: 5 projects + work
  worlds/<slug>.ts               client modules, only where a world needs one
  scripts/theme.ts  rpg.ts

public/
  CNAME  robots.txt  favicon.*  apple-touch-icon.png
  render.png  cipherbound.png
  martin_plan.txt  game_of_life_plan.txt
  fonts/*.woff2
  vpl/highlights.webm  highlights.mp4  poster.avif
  cipherbound/trailer.webm  trailer.mp4  poster.avif
  sprites/player_sheet.png  girl_sheet.png

test/                            node --test, pure logic only
  jsonld.test.ts  mcp.test.ts  life.test.ts  dialogue.test.ts  schema.test.ts
e2e/                             playwright
  seo.spec.ts  a11y.spec.ts  theme.spec.ts  worlds.spec.ts  rpg.spec.ts
```

**Test strategy, two tiers.** Pure logic modules under `src/lib/` are unit-tested with `node --test` — no browser, no Astro, fast. Anything requiring a rendered page (SEO tags, JSON-LD validity, theme behaviour, keyboard paths, centerpiece degradation) is tested with Playwright against `astro preview`. This is why every non-trivial algorithm lives in `src/lib/` rather than inline in an `.astro` file.

---

### Task 1: Scaffold, tooling, and deploy pipeline

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `playwright.config.ts`, `.gitignore`, `.github/workflows/deploy.yml`, `src/pages/index.astro`, `e2e/build.spec.ts`
- Move: `CNAME`, `robots.txt`, `favicon.svg`, `favicon-96.png`, `favicon.ico`, `apple-touch-icon.png`, `render.png`, `cipherbound.png`, `martin_plan.txt`, `game_of_life_plan.txt` → `public/`
- Move: `assets/player_sheet.png`, `assets/girl_sheet.png` → `public/sprites/`

**Interfaces:**
- Consumes: nothing.
- Produces: a building Astro site. `pnpm build` → `dist/`. `pnpm test` runs `node --test`. `pnpm test:e2e` runs Playwright against `astro preview`.

- [ ] **Step 1: Write the failing build test**

Create `e2e/build.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("home page renders and is titled", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Martin Sundal Aspås/);
});

test("CNAME survives the build", async () => {
  const { readFileSync } = await import("node:fs");
  expect(readFileSync("dist/CNAME", "utf8").trim()).toBe("martinsundal.no");
});

test("robots.txt points at the generated sitemap", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.ok()).toBe(true);
  expect(await res.text()).toContain("https://martinsundal.no/sitemap-index.xml");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:e2e`
Expected: FAIL — no `package.json`, nothing to run.

- [ ] **Step 3: Scaffold the project**

Create `package.json`:

```json
{
  "name": "martinsundal-no",
  "type": "module",
  "private": true,
  "packageManager": "pnpm@10.33.0",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "node --test --disable-warning=ExperimentalWarning 'test/**/*.test.ts'",
    "test:e2e": "playwright test",
    "typecheck": "astro sync && tsc --noEmit",
    "lint": "prettier --check \"{src,test,e2e,scripts}/**/*.{ts,astro,mjs}\" \"*.{ts,mjs,json,md}\"",
    "lint:fix": "prettier --write \"{src,test,e2e,scripts}/**/*.{ts,astro,mjs}\" \"*.{ts,mjs,json,md}\"",
    "lint:md": "markdownlint-cli2 \"docs/**/*.md\""
  },
  "dependencies": {
    "@astrojs/sitemap": "^4.0.0",
    "astro": "^6.3.7",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.0",
    "@resvg/resvg-js": "^2.6.2",
    "@types/node": "^22.10.0",
    "markdownlint-cli2": "^0.22.1",
    "prettier": "^3.8.3",
    "prettier-plugin-astro": "^0.14.1",
    "typescript": "^6.0.3"
  }
}
```

Create `astro.config.mjs`:

```js
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://martinsundal.no",
  output: "static",
  trailingSlash: "always",
  integrations: [sitemap()],
  build: { inlineStylesheets: "auto" },
  vite: { build: { cssCodeSplit: true } },
});
```

Create `tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "src/**/*", "test/**/*", "e2e/**/*"],
  "exclude": ["dist"],
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true,
    "verbatimModuleSyntax": true
  }
}
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://localhost:4321", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "pnpm build && pnpm preview --port 4321",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

Replace `.gitignore` with:

```text
.codex
node_modules/
dist/
.astro/
test-results/
playwright-report/
```

- [ ] **Step 4: Migrate static assets into `public/`**

```bash
mkdir -p public/sprites
git mv CNAME robots.txt favicon.svg favicon-96.png favicon.ico apple-touch-icon.png render.png cipherbound.png martin_plan.txt game_of_life_plan.txt public/
git mv assets/player_sheet.png assets/girl_sheet.png public/sprites/
rmdir assets
git rm sitemap.xml
```

`sitemap.xml` is deleted because `@astrojs/sitemap` generates `sitemap-index.xml`. Update `public/robots.txt` to:

```text
User-agent: *
Allow: /

Sitemap: https://martinsundal.no/sitemap-index.xml
```

- [ ] **Step 5: Write a minimal home page so the build has a route**

Create `src/pages/index.astro`:

```astro
---
const title = "Martin Sundal Aspås | Software Engineer, Robotics & Simulation";
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
  </head>
  <body>
    <h1>{title}</h1>
  </body>
</html>
```

- [ ] **Step 6: Install and verify the build**

Run: `pnpm install && pnpm build`
Expected: build succeeds, `dist/index.html` and `dist/CNAME` exist.

- [ ] **Step 7: Run the e2e test to verify it passes**

Run: `pnpm test:e2e`
Expected: all three tests PASS.

- [ ] **Step 8: Add the deploy workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
build: scaffold Astro 6 site with pnpm, tests, and Pages deploy

Moves static assets into public/, replaces the hand-maintained
sitemap.xml with @astrojs/sitemap, and adds a two-tier test setup:
node --test for pure logic, Playwright against astro preview for
anything that needs a rendered page.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Design kernel and micrographics component kit

**Files:**
- Create: `src/styles/kernel.css`, `src/components/micro/Rule.astro`, `Index.astro`, `SpecBlock.astro`, `Crosshair.astro`, `Marginalia.astro`, `Barcode.astro`
- Create: `public/fonts/` (subset woff2 files)
- Test: `e2e/kernel.spec.ts`

**Interfaces:**
- Consumes: Task 1's build.
- Produces: `kernel.css` defining `--sub --ink --hair --sig`, the type scale (`--step--1` … `--step-6`), spacing (`--space-1` … `--space-8` on an 8px grid), and `.micro-*` primitives. Component props:
  - `Rule` — `{ variant?: "hair" | "dashed" | "double" | "hazard"; label?: string }`
  - `Index` — `{ n: number; label?: string }` renders `IDX_0n`
  - `SpecBlock` — `{ rows: { label: string; value: string }[] }`
  - `Crosshair` — `{ size?: number }`
  - `Marginalia` — `{ text: string; side?: "left" | "right" }`
  - `Barcode` — `{ seed: string }` deterministic bar pattern from a string

- [ ] **Step 1: Write the failing test**

Create `e2e/kernel.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("kernel tokens resolve on the document root", async ({ page }) => {
  await page.goto("/kitchen-sink/");
  const tokens = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return {
      sub: s.getPropertyValue("--sub").trim(),
      ink: s.getPropertyValue("--ink").trim(),
      hair: s.getPropertyValue("--hair").trim(),
      sig: s.getPropertyValue("--sig").trim(),
    };
  });
  expect(tokens.sub).toBe("#f4f1ea");
  expect(tokens.ink).toBe("#0b0b0c");
  expect(tokens.hair).not.toBe("");
  expect(tokens.sig).not.toBe("");
});

test("a world override repaints the kit without touching components", async ({ page }) => {
  await page.goto("/kitchen-sink/");
  const before = await page.locator("[data-micro='rule']").first()
    .evaluate((el) => getComputedStyle(el).borderTopColor);
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--hair", "rgb(255, 0, 0)");
  });
  const after = await page.locator("[data-micro='rule']").first()
    .evaluate((el) => getComputedStyle(el).borderTopColor);
  expect(before).not.toBe("rgb(255, 0, 0)");
  expect(after).toBe("rgb(255, 0, 0)");
});

test("IDX label zero-pads", async ({ page }) => {
  await page.goto("/kitchen-sink/");
  await expect(page.locator("[data-micro='index']").first()).toHaveText(/IDX_0[1-9]/);
});

test("Barcode is deterministic for a given seed", async ({ page }) => {
  await page.goto("/kitchen-sink/");
  const a = await page.locator("[data-micro='barcode'][data-seed='alpha']").innerHTML();
  await page.reload();
  const b = await page.locator("[data-micro='barcode'][data-seed='alpha']").innerHTML();
  expect(a).toBe(b);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:e2e kernel`
Expected: FAIL — `/kitchen-sink/` 404s.

- [ ] **Step 3: Acquire and subset the fonts**

Download Archivo, IBM Plex Mono, Newsreader, and Departure Mono. Verify each license file before use — Archivo, IBM Plex Mono and Newsreader are OFL; Departure Mono is MIT. If any does not check out, substitute an OFL equivalent and record the swap in the commit body.

Subset to Latin + the punctuation the site actually uses, and write `woff2` into `public/fonts/`. Keep the license text alongside as `public/fonts/<face>.LICENSE.txt`.

- [ ] **Step 4: Write `src/styles/kernel.css`**

Define, in this order: `@font-face` blocks; `:root` tokens; the `[data-theme]` overrides; a reset; the type scale; the micrographics primitives.

```css
:root {
  --sub: #f4f1ea;
  --ink: #0b0b0c;
  --hair: color-mix(in oklab, var(--ink) 22%, var(--sub));
  --sig: #c2410c;

  --space-1: 0.5rem;  --space-2: 1rem;   --space-3: 1.5rem;  --space-4: 2rem;
  --space-5: 3rem;    --space-6: 4rem;   --space-7: 6rem;    --space-8: 8rem;

  --step--1: clamp(0.75rem, 0.72rem + 0.15vw, 0.82rem);
  --step-0:  clamp(1rem, 0.96rem + 0.2vw, 1.08rem);
  --step-1:  clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem);
  --step-2:  clamp(1.6rem, 1.4rem + 1vw, 2.2rem);
  --step-3:  clamp(2rem, 1.6rem + 2vw, 3.2rem);
  --step-4:  clamp(2.6rem, 1.9rem + 3.4vw, 4.8rem);

  --font-display: "Archivo", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
}

[data-theme="dark"] { --sub: #0b0b0c; --ink: #f4f1ea; }
[data-theme="deep-space"] { --sub: #05060a; --ink: #cfd6e6; --sig: #7c9cff; }
```

`--hair` is derived from `--ink` and `--sub` with `color-mix`, so every theme and every world gets a correct hairline for free from the two colors it already sets.

- [ ] **Step 5: Write the six micrographics components**

Each renders a `data-micro` attribute for testability and draws only in the four tokens. `Barcode.astro` derives its pattern from a seed with a small deterministic hash so it is stable across builds:

```astro
---
interface Props { seed: string }
const { seed } = Astro.props;
let h = 2166136261;
for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
const bars = Array.from({ length: 24 }, (_, i) => {
  h = Math.imul(h ^ i, 16777619);
  return ((h >>> 8) % 4) + 1;
});
---
<span class="micro-barcode" data-micro="barcode" data-seed={seed} aria-hidden="true">
  {bars.map((w) => <i style={`--w:${w}px`}></i>)}
</span>
```

- [ ] **Step 6: Add a kitchen-sink page**

Create `src/pages/kitchen-sink.astro` rendering every component in every theme. Add `noindex` to it and exclude it from the sitemap via `sitemap({ filter: (p) => !p.includes("/kitchen-sink") })` in `astro.config.mjs`. This page is a permanent development aid, not a placeholder.

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm test:e2e kernel`
Expected: all four tests PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add micrographics design kernel and component kit

Four world tokens (--sub --ink --hair --sig) with --hair derived via
color-mix, a shared type scale on an 8px grid, and six ornament
components that draw only in those tokens. A kitchen-sink route
renders the whole kit in every theme.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Content collection, schema, and project entries

**Files:**
- Create: `src/lib/schema.ts`, `src/content.config.ts`, `src/content/projects/{study-companion,ntnu-api,cipherbound,black-hole,game-of-life}.md`, `src/content/work.md`
- Test: `test/schema.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `projectSchema` (zod) and `type Project = z.infer<typeof projectSchema>`
  - `workSchema` and `type Work`
  - Collection `projects`, ordered by `index`, five entries with slugs exactly `study-companion`, `ntnu-api`, `cipherbound`, `black-hole`, `game-of-life`
  - Exported helper `orderedProjects(): Promise<CollectionEntry<"projects">[]>` from `src/lib/content.ts`, sorted ascending by `data.index`

- [ ] **Step 1: Write the failing test**

Create `test/schema.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { projectSchema } from "../src/lib/schema.ts";

const valid = {
  index: 1,
  name: "Study Companion",
  tagline: "An Astro framework for interactive course study guides.",
  summary: "Courses are authored as plain data against a pinned framework version.",
  world: { sub: "#f4f1ea", ink: "#0b0b0c", hair: "#c9c3b6", sig: "#8a5a2b" },
  spec: [{ label: "STACK", value: "Astro · MDX · KaTeX" }],
  tags: ["Astro", "MDX"],
  links: [{ label: "Browse courses", href: "https://kurs.martinsundal.no", primary: true }],
  languages: ["TypeScript"],
  datePublished: "2026-05-01",
  dateModified: "2026-07-28",
};

test("accepts a well-formed project", () => {
  assert.equal(projectSchema.parse(valid).name, "Study Companion");
});

test("rejects a non-hex world token", () => {
  const bad = { ...valid, world: { ...valid.world, sig: "orange" } };
  assert.throws(() => projectSchema.parse(bad), /hex/i);
});

test("rejects an index outside 1..5", () => {
  assert.throws(() => projectSchema.parse({ ...valid, index: 9 }));
});

test("requires at least one link and one spec row", () => {
  assert.throws(() => projectSchema.parse({ ...valid, links: [] }));
  assert.throws(() => projectSchema.parse({ ...valid, spec: [] }));
});

test("rejects a dateModified earlier than datePublished", () => {
  assert.throws(
    () => projectSchema.parse({ ...valid, dateModified: "2026-01-01" }),
    /dateModified/,
  );
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test`
Expected: FAIL — `src/lib/schema.ts` does not exist.

- [ ] **Step 3: Write the schema**

Create `src/lib/schema.ts`:

```ts
import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "must be a 6-digit hex color");

export const worldSchema = z.object({ sub: hex, ink: hex, hair: hex, sig: hex });

export const projectSchema = z
  .object({
    index: z.number().int().min(1).max(5),
    name: z.string().min(1),
    tagline: z.string().min(1).max(160),
    summary: z.string().min(1).max(300),
    world: worldSchema,
    spec: z.array(z.object({ label: z.string(), value: z.string() })).min(1),
    tags: z.array(z.string()).min(1),
    links: z
      .array(
        z.object({
          label: z.string(),
          href: z.string().url(),
          primary: z.boolean().optional(),
        }),
      )
      .min(1),
    repo: z.string().url().optional(),
    live: z.string().url().optional(),
    languages: z.array(z.string()).min(1),
    award: z.string().optional(),
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
```

`tagline` is capped at 160 characters because it seeds the meta description. `image.alt` is required whenever an image is present, so no project page can ship an undescribed image.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test`
Expected: all five tests PASS.

- [ ] **Step 5: Wire the collection**

Create `src/content.config.ts`:

```ts
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { projectSchema } from "./lib/schema.ts";

const projects = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/projects" }),
  schema: projectSchema,
});

export const collections = { projects };
```

Create `src/lib/content.ts`:

```ts
import { getCollection, type CollectionEntry } from "astro:content";

export async function orderedProjects(): Promise<CollectionEntry<"projects">[]> {
  const all = await getCollection("projects");
  return all.sort((a, b) => a.data.index - b.data.index);
}
```

- [ ] **Step 6: Write the five project entries**

Source the real detail from the local repos: `~/private/study_companion/README.md` and `DESIGN.md`, `~/private/ntnu-api/README.md` and `docs/api-research.md`, `~/private/ntnu-mcp/README.md`, `~/private/game_of_life_text/README.md`. For Cipherbound and the black-hole renderer, use the GitHub repos and the existing copy in the old `index.html` (recoverable with `git show 40327fc:index.html`).

Body copy is the case study: what it is, the problem, the key decisions, the architecture. Keep it dense and structured. Flag anything you cannot source rather than inventing it.

World tokens per project:

| Slug | sub | ink | sig |
| --- | --- | --- | --- |
| `study-companion` | `#f7f4ec` | `#1a1714` | `#8a5a2b` |
| `ntnu-api` | `#0c0d0f` | `#e8e6e1` | `#ffb000` |
| `cipherbound` | `#101820` | `#e0f8d0` | `#88c070` |
| `black-hole` | `#04040a` | `#e8e8f0` | `#ff8c42` |
| `game-of-life` | `#fbfbf8` | `#14161a` | `#2563eb` |

- [ ] **Step 7: Verify the collection loads and check contrast**

Run: `pnpm build`
Expected: build succeeds, all five entries parse.

Then verify every `ink`-on-`sub` pair clears WCAG AA (4.5:1). Compute the contrast ratios and fix any pair that falls short before moving on — the whole point of a token per world is that this is checkable once, here.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add typed project content collection

Five project entries whose frontmatter is the single source of truth
for page copy, spec blocks, JSON-LD, OG images, and sitemap entries.
Schema enforces hex world tokens, required image alt text, and
dateModified ordering.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: SEO components, JSON-LD builders, and invariant tests

**Files:**
- Create: `src/lib/jsonld.ts`, `src/components/seo/Seo.astro`, `JsonLd.astro`, `Breadcrumbs.astro`
- Test: `test/jsonld.test.ts`, `e2e/seo.spec.ts`

**Interfaces:**
- Consumes: `Project` from `src/lib/schema.ts`, `orderedProjects()` from `src/lib/content.ts`.
- Produces:
  - `personNode(): object` — the `Person` node, `@id` `https://martinsundal.no/#martin-sundal-aspas`
  - `homeGraph(projects: Project[]): object` — `@graph` of `Person` + `WebSite` + `ProfilePage` + `ItemList`
  - `projectGraph(p: Project): object` — `@graph` of `WebPage` + `SoftwareSourceCode` + `BreadcrumbList`
  - `workGraph(video: VideoMeta | null): object` — `@graph` of `WebPage` + `BreadcrumbList` + optional `VideoObject`
  - `type VideoMeta = { name: string; description: string; thumbnailUrl: string; uploadDate: string; duration: string; contentUrl: string }`
  - `Seo.astro` props `{ title, description, canonicalPath, ogImage, ogType?, noindex? }`

- [ ] **Step 1: Write the failing unit test**

Create `test/jsonld.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { homeGraph, projectGraph, workGraph, personNode } from "../src/lib/jsonld.ts";
import type { Project } from "../src/lib/schema.ts";

const p: Project = {
  index: 3,
  name: "Cipherbound",
  tagline: "A Pokémon-like game built from scratch in C++.",
  summary: "Core game systems, gameplay, and architecture, written in C++.",
  world: { sub: "#101820", ink: "#e0f8d0", hair: "#3a5a44", sig: "#88c070" },
  spec: [{ label: "LANG", value: "C++" }],
  tags: ["C++"],
  links: [{ label: "Visit", href: "https://cipherbound.com", primary: true }],
  repo: "https://github.com/MartinSA04/CipherBound",
  languages: ["C++"],
  award: "Best Project, TDT4102, NTNU",
  datePublished: "2025-06-01",
  dateModified: "2026-07-28",
};

test("person node has a stable @id", () => {
  assert.equal(personNode()["@id"], "https://martinsundal.no/#martin-sundal-aspas");
});

test("project graph carries WebPage, SoftwareSourceCode and BreadcrumbList", () => {
  const types = (projectGraph(p)["@graph"] as { "@type": string }[]).map((n) => n["@type"]);
  assert.deepEqual(types.sort(), ["BreadcrumbList", "SoftwareSourceCode", "WebPage"]);
});

test("project graph references the person by @id, never inlining a duplicate", () => {
  const json = JSON.stringify(projectGraph(p));
  assert.ok(json.includes('"@id":"https://martinsundal.no/#martin-sundal-aspas"'));
  assert.equal((json.match(/"familyName"/g) ?? []).length, 0);
});

test("breadcrumb trail is Home then the project", () => {
  const graph = projectGraph(p)["@graph"] as any[];
  const crumbs = graph.find((n) => n["@type"] === "BreadcrumbList").itemListElement;
  assert.equal(crumbs.length, 2);
  assert.equal(crumbs[0].name, "Home");
  assert.equal(crumbs[1].name, "Cipherbound");
  assert.equal(crumbs[1].item, "https://martinsundal.no/projects/cipherbound/");
});

test("award appears on the SoftwareSourceCode node", () => {
  const graph = projectGraph(p)["@graph"] as any[];
  const code = graph.find((n) => n["@type"] === "SoftwareSourceCode");
  assert.equal(code.award, "Best Project, TDT4102, NTNU");
});

test("home graph lists every project exactly once", () => {
  const graph = homeGraph([p])["@graph"] as any[];
  const list = graph.find((n) => n["@type"] === "ItemList");
  assert.equal(list.numberOfItems, 1);
  assert.equal(list.itemListElement.length, 1);
});

test("work graph omits VideoObject when no video metadata is supplied", () => {
  const types = (workGraph(null)["@graph"] as { "@type": string }[]).map((n) => n["@type"]);
  assert.ok(!types.includes("VideoObject"));
});

test("work graph includes VideoObject with duration and copyright holder", () => {
  const graph = workGraph({
    name: "Verdal Production Line highlights",
    description: "Aker Solutions' highlights from the Verdal Production Line.",
    thumbnailUrl: "https://martinsundal.no/vpl/poster.avif",
    uploadDate: "2025-08-18",
    duration: "PT1M9S",
    contentUrl: "https://martinsundal.no/vpl/highlights.mp4",
  })["@graph"] as any[];
  const v = graph.find((n) => n["@type"] === "VideoObject");
  assert.equal(v.duration, "PT1M9S");
  assert.equal(v.copyrightHolder.name, "Aker Solutions");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test`
Expected: FAIL — `src/lib/jsonld.ts` does not exist.

- [ ] **Step 3: Write `src/lib/jsonld.ts`**

Port the `Person`, `WebSite` and `ProfilePage` nodes verbatim from the old markup (`git show 40327fc:index.html`), keeping every `sameAs`, `knowsAbout`, `alumniOf` and `worksFor` value. Build each graph as a plain object; every node references `personNode()["@id"]` by `@id` rather than inlining the person. `SITE = "https://martinsundal.no"` is a module constant, and every URL is absolute.

- [ ] **Step 4: Run the unit test to verify it passes**

Run: `pnpm test`
Expected: all eight tests PASS.

- [ ] **Step 5: Write the failing page-level SEO test**

Create `e2e/seo.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const PAGES = [
  "/",
  "/work/",
  "/projects/study-companion/",
  "/projects/ntnu-api/",
  "/projects/cipherbound/",
  "/projects/black-hole/",
  "/projects/game-of-life/",
];

for (const path of PAGES) {
  test.describe(path, () => {
    test.beforeEach(async ({ page }) => { await page.goto(path); });

    test("has exactly one h1", async ({ page }) => {
      await expect(page.locator("h1")).toHaveCount(1);
    });

    test("has a self-referencing canonical", async ({ page }) => {
      const href = await page.locator("link[rel=canonical]").getAttribute("href");
      expect(href).toBe(`https://martinsundal.no${path}`);
    });

    test("has a title and a description within sane length", async ({ page }) => {
      expect((await page.title()).length).toBeGreaterThan(10);
      const desc = await page.locator("meta[name=description]").getAttribute("content");
      expect(desc!.length).toBeGreaterThan(50);
      expect(desc!.length).toBeLessThanOrEqual(160);
    });

    test("has an absolute og:image", async ({ page }) => {
      const og = await page.locator("meta[property='og:image']").getAttribute("content");
      expect(og).toMatch(/^https:\/\/martinsundal\.no\//);
    });

    test("every JSON-LD block parses and is a graph", async ({ page }) => {
      const blocks = await page.locator("script[type='application/ld+json']").allTextContents();
      expect(blocks.length).toBeGreaterThan(0);
      for (const b of blocks) {
        const parsed = JSON.parse(b);
        expect(parsed["@context"]).toBe("https://schema.org");
        expect(Array.isArray(parsed["@graph"])).toBe(true);
      }
    });

    test("all images carry alt text and explicit dimensions", async ({ page }) => {
      const imgs = page.locator("img:not([aria-hidden='true'])");
      for (let i = 0; i < (await imgs.count()); i++) {
        const img = imgs.nth(i);
        expect(await img.getAttribute("alt")).not.toBeNull();
        expect(await img.getAttribute("width")).not.toBeNull();
        expect(await img.getAttribute("height")).not.toBeNull();
      }
    });
  });
}

test("sitemap lists all seven pages and excludes the kitchen sink", async ({ request }) => {
  const index = await (await request.get("/sitemap-index.xml")).text();
  const url = index.match(/<loc>([^<]+sitemap-0\.xml)<\/loc>/)![1];
  const body = await (await request.get(url)).text();
  for (const p of PAGES) expect(body).toContain(`https://martinsundal.no${p}`);
  expect(body).not.toContain("kitchen-sink");
});
```

- [ ] **Step 6: Write the SEO components**

`Seo.astro` emits canonical, title, description, robots, OG and Twitter tags, and theme-color for both schemes. `JsonLd.astro` takes a `graph` object prop and emits one `<script type="application/ld+json">` with `set:html={JSON.stringify(graph)}`. `Breadcrumbs.astro` renders the visible trail from the same array the `BreadcrumbList` is built from, so the two cannot disagree.

These tests will not fully pass until Tasks 5–8 create the pages. Run the subset that applies to `/` now; re-run the whole file at Task 8.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add SEO components and JSON-LD graph builders

Pure builders under src/lib/jsonld.ts so the graphs are unit-testable
without a browser. Every node references the Person by @id instead of
inlining a duplicate. Visible breadcrumbs render from the same array
as the BreadcrumbList.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Base layout, chrome, and the three-state theme

**Files:**
- Create: `src/layouts/Base.astro`, `src/scripts/theme.ts`, `src/pages/404.astro`
- Modify: `src/pages/index.astro`
- Test: `e2e/theme.spec.ts`

**Interfaces:**
- Consumes: `Seo.astro`, `JsonLd.astro`, `kernel.css`.
- Produces: `Base.astro` with props `{ title, description, canonicalPath, ogImage, graph, world?, bodyClass? }` and named slots `header-extra` and default. Exposes `.site-header` on the header element (required by `rpg.js`). `src/scripts/theme.ts` exports `initTheme()` and cycles `light → dark → deep-space`.

- [ ] **Step 1: Write the failing test**

Create `e2e/theme.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("defaults to light with no stored preference", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("cycles light -> dark -> deep-space -> light", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  const toggle = page.locator("#theme-toggle");
  await toggle.click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await toggle.click();
  await expect(html).toHaveAttribute("data-theme", "deep-space");
  await toggle.click();
  await expect(html).toHaveAttribute("data-theme", "light");
});

test("persists the choice under the msa-theme key", async ({ page }) => {
  await page.goto("/");
  await page.locator("#theme-toggle").click();
  expect(await page.evaluate(() => localStorage.getItem("msa-theme"))).toBe("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("applies the stored theme before first paint", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("msa-theme", "dark"));
  await page.goto("/", { waitUntil: "commit" });
  expect(await page.locator("html").getAttribute("data-theme")).toBe("dark");
});

test("keeps .site-header for the RPG", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".site-header")).toHaveCount(1);
});

test("skip link is the first focusable element and targets main", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toHaveAttribute("href", "#main");
  await expect(page.locator("#main")).toHaveCount(1);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:e2e theme`
Expected: FAIL — no toggle, no `data-theme`.

- [ ] **Step 3: Write the blocking theme boot**

In `Base.astro`'s `<head>`, before any stylesheet, inline a script with `is:inline` so Astro does not hoist or defer it. It reads `msa-theme`, falls back to `prefers-color-scheme`, and sets `data-theme` on `document.documentElement` synchronously. Nothing else may run before it, or the page flashes.

- [ ] **Step 4: Write `src/scripts/theme.ts` and the layout**

`initTheme()` wires `#theme-toggle` to the cycle and writes `localStorage`. The layout renders the header with class `site-header`, the toggle, a skip link to `#main`, `<main id="main">`, and the footer. Add `@view-transition { navigation: auto }` in `kernel.css`, wrapped in `@media (prefers-reduced-motion: no-preference)`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test:e2e theme`
Expected: all six tests PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add base layout with three-state theme and skip link

Theme is applied by a blocking inline script before first paint, so
there is no flash. Keeps .site-header and the msa-theme storage key
for compatibility with the Konami RPG.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Home page with the Game of Life hero

**Files:**
- Create: `src/lib/life.ts`, `src/components/home/Hero.astro`, `WorkBand.astro`, `ProjectIndex.astro`, `Contact.astro`, `src/worlds/home.css`
- Modify: `src/pages/index.astro`
- Test: `test/life.test.ts`, `e2e/home.spec.ts`

**Interfaces:**
- Consumes: `Base.astro`, `orderedProjects()`, `homeGraph()`.
- Produces:
  - `parsePlan(text: string): { width: number; height: number; cells: Uint8Array }`
  - `step(cells: Uint8Array, w: number, h: number): Uint8Array` — one Conway generation
  - `createLifeScene(opts): LifeScene` — the rAF driver, ported from the old `script.js`
  - Home page exposing `.card` and `.project-card` classes and `[data-rpg-spawn]` on the Cipherbound row (required by `rpg.js`)

- [ ] **Step 1: Write the failing unit test**

Create `test/life.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parsePlan, step } from "../src/lib/life.ts";

test("a blinker oscillates with period two", () => {
  const w = 5, h = 5;
  const cells = new Uint8Array(w * h);
  cells[1 * w + 2] = cells[2 * w + 2] = cells[3 * w + 2] = 1;
  const one = step(cells, w, h);
  assert.deepEqual([...one.slice(2 * w + 1, 2 * w + 4)], [1, 1, 1]);
  assert.deepEqual([...step(one, w, h)], [...cells]);
});

test("a block is still life", () => {
  const w = 4, h = 4;
  const cells = new Uint8Array(w * h);
  cells[1 * w + 1] = cells[1 * w + 2] = cells[2 * w + 1] = cells[2 * w + 2] = 1;
  assert.deepEqual([...step(cells, w, h)], [...cells]);
});

test("the board does not wrap at the edges", () => {
  const w = 3, h = 3;
  const cells = new Uint8Array(w * h);
  cells[0] = cells[1] = cells[2] = 1;
  assert.equal(step(cells, w, h)[w + 1], 1);
});

test("the hero plan converges to MARTIN and then holds", () => {
  const plan = parsePlan(readFileSync("public/martin_plan.txt", "utf8"));
  let cells = plan.cells;
  for (let i = 0; i < 277; i++) cells = step(cells, plan.width, plan.height);
  const settled = step(cells, plan.width, plan.height);
  assert.deepEqual([...settled], [...cells], "board should be stable at generation 277");
  const live = cells.reduce((n, c) => n + c, 0);
  assert.ok(live > 0, "board must not be empty");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test`
Expected: FAIL — `src/lib/life.ts` does not exist.

- [ ] **Step 3: Port the life engine**

Extract the simulation from `git show 40327fc:script.js` into `src/lib/life.ts` as pure functions, leaving the canvas/rAF concerns in `createLifeScene`. Preserve the plan format, the speed, and the `loopAfter` / `restartOnExtinction` / `pauseWhenOffscreen` options exactly.

- [ ] **Step 4: Run the unit test to verify it passes**

Run: `pnpm test`
Expected: all four tests PASS. If the convergence assertion fails, the port changed behaviour — fix the port, not the test.

- [ ] **Step 5: Write the failing page test**

Create `e2e/home.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("hero keeps the life canvas and the screen-reader name", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#life-canvas")).toHaveCount(1);
  await expect(page.locator(".visually-hidden", { hasText: "Martin" })).toHaveCount(1);
});

test("project index links to all five project pages", async ({ page }) => {
  await page.goto("/");
  for (const slug of ["study-companion", "ntnu-api", "cipherbound", "black-hole", "game-of-life"]) {
    await expect(page.locator(`a[href='/projects/${slug}/']`)).toHaveCount(1);
  }
});

test("keeps the RPG hook selectors", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".card").first()).toBeVisible();
  await expect(page.locator(".project-card").first()).toBeVisible();
  await expect(page.locator("[data-rpg-spawn] img")).toHaveCount(1);
});

test("work band links to /work/", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("a[href='/work/']").first()).toBeVisible();
});

test("no horizontal overflow at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("the old What I work on section is gone", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /what i work on/i })).toHaveCount(0);
});
```

- [ ] **Step 6: Build the home page**

Sections in order: hero (life canvas, lead, actions), work band (one sentence, VPL poster, link to `/work/`), project index (five spec-sheet rows), about, contact. The Cipherbound row carries `data-rpg-spawn` and an `<img>`. Keep the mask feather that dissolves stray cells above and below the canvas.

- [ ] **Step 7: Run the page test to verify it passes**

Run: `pnpm test:e2e home`
Expected: all six tests PASS. The work-band test needs `/work/` from Task 8 — if it fails only on the missing route, note it and re-run after Task 8.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: rebuild the home page around the micrographics kernel

Ports the Game of Life engine to pure functions in src/lib/life.ts,
with a test asserting the hero board still converges at generation 277
and holds. Replaces the card grid with spec-sheet project rows and
drops the generic What I work on section.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Port the Konami RPG easter egg

**Files:**
- Create: `src/scripts/rpg.ts`
- Modify: `src/pages/index.astro`
- Delete: `rpg.js`, `script.js`, `styles.css`, `index.html`, `martin_plan.txt` (root copies superseded by `public/`)
- Test: `e2e/rpg.spec.ts`

**Interfaces:**
- Consumes: the home page's `.site-header`, `.card`, `.project-card`, `[data-rpg-spawn] img`, `img[src*="render.png"]`.
- Produces: `initRpg()`, loaded only on the home page.

- [ ] **Step 1: Write the failing test**

Create `e2e/rpg.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const KONAMI = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "KeyB", "KeyA",
];

test("konami code spawns the player at the Cipherbound card", async ({ page }) => {
  await page.goto("/");
  for (const key of KONAMI) await page.keyboard.press(key.startsWith("Key") ? key.slice(3) : key);
  await expect(page.locator("[data-rpg-player]")).toBeVisible({ timeout: 5000 });
});

test("the black hole easter egg target is present and named render.png", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("img[src*='render.png']")).toHaveCount(1);
});

test("the RPG does not load on project pages", async ({ page }) => {
  await page.goto("/projects/cipherbound/");
  for (const key of KONAMI) await page.keyboard.press(key.startsWith("Key") ? key.slice(3) : key);
  await expect(page.locator("[data-rpg-player]")).toHaveCount(0);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:e2e rpg`
Expected: FAIL — no RPG loaded.

- [ ] **Step 3: Port `rpg.js` to `src/scripts/rpg.ts`**

Convert to a TS module exporting `initRpg()`. Change as little as possible: keep every selector, the sprite sheet handling (now at `/sprites/player_sheet.png` and `/sprites/girl_sheet.png`), the persisted entity positions, the dialogue, and the black-hole easter egg. Add a `data-rpg-player` attribute to the player element for testability. Add types where they are obvious; do not restructure the logic.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:e2e rpg`
Expected: all three tests PASS.

- [ ] **Step 5: Delete the superseded legacy files**

```bash
git rm index.html styles.css script.js rpg.js martin_plan.txt game_of_life_plan.txt
```

The last two are already copied into `public/`. Confirm with `ls public/` before deleting. Keep `game_of_life_plan.txt` and `martin_plan.txt` in `public/` — they are fetched at runtime.

- [ ] **Step 6: Verify the whole suite still passes**

Run: `pnpm test && pnpm test:e2e`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: port the Konami RPG and remove the legacy static site

rpg.js becomes a TS module loaded only on the home page, with every
hardcoded selector preserved. Deletes the old index.html, styles.css
and script.js now that Astro owns every route.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: The work page and the VPL video

**Files:**
- Create: `src/pages/work.astro`, `src/worlds/work.css`, `src/components/work/VideoFacade.astro`, `LineSchematic.astro`, `public/vpl/{highlights.webm,highlights.mp4,poster.avif}`
- Test: `e2e/work.spec.ts`

**Interfaces:**
- Consumes: `Base.astro`, `workGraph()` from `src/lib/jsonld.ts`.
- Produces: `/work/`. `VideoFacade.astro` props `{ poster, webm, mp4, width, height, label }` — renders a poster button that swaps in a `<video>` on click.

- [ ] **Step 1: Write the failing test**

Create `e2e/work.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("video transfers zero bytes before the user clicks play", async ({ page }) => {
  const videoRequests: string[] = [];
  page.on("request", (r) => {
    if (/\.(webm|mp4)$/.test(new URL(r.url()).pathname)) videoRequests.push(r.url());
  });
  await page.goto("/work/");
  await page.waitForLoadState("networkidle");
  expect(videoRequests).toHaveLength(0);
});

test("clicking the facade loads and plays the video", async ({ page }) => {
  await page.goto("/work/");
  await page.locator("[data-video-facade] button").click();
  const video = page.locator("[data-video-facade] video");
  await expect(video).toBeVisible();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThan(0);
});

test("the facade is keyboard reachable and labelled", async ({ page }) => {
  await page.goto("/work/");
  const btn = page.locator("[data-video-facade] button");
  await expect(btn).toHaveAttribute("aria-label", /verdal production line/i);
  await btn.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-video-facade] video")).toBeVisible();
});

test("credits Aker Solutions and links to the source", async ({ page }) => {
  await page.goto("/work/");
  await expect(page.getByText(/aker solutions/i).first()).toBeVisible();
  await expect(
    page.locator("a[href*='akersolutions.com'][href*='verdal-production-site']"),
  ).toHaveCount(1);
});

test("prints no unsourced claims", async ({ page }) => {
  await page.goto("/work/");
  const body = (await page.locator("body").innerText()).toLowerCase();
  expect(body).not.toContain("10x faster");
  expect(body).not.toContain("10 times faster");
  expect(body).not.toMatch(/opened in 2024/);
});

test("poster reserves its space so there is no layout shift", async ({ page }) => {
  await page.goto("/work/");
  const img = page.locator("[data-video-facade] img");
  expect(await img.getAttribute("width")).not.toBeNull();
  expect(await img.getAttribute("height")).not.toBeNull();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:e2e work`
Expected: FAIL — `/work/` 404s.

- [ ] **Step 3: Transcode the video**

The source has already been downloaded and verified. Re-fetch and transcode with the exact settings measured in the spec:

```bash
mkdir -p public/vpl
curl -sL -A "Mozilla/5.0" -o /tmp/vpl_src.mp4 \
  "https://www.akersolutions.com/globalassets/videos/vpl-web-highlights.mp4"

ffmpeg -y -i /tmp/vpl_src.mp4 -vf "scale=1280:720:flags=lanczos" \
  -c:v libsvtav1 -crf 40 -preset 4 -g 250 \
  -c:a libopus -b:a 96k -ac 2 public/vpl/highlights.webm

ffmpeg -y -i /tmp/vpl_src.mp4 -vf "scale=1280:720:flags=lanczos" \
  -c:v libx264 -crf 26 -preset slow -profile:v high -pix_fmt yuv420p \
  -c:a aac -b:a 96k -movflags +faststart public/vpl/highlights.mp4

ffmpeg -y -ss 34 -i /tmp/vpl_src.mp4 -frames:v 1 -vf "scale=1280:720" /tmp/poster.png
convert /tmp/poster.png -quality 82 public/vpl/poster.avif
rm /tmp/vpl_src.mp4 /tmp/poster.png
```

Expected sizes: webm ≈ 8.6 MB, mp4 ≈ 12.4 MB, poster ≈ 116 KB. If the webm lands above 12 MB the source has changed — re-measure rather than shipping it blind.

- [ ] **Step 4: Write the page**

Content, drawn only from published Aker material:

- Capacity up to one closed cage floater per week.
- Automates welding, sandblasting, and painting of steel structures.
- Robots scan and create 3D models of components before production.
- Applies surface treatments and protective coatings.
- Covers cutting, welding, surface treatment, coating, and mechanical completion.
- Robotic welding of tubular sections.

Plus Martin's own description of the role, which is his to write: robotics, welding automation, scanning, robot control, industrial data, system architecture.

World: graphite substrate, safety yellow `--sig`, hazard-stripe rules, ISO-style pictograms from the micrographics kit. `LineSchematic.astro` draws the stations-and-flow diagram in inline SVG using the four tokens, animated on scroll under `prefers-reduced-motion: no-preference`.

`VideoFacade.astro` renders `<img>` poster with explicit `width`/`height` inside a `<button>`; on activation it replaces itself with `<video controls autoplay preload="metadata">` holding both `<source>` elements, webm first.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test:e2e work`
Expected: all six tests PASS.

- [ ] **Step 6: Re-run the full SEO suite**

Run: `pnpm test:e2e seo`
Expected: `/` and `/work/` pass; project routes still fail until Tasks 9–13.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add the work page with the VPL video

Built only from material Aker Solutions has published, credited with
a link back to their page. The video is transcoded to AV1 + H.264 at
720p behind a click-to-load facade, so it transfers nothing until a
visitor asks for it. Omits the 10x-faster and opened-2024 claims,
which appear only in search snippets.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: World 01 — Study Companion

**Files:**
- Create: `src/pages/projects/[slug].astro`, `src/worlds/study-companion.css`, `src/worlds/study-companion.ts`
- Test: `e2e/worlds.spec.ts` (shared across Tasks 9–13)

**Interfaces:**
- Consumes: `orderedProjects()`, `projectGraph()`, `Base.astro`, the micrographics kit.
- Produces: the `[slug]` route with `getStaticPaths()` over the collection. Each world's CSS is imported inside a `data-world="<slug>"` scope. Client modules are loaded per-world with a dynamic import keyed on the slug.

- [ ] **Step 1: Write the failing shared world test**

Create `e2e/worlds.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const WORLDS = [
  { slug: "study-companion", sig: "#8a5a2b" },
  { slug: "ntnu-api", sig: "#ffb000" },
  { slug: "cipherbound", sig: "#88c070" },
  { slug: "black-hole", sig: "#ff8c42" },
  { slug: "game-of-life", sig: "#2563eb" },
];

for (const w of WORLDS) {
  test.describe(w.slug, () => {
    test("applies its own world tokens", async ({ page }) => {
      await page.goto(`/projects/${w.slug}/`);
      const sig = await page.evaluate(() =>
        getComputedStyle(document.querySelector("[data-world]")!).getPropertyValue("--sig").trim(),
      );
      expect(sig.toLowerCase()).toBe(w.sig);
    });

    test("shows breadcrumbs matching the structured data", async ({ page }) => {
      await page.goto(`/projects/${w.slug}/`);
      const visible = await page.locator("nav[aria-label='Breadcrumb'] a, nav[aria-label='Breadcrumb'] [aria-current]").allInnerTexts();
      const ld = JSON.parse(
        (await page.locator("script[type='application/ld+json']").first().textContent())!,
      );
      const crumbs = ld["@graph"].find((n: any) => n["@type"] === "BreadcrumbList").itemListElement;
      expect(visible.map((t) => t.trim())).toEqual(crumbs.map((c: any) => c.name));
    });

    test("renders full content with JavaScript disabled", async ({ browser }) => {
      const ctx = await browser.newContext({ javaScriptEnabled: false });
      const p = await ctx.newPage();
      await p.goto(`/projects/${w.slug}/`);
      await expect(p.locator("h1")).toBeVisible();
      expect((await p.locator("main").innerText()).length).toBeGreaterThan(400);
      await ctx.close();
    });

    test("has no horizontal overflow at 390px", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/projects/${w.slug}/`);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("holds still under reduced motion", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/projects/${w.slug}/`);
      const running = await page.evaluate(() =>
        document.getAnimations().filter((a) => a.playState === "running").length,
      );
      expect(running).toBe(0);
    });
  });
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:e2e worlds`
Expected: FAIL — no project routes.

- [ ] **Step 3: Write the `[slug]` route**

```astro
---
import { getCollection, render } from "astro:content";
import Base from "../../layouts/Base.astro";
import { projectGraph } from "../../lib/jsonld.ts";

export async function getStaticPaths() {
  const projects = await getCollection("projects");
  return projects.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}

const { entry } = Astro.props;
const { Content } = await render(entry);
const p = entry.data;
const style = `--sub:${p.world.sub};--ink:${p.world.ink};--hair:${p.world.hair};--sig:${p.world.sig}`;
---

<Base
  title={`${p.name} | Martin Sundal Aspås`}
  description={p.tagline}
  canonicalPath={`/projects/${entry.id}/`}
  ogImage={`https://martinsundal.no/og/${entry.id}.png`}
  graph={projectGraph(p)}
>
  <article data-world={entry.id} style={style}>
    <h1>{p.name}</h1>
    <Content />
  </article>
</Base>
```

- [ ] **Step 4: Build world 01**

Bone paper, Newsreader for display, generous margins with `Marginalia` in the outer column, KaTeX-set formulas as ornament. Centerpiece: a two-pane scroll-synced view where `course.yaml` scrolls on the left and the widget it produces builds on the right, driven by `IntersectionObserver` in `src/worlds/study-companion.ts`. Under reduced motion, both panes render fully expanded and static.

- [ ] **Step 5: Run the test to verify world 01 passes**

Run: `pnpm test:e2e worlds -g study-companion`
Expected: all five tests PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add project page route and the Study Companion world

Adds the [slug] route driven by the content collection, plus the first
world: bone paper, serif display, marginalia, and a scroll-synced view
of a course.yaml building the widget it produces.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: World 02 — ntnu-api, with a live MCP client

**Files:**
- Create: `src/lib/mcp.ts`, `src/worlds/ntnu-api.css`, `src/worlds/ntnu-api.ts`, `src/data/mcp-snapshot.json`
- Test: `test/mcp.test.ts`, `e2e/mcp.spec.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks; `src/lib/mcp.ts` is standalone and dependency-free.
- Produces:
  - `parseSseFrames(chunk: string): unknown[]` — extracts JSON payloads from `event:`/`data:` frames
  - `class McpClient { constructor(url: string); connect(): Promise<void>; listTools(): Promise<Tool[]>; call(name: string, args: Record<string, unknown>): Promise<unknown>; get sessionId(): string | null }`
  - `type Tool = { name: string; description: string; inputSchema: object }`

**Verified server behaviour (2026-08-05):** `https://ntnu-mcp.martinsundal.no/mcp` returns `access-control-allow-origin: *` on preflight and POST, exposes `mcp-session-id`, speaks protocol `2025-06-18`, and answers `tools/call` from an arbitrary origin. Handshake is `initialize` → read `mcp-session-id` → `notifications/initialized` → `tools/call`.

- [ ] **Step 1: Write the failing unit test**

Create `test/mcp.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { parseSseFrames, McpClient } from "../src/lib/mcp.ts";

test("parses a single SSE frame", () => {
  const frames = parseSseFrames('event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"ok":true}}\n\n');
  assert.equal(frames.length, 1);
  assert.deepEqual((frames[0] as any).result, { ok: true });
});

test("parses several frames in one chunk", () => {
  const chunk = 'event: message\ndata: {"id":1}\n\nevent: message\ndata: {"id":2}\n\n';
  assert.deepEqual(parseSseFrames(chunk).map((f: any) => f.id), [1, 2]);
});

test("ignores keep-alive comments and blank lines", () => {
  assert.equal(parseSseFrames(': keep-alive\n\n\n').length, 0);
});

test("tolerates a data payload split across lines", () => {
  const frames = parseSseFrames('event: message\ndata: {"a":\ndata: 1}\n\n');
  assert.deepEqual(frames[0], { a: 1 });
});

test("client sends the session id on calls after connecting", async () => {
  const seen: Record<string, string | null>[] = [];
  const fetchStub = async (_url: string, init: RequestInit) => {
    const headers = new Headers(init.headers);
    seen.push({ session: headers.get("mcp-session-id") });
    const body = JSON.parse(String(init.body));
    if (body.method === "initialize") {
      return new Response('event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-06-18"}}\n\n', {
        headers: { "mcp-session-id": "sess-123", "content-type": "text/event-stream" },
      });
    }
    return new Response('event: message\ndata: {"jsonrpc":"2.0","id":2,"result":{"content":[]}}\n\n', {
      headers: { "content-type": "text/event-stream" },
    });
  };
  const c = new McpClient("https://example.test/mcp", fetchStub as typeof fetch);
  await c.connect();
  assert.equal(c.sessionId, "sess-123");
  await c.call("search_courses", { year: 2026, query: "fysikk" });
  assert.equal(seen.at(-1)!.session, "sess-123");
});

test("a JSON-RPC error rejects rather than resolving with junk", async () => {
  const fetchStub = async () =>
    new Response('event: message\ndata: {"jsonrpc":"2.0","id":1,"error":{"code":-32602,"message":"bad params"}}\n\n', {
      headers: { "content-type": "text/event-stream" },
    });
  const c = new McpClient("https://example.test/mcp", fetchStub as typeof fetch);
  await assert.rejects(() => c.connect(), /bad params/);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test`
Expected: FAIL — `src/lib/mcp.ts` does not exist.

- [ ] **Step 3: Write the MCP client**

`src/lib/mcp.ts`, no dependencies, injectable `fetch` for testing. `connect()` POSTs `initialize` with `protocolVersion: "2025-06-18"`, captures `mcp-session-id` from the response headers, then POSTs the `notifications/initialized` notification. `call()` POSTs `tools/call` with the session id and `mcp-protocol-version` headers. Every request sends `Accept: application/json, text/event-stream`. Responses are parsed with `parseSseFrames`; a frame carrying `error` rejects with its message.

- [ ] **Step 4: Run the unit test to verify it passes**

Run: `pnpm test`
Expected: all six tests PASS.

- [ ] **Step 5: Capture the fallback snapshot**

Call the live server once for each preset and save the genuine responses to `src/data/mcp-snapshot.json`, with a `capturedAt` timestamp. This file is real data, never hand-written.

- [ ] **Step 6: Write the failing page test**

Create `e2e/mcp.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("runs a real query against the live worker", async ({ page }) => {
  await page.goto("/projects/ntnu-api/");
  await page.locator("[data-mcp-preset='search_courses']").click();
  await expect(page.locator("[data-mcp-result]")).toContainText(/TFY|FY|TDT/, { timeout: 20_000 });
  await expect(page.locator("[data-mcp-wire]")).toContainText('"method"');
});

test("falls back to a labelled snapshot when the worker is unreachable", async ({ page }) => {
  await page.route("**/ntnu-mcp.martinsundal.no/**", (r) => r.abort());
  await page.goto("/projects/ntnu-api/");
  await page.locator("[data-mcp-preset='search_courses']").click();
  await expect(page.locator("[data-mcp-fallback]")).toBeVisible();
  await expect(page.locator("[data-mcp-fallback]")).toContainText(/snapshot/i);
});

test("the console is keyboard operable", async ({ page }) => {
  await page.goto("/projects/ntnu-api/");
  await page.locator("[data-mcp-preset='search_courses']").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-mcp-result]")).not.toBeEmpty({ timeout: 20_000 });
});
```

- [ ] **Step 7: Build world 02**

Near-black terminal, IBM Plex Mono throughout, amber `--sig`, boxed readouts. The console shows two synchronized panes: raw JSON-RPC on `[data-mcp-wire]`, formatted result on `[data-mcp-result]`. Presets for `search_courses`, `compare_courses`, `check_timetable_conflicts`, `get_grade_distribution`, plus a free-text course code input. On any network or protocol failure, render the snapshot into `[data-mcp-fallback]` with a visible `snapshot, captured <date>` label.

- [ ] **Step 8: Run both suites to verify they pass**

Run: `pnpm test && pnpm test:e2e mcp`
Expected: PASS. The live test depends on the worker being up; if it is cold, retry once before treating it as a failure.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add the ntnu-api world with a live in-page MCP client

A hand-written Streamable-HTTP client, no SDK and no dependencies, so
the page demonstrating an MCP server is itself an MCP client. Shows
JSON-RPC wire traffic beside the formatted result. Falls back to a
labelled snapshot of genuine responses when the worker is unreachable.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: World 03 — Cipherbound

**Files:**
- Create: `src/lib/dialogue.ts`, `src/worlds/cipherbound.css`, `src/worlds/cipherbound.ts`, `public/cipherbound/{trailer.webm,trailer.mp4,poster.avif}`
- Test: `test/dialogue.test.ts`

**Interfaces:**
- Consumes: `VideoFacade.astro` from Task 8.
- Produces: `createDialogue(pages: string[]): { current(): string; advance(): boolean; done(): boolean; index(): number }` — pure state machine, no DOM.

- [ ] **Step 1: Write the failing test**

Create `test/dialogue.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { createDialogue } from "../src/lib/dialogue.ts";

test("starts on the first page", () => {
  const d = createDialogue(["one", "two", "three"]);
  assert.equal(d.current(), "one");
  assert.equal(d.index(), 0);
  assert.equal(d.done(), false);
});

test("advance walks forward and reports when it moved", () => {
  const d = createDialogue(["one", "two"]);
  assert.equal(d.advance(), true);
  assert.equal(d.current(), "two");
  assert.equal(d.done(), true);
});

test("advancing past the end is a no-op", () => {
  const d = createDialogue(["only"]);
  assert.equal(d.advance(), false);
  assert.equal(d.current(), "only");
  assert.equal(d.index(), 0);
});

test("an empty script is immediately done and never throws", () => {
  const d = createDialogue([]);
  assert.equal(d.done(), true);
  assert.equal(d.current(), "");
  assert.equal(d.advance(), false);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test`
Expected: FAIL — `src/lib/dialogue.ts` does not exist.

- [ ] **Step 3: Write the dialogue machine, then the world**

Implement `createDialogue`. Then build the world: Departure Mono pixel type, CRT scanline overlay, GBA-style framed panels, the `#101820` / `#e0f8d0` palette. The dialogue box advances the page's content on click or Enter, backed by `createDialogue`. A sprite from `/sprites/player_sheet.png` walks the margin on scroll.

Transcode the trailer with the same settings as the VPL video:

```bash
mkdir -p public/cipherbound
ffmpeg -y -i ~/Videos/cipherbound_trailer.mp4 -vf "scale=1280:720:flags=lanczos" \
  -c:v libsvtav1 -crf 40 -preset 4 -g 250 -c:a libopus -b:a 96k -ac 2 \
  public/cipherbound/trailer.webm
ffmpeg -y -i ~/Videos/cipherbound_trailer.mp4 -vf "scale=1280:720:flags=lanczos" \
  -c:v libx264 -crf 26 -preset slow -profile:v high -pix_fmt yuv420p \
  -c:a aac -b:a 96k -movflags +faststart public/cipherbound/trailer.mp4
ffmpeg -y -ss 3 -i ~/Videos/cipherbound_trailer.mp4 -frames:v 1 /tmp/cb.png
convert /tmp/cb.png -resize 1280x720 -quality 82 public/cipherbound/poster.avif && rm /tmp/cb.png
```

Pixel art must not be smoothed: set `image-rendering: pixelated` on the sprite and any scaled screenshot.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test && pnpm test:e2e worlds -g cipherbound`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add the Cipherbound world with a working dialogue box

GBA-era treatment with a pure dialogue state machine driving the
page's content, plus the trailer transcoded behind the same
click-to-load facade the work page uses.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: World 04 — Black Hole, real-time lensing

**Files:**
- Create: `src/lib/lensing.ts`, `src/worlds/black-hole.css`, `src/worlds/black-hole.ts`
- Test: `test/lensing.test.ts`, `e2e/black-hole.spec.ts`

**Interfaces:**
- Consumes: `render.png` in `public/` as the no-WebGL fallback.
- Produces:
  - `FRAGMENT_SHADER: string`, `VERTEX_SHADER: string`
  - `deflection(b: number, rs: number): number` — weak-field deflection angle `2·rs/b`
  - `orbitCamera(azimuth: number, elevation: number, radius: number): { eye: [number, number, number] }`
  - `createRenderer(canvas: HTMLCanvasElement): { start(): void; stop(): void } | null` — returns `null` when WebGL2 is unavailable

- [ ] **Step 1: Write the failing test**

Create `test/lensing.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { deflection, orbitCamera, FRAGMENT_SHADER } from "../src/lib/lensing.ts";

test("deflection follows the weak-field limit 2rs/b", () => {
  assert.ok(Math.abs(deflection(100, 1) - 0.02) < 1e-9);
});

test("deflection grows as the impact parameter shrinks", () => {
  assert.ok(deflection(10, 1) > deflection(100, 1));
});

test("camera stays on its orbit radius", () => {
  const { eye } = orbitCamera(0.7, 0.3, 12);
  const r = Math.hypot(eye[0], eye[1], eye[2]);
  assert.ok(Math.abs(r - 12) < 1e-6);
});

test("elevation moves the camera vertically", () => {
  assert.ok(orbitCamera(0, 0.5, 10).eye[1] > orbitCamera(0, 0, 10).eye[1]);
});

test("the shader declares an es 3.0 version and a precision qualifier", () => {
  assert.ok(FRAGMENT_SHADER.startsWith("#version 300 es"));
  assert.match(FRAGMENT_SHADER, /precision\s+(highp|mediump)\s+float/);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test`
Expected: FAIL — `src/lib/lensing.ts` does not exist.

- [ ] **Step 3: Write the shader and camera math**

`src/lib/lensing.ts` holds the GLSL as exported strings so it is inspectable and testable without a GPU. The fragment shader raymarches null geodesics around a Schwarzschild black hole: integrate `d²u/dφ² = -u + 3/2·rs·u²` where `u = 1/r`, accumulating the bent ray direction, then sample a procedural starfield and an accretion disc. Photon sphere at `1.5·rs`, event horizon black.

Reference the physics in the existing C++ implementation at `github.com/MartinSA04/Black-Hole-Simulator` for constants and disc parameters, so the page matches the project it documents.

- [ ] **Step 4: Run the unit test to verify it passes**

Run: `pnpm test`
Expected: all five tests PASS.

- [ ] **Step 5: Write the failing degradation test**

Create `e2e/black-hole.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("renders the lensing canvas when WebGL2 is available", async ({ page }) => {
  await page.goto("/projects/black-hole/");
  const canvas = page.locator("canvas[data-lensing]");
  await expect(canvas).toBeVisible();
  const drew = await canvas.evaluate((c: HTMLCanvasElement) => {
    const gl = c.getContext("webgl2");
    if (!gl) return false;
    const px = new Uint8Array(4);
    gl.readPixels(c.width >> 1, c.height >> 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return true;
  });
  expect(drew).toBe(true);
});

test("falls back to render.png without WebGL2", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
      if (type === "webgl2" || type === "webgl") return null;
      return (orig as any).call(this, type, ...rest);
    } as typeof orig;
  });
  await page.goto("/projects/black-hole/");
  await expect(page.locator("img[src*='render.png']")).toBeVisible();
  await ctx.close();
});

test("holds a still frame under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/black-hole/");
  const a = await page.locator("canvas[data-lensing]").screenshot();
  await page.waitForTimeout(700);
  const b = await page.locator("canvas[data-lensing]").screenshot();
  expect(Buffer.compare(a, b)).toBe(0);
});
```

- [ ] **Step 6: Build world 04**

Void substrate, Newsreader display at light weight, physics readouts floating in the margins. `createRenderer` returns `null` when `getContext("webgl2")` fails, and the page then shows `render.png` — which must keep that exact filename for the RPG easter egg. Mouse and touch drag orbit the camera; under reduced motion the renderer draws exactly one frame and stops.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm test:e2e black-hole`
Expected: all three tests PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add the black hole world with real-time lensing

Raymarched null geodesics around a Schwarzschild metric in a WebGL2
fragment shader, with camera math and GLSL kept in a pure module so
they are testable without a GPU. Falls back to render.png when WebGL2
is unavailable and draws a single frame under reduced motion.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: World 05 — Game of Life Text

**Files:**
- Create: `src/worlds/game-of-life.css`, `src/worlds/game-of-life.ts`
- Test: `e2e/game-of-life.spec.ts`

**Interfaces:**
- Consumes: `parsePlan`, `step` from `src/lib/life.ts` (Task 6). No new engine.
- Produces: a canvas running the glider synthesis from `/game_of_life_plan.txt` with a generation scrubber bound to `step`.

- [ ] **Step 1: Write the failing test**

Create `e2e/game-of-life.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("the scrubber moves the simulation deterministically", async ({ page }) => {
  await page.goto("/projects/game-of-life/");
  const scrub = page.locator("[data-life-scrubber]");
  await scrub.fill("120");
  const a = await page.locator("canvas[data-life]").screenshot();
  await scrub.fill("0");
  await scrub.fill("120");
  const b = await page.locator("canvas[data-life]").screenshot();
  expect(Buffer.compare(a, b)).toBe(0);
});

test("the scrubber is keyboard operable and announces its generation", async ({ page }) => {
  await page.goto("/projects/game-of-life/");
  const scrub = page.locator("[data-life-scrubber]");
  await expect(scrub).toHaveAttribute("aria-label", /generation/i);
  await scrub.focus();
  const before = await scrub.inputValue();
  await page.keyboard.press("ArrowRight");
  expect(await scrub.inputValue()).not.toBe(before);
});

test("links to the live browser version", async ({ page }) => {
  await page.goto("/projects/game-of-life/");
  await expect(page.locator("a[href*='conway.martinsundal.no']")).toHaveCount(1);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:e2e game-of-life`
Expected: FAIL — no scrubber.

- [ ] **Step 3: Build world 05**

Graph-paper substrate with a hairline grid, IBM Plex Mono throughout, plotter-line aesthetic. The canvas runs the plan from `/game_of_life_plan.txt`. The scrubber is a native `range` input bound to a generation count; moving it recomputes from generation zero so any position is reproducible. Under reduced motion the canvas renders the settled generation and does not animate.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:e2e game-of-life`
Expected: all three tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add the Game of Life world with a generation scrubber

Reuses the pure engine from src/lib/life.ts. The scrubber recomputes
from generation zero so every position is reproducible, and the canvas
renders the settled board without animating under reduced motion.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: Generated OG images

**Files:**
- Create: `src/pages/og/[slug].png.ts`, `src/lib/og.ts`
- Test: `e2e/og.spec.ts`

**Interfaces:**
- Consumes: `orderedProjects()`, each project's `world` tokens.
- Produces: `ogSvg(opts: { title: string; index: number; tags: string[]; world: World }): string` — a 1200×630 SVG in that world's tokens. The route rasterizes it with `@resvg/resvg-js` at build time.

- [ ] **Step 1: Write the failing test**

Create `e2e/og.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const SLUGS = ["study-companion", "ntnu-api", "cipherbound", "black-hole", "game-of-life", "home", "work"];

for (const slug of SLUGS) {
  test(`og image for ${slug} is a 1200x630 png`, async ({ request }) => {
    const res = await request.get(`/og/${slug}.png`);
    expect(res.ok()).toBe(true);
    expect(res.headers()["content-type"]).toContain("image/png");
    const buf = await res.body();
    expect(buf.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(buf.readUInt32BE(16)).toBe(1200);
    expect(buf.readUInt32BE(20)).toBe(630);
  });
}

test("each page points at its own og image", async ({ page }) => {
  await page.goto("/projects/cipherbound/");
  const og = await page.locator("meta[property='og:image']").getAttribute("content");
  expect(og).toBe("https://martinsundal.no/og/cipherbound.png");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test:e2e og`
Expected: FAIL — `/og/*.png` 404s.

- [ ] **Step 3: Write the generator**

`ogSvg` composes the micrographics vocabulary — `IDX_0n`, hairline rules, a barcode strip, the project name at display size, tags along the bottom — using only that world's four tokens. Fonts must be embedded, since resvg has no access to the browser's font stack; load the woff2 files from `public/fonts/` and register them via resvg's `font.fontFiles` option.

The route exports `getStaticPaths()` over the five projects plus `home` and `work`, and returns the PNG buffer with `content-type: image/png`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:e2e og`
Expected: all eight tests PASS.

- [ ] **Step 5: Visually inspect every generated card**

Open all seven PNGs and confirm each reads correctly at small size, that text is not clipped, and that contrast holds. A card that is illegible in a Slack preview has failed regardless of what the test says.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: generate per-page OG images in each world's own tokens

Composed as SVG from the micrographics vocabulary and rasterized at
build time with resvg, with fonts embedded so the output does not
depend on a system font stack.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: Full verification and cleanup

**Files:**
- Create: `e2e/a11y.spec.ts`, `README.md` (rewrite)
- Delete: `martin_plan.txt`, `game_of_life_plan.txt` root copies if any survive; `docs/superpowers` stays.

**Interfaces:**
- Consumes: every prior task.
- Produces: a verified, mergeable branch.

- [ ] **Step 1: Write the accessibility and contrast test**

Create `e2e/a11y.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const PAGES = ["/", "/work/", "/projects/study-companion/", "/projects/ntnu-api/",
  "/projects/cipherbound/", "/projects/black-hole/", "/projects/game-of-life/"];

for (const path of PAGES) {
  for (const theme of ["light", "dark", "deep-space"]) {
    test(`${path} @ ${theme}: body text clears WCAG AA`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("msa-theme", t), theme);
      await page.goto(path);
      const ratio = await page.evaluate(() => {
        const lum = (c: string) => {
          const [r, g, b] = c.match(/\d+/g)!.slice(0, 3).map(Number)
            .map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const el = document.querySelector("main p") ?? document.body;
        const s = getComputedStyle(el);
        let bgEl: Element | null = el;
        let bg = "rgb(255, 255, 255)";
        while (bgEl) {
          const c = getComputedStyle(bgEl).backgroundColor;
          if (c && !c.includes("rgba(0, 0, 0, 0)")) { bg = c; break; }
          bgEl = bgEl.parentElement;
        }
        const [a, b] = [lum(s.color), lum(bg)].sort((x, y) => y - x);
        return (a + 0.05) / (b + 0.05);
      });
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  }

  test(`${path}: every interactive element is reachable and focus is visible`, async ({ page }) => {
    await page.goto(path);
    const count = await page.locator("a, button, input, [tabindex='0']").count();
    expect(count).toBeGreaterThan(0);
    await page.keyboard.press("Tab");
    const outline = await page.locator(":focus").evaluate((el) => {
      const s = getComputedStyle(el);
      return s.outlineStyle !== "none" || s.boxShadow !== "none";
    });
    expect(outline).toBe(true);
  });
}
```

- [ ] **Step 2: Run the full suite**

Run: `pnpm test && pnpm test:e2e && pnpm typecheck && pnpm lint`
Expected: everything PASS. Fix what fails.

- [ ] **Step 3: Run Lighthouse against every page**

```bash
pnpm build && pnpm preview --port 4321 &
for p in "" work projects/study-companion projects/ntnu-api projects/cipherbound projects/black-hole projects/game-of-life; do
  npx -y lighthouse "http://localhost:4321/$p" --preset=desktop --quiet \
    --chrome-flags="--headless" --output=json --output-path="/tmp/lh-${p//\//-}.json"
done
```

Read each report. Target is ≥ 98 performance and 100 accessibility on mobile. Investigate and fix anything short of that; do not adjust the target.

- [ ] **Step 4: Screenshot every page at both breakpoints in every theme**

Drive Chrome over CDP with `Emulation.setDeviceMetricsOverride` for the 390px captures — `--window-size` reports false overflow on this setup. Use `captureBeyondViewport: true` for full-page shots, since the sticky header's `backdrop-filter` greys out tall `--screenshot` captures. Review all of them.

- [ ] **Step 5: Verify the preserved behaviour by hand**

Confirm the hero Game of Life converges to "MARTIN". rAF does not advance under headless virtual time, so step the simulation synchronously in a throwaway copy of the built page rather than waiting on a screenshot. Then exercise the Konami code on the built home page and confirm both the RPG spawn and the `render.png` easter egg.

- [ ] **Step 6: Validate structured data**

Run every one of the seven URLs through Google's Rich Results Test and the schema.org validator. Fix all errors. Warnings are acceptable only where the missing field genuinely does not apply.

- [ ] **Step 7: Check every external link**

Extract all external hrefs from `dist/` and request each one, flagging any non-2xx.

- [ ] **Step 8: Audit the work page against the confidentiality constraint**

Trace every factual claim on `/work/` to a published Aker source. Confirm no excluded path was read or referenced, no Aker mark is reproduced, and neither the "10x faster" nor "opened 2024" claim appears.

- [ ] **Step 9: Rewrite the README**

Document the stack, how to run and test, the world-token system, and the two manual steps: switching the Pages source to "GitHub Actions", and the confidentiality boundary around the work page.

- [ ] **Step 10: Commit and open the PR**

```bash
git add -A
git commit -m "$(cat <<'EOF'
test: add accessibility suite and complete final verification

Contrast, keyboard reachability and focus visibility across all seven
pages in all three themes, plus Lighthouse, structured-data
validation, link checking, and a confidentiality audit of the work
page.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
git push -u origin redesign/micrographics
```

Open a PR against `main`. **Do not merge** — Martin merges. The PR body must state that the repository's Pages source has to be switched from "Deploy from a branch" to "GitHub Actions" before the site will update.

---

## Self-Review

**Spec coverage.** Every spec section maps to a task: architecture and deploy → 1; design language, kernel, fonts → 2; single source of truth and collection schema → 3; SEO and rich results → 4 and 14; theme, chrome, navigation → 5; home page and the preserved Game of Life → 6; preserved RPG → 7; work page, confidentiality, published facts, video → 8; the five worlds → 9–13; quality bar and the eight-step verification plan → 15.

**Deviations from the spec, deliberate.** The spec says Astro 5 and does not name a test runner; this plan uses Astro 6, pnpm, `node --test` and Playwright to match the toolchain already in use in `study_companion`. The spec's `sitemap.xml` becomes `sitemap-index.xml`, which is what `@astrojs/sitemap` emits, and `robots.txt` is updated to match.

**Placeholder scan.** No TBDs. Every code step carries real code. Task 3 step 6 and Task 8 step 4 direct the implementer to named source files for copy rather than inlining prose, which is a sourcing instruction, not a placeholder — the copy is written at implementation time from those sources, and unsourceable claims are to be flagged rather than invented.

**Type consistency.** `parsePlan`/`step` (Task 6) are reused unchanged by Task 13. `McpClient` and `parseSseFrames` (Task 10) are used nowhere else. `VideoFacade.astro` (Task 8) is reused by Task 11. `projectGraph`/`homeGraph`/`workGraph` (Task 4) are consumed by Tasks 6, 8, and 9. World slugs are identical everywhere: `study-companion`, `ntnu-api`, `cipherbound`, `black-hole`, `game-of-life`. The `--sig` values in Task 3's table match Task 9's `WORLDS` fixture exactly.
