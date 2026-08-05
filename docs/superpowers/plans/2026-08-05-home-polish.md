# Home Polish, Icon Set and RPG Removal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every text character doing an icon's job with drawn marks, polish the home page, and delete the Konami RPG.

**Architecture:** A new `Icon.astro` joins the six existing micrographics primitives in `src/components/micro/`, subject to the same rule as the rest of the kit — it draws only in `currentColor`, so it inherits whatever world it lands in. The home page's faults are fixed in place; its structure does not change. The RPG is deleted outright, which also frees four unrelated files of constraints they carry only for its sake.

**Tech Stack:** Astro 6, static output. Vanilla TS, no framework, no CSS framework. `node --test` for pure modules, Playwright for anything needing a render.

## Global Constraints

- **Four tokens only.** Every component draws in terms of `--sub`, `--ink`, `--hair`, `--sig` and nothing else. Icons use `currentColor`, never a token directly, so they follow the text they sit beside.
- **`--rule` is the hairline width.** Any 1px line, including an icon stroke, resolves to it or matches it visually.
- **Derived tokens must be re-derived inside a world.** Custom properties are substituted where they are _declared_; a `--muted` declared at `:root` resolves against the root theme and inherits down as a fixed colour. See `src/styles/project.css`.
- **Prettier is the formatter.** `pnpm lint` is `prettier --check` over `{src,test,e2e,scripts}/**/*.{ts,astro,mjs}` and `*.{ts,mjs,json,md}`. Run `npx prettier --write` on touched files before committing.
- **Playwright runs one worker locally.** Never pass `--workers` above 1 on this machine; it is the user's workstation. `playwright.config.ts` already sets it.
- **`public/sprites/player_sheet.png` must survive.** `src/worlds/cipherbound.css:218` uses it for the sprite that walks the Cipherbound page's margin, which is a separate feature from the RPG and stays.
- **Board facts, measured, not guessed.** The hero board is 356×192. The settled word's bounding box is x 75–280 (206 cells wide), y 77–114 (38 cells tall). It first becomes a still life at generation 276. `206 / 356 = 57.87%`.

---

### Task 1: Delete the RPG

Nothing else depends on this task, and everything after it touches fewer files once it is done. It goes first.

**Files:**

- Delete: `src/scripts/rpg.js`, `src/scripts/konami.ts`, `e2e/rpg.spec.ts`, `public/sprites/girl_sheet.png`
- Modify: `src/pages/index.astro:52-61`, `src/components/home/Hero.astro:6-10`, `src/components/home/ProjectIndex.astro:27-31,47-55`, `src/pages/projects/black-hole.astro:23`, `e2e/home.spec.ts:47-52`, `e2e/theme.spec.ts:56-59`, `README.md:80-89`

**Interfaces:**

- Consumes: nothing.
- Produces: nothing. `window.MSA_RPG` ceases to exist.

- [ ] **Step 1: Confirm the current suite passes, so a later failure is attributable**

Run: `pnpm test && pnpm typecheck`
Expected: PASS. (`pnpm test:e2e` is run at the end of this task, not now — it takes minutes.)

- [ ] **Step 2: Delete the files**

```bash
git rm src/scripts/rpg.js src/scripts/konami.ts e2e/rpg.spec.ts public/sprites/girl_sheet.png
```

- [ ] **Step 3: Remove the RPG boot from the home page**

In `src/pages/index.astro`, delete the trailing comment block and `<script>` — everything from the `{` on line 52 through `</script>` on line 61:

```astro
{
  /* Konami easter egg. Home page only — the RPG's collision model and spawn
      point are built from this page's .card / .project-card / [data-rpg-spawn]
      elements. */
}
<script>
  import "../scripts/rpg.js";
  import { initKonami } from "../scripts/konami.ts";
  initKonami();
</script>
```

`<Contact />` becomes the last child of `<Base>`.

- [ ] **Step 4: Free the hero of `id="home"`**

In `src/components/home/Hero.astro`, delete the comment block on lines 6-9 and drop the id from the section:

```astro
<section class="hero"></section>
```

- [ ] **Step 5: Free the project index of the spawn hook**

In `src/components/home/ProjectIndex.astro`, drop the `data-rpg-spawn` attribute so the `<li>` reads:

```astro
<li class="project-card card" style={style}></li>
```

`entry` is still used by the `href` and the `data-motif`, so no other change is needed. Then trim the plate comment to the part that is still true:

```astro
{
  /* Every row gets a plate, drawn in that world's own four
                    tokens, so five rows read as five identities rather than
                    five strips. Two projects have a real image and it fills
                    the plate; the rest get the world's texture. */
}
```

- [ ] **Step 6: Release the black hole render's filename**

In `src/pages/projects/black-hole.astro`, delete line 23 — `{/* The filename must stay render.png: the Konami RPG selects on it. */}`. Leave the file itself named `render.png`; `src/content/projects/black-hole.md:34` and `e2e/black-hole.spec.ts` both reference it and neither changes.

- [ ] **Step 7: Delete the two tests that exist only for the RPG**

From `e2e/home.spec.ts`, remove:

```ts
test("keeps the RPG hook selectors", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".card").first()).toBeVisible();
  await expect(page.locator(".project-card").first()).toBeVisible();
  await expect(page.locator("[data-rpg-spawn] img")).toHaveCount(1);
});
```

From `e2e/theme.spec.ts`, remove:

```ts
test("keeps .site-header for the RPG", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".site-header")).toHaveCount(1);
});
```

- [ ] **Step 8: Prove nothing references the RPG any more**

Run: `grep -rn -i 'rpg\|konami\|MSA_RPG\|girl_sheet' src/ e2e/ test/ scripts/ README.md`
Expected: only three hits, all legitimate prose about the Cipherbound game itself — `src/content/projects/cipherbound.md` lines 5 and 46, which describe the project as a tile-based RPG. If `README.md` still appears, Step 9 has not been done yet.

- [ ] **Step 9: Rewrite the README's incidental-dependencies section**

Replace the whole `## Things that look incidental but are not` section in `README.md` with:

```markdown
## Things that look incidental but are not

- **The hero Game of Life converges to "MARTIN"** and becomes a still life at
  generation 276. `test/life.test.ts` asserts the board is stable there and
  that the settled cells sit in the centre band the layout expects.
- **`--life-cell`** is read by `src/lib/life.ts` to colour live cells.
```

Task 5 adds the overscale note to the first bullet.

- [ ] **Step 10: Run the full suite**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e`
Expected: PASS, with the `rpg.spec.ts` cases gone from the run. If `lint` fails, run `npx prettier --write` on the touched files and re-run.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor: remove the Konami RPG

It reached into the home page's markup for its collision model, which is
why Hero.astro carried an id that meant nothing to the hero, ProjectIndex
tagged a row with data-rpg-spawn, black-hole.astro forbade a rename, and
two specs asserted selectors for a feature they never mention.

player_sheet.png stays: the Cipherbound page's margin sprite is a separate
feature and is unaffected."
```

---

### Task 2: The Icon primitive

**Files:**

- Create: `src/components/micro/Icon.astro`
- Modify: `src/pages/kitchen-sink.astro`
- Test: `e2e/kernel.spec.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `Icon.astro`, default export, props `{ name: IconName; size?: number; class?: string }` where

  ```ts
  type IconName =
    | "arrow-right"
    | "caret-down"
    | "theme-light"
    | "theme-dark"
    | "theme-deep-space";
  ```

  It renders one `<svg data-micro="icon" data-icon={name} aria-hidden="true" focusable="false">`. `size` defaults to `16` and sets both `width` and `height` in px. Tasks 3, 4 and 5 all consume it.

- [ ] **Step 1: Write the failing test**

Append to `e2e/kernel.spec.ts`:

```ts
test("every icon renders as an svg that inherits currentColor", async ({
  page,
}) => {
  await page.goto("/kitchen-sink/");
  const icons = page.locator('[data-micro="icon"]');
  await expect(icons.first()).toBeVisible();

  const names = await icons.evaluateAll((els) =>
    els.map((e) => e.getAttribute("data-icon")),
  );
  for (const name of [
    "arrow-right",
    "caret-down",
    "theme-light",
    "theme-dark",
    "theme-deep-space",
  ]) {
    expect(names).toContain(name);
  }

  // Hidden from the accessibility tree: every call site names itself in text
  // or on the parent control.
  for (const attr of await icons.evaluateAll((els) =>
    els.map((e) => e.getAttribute("aria-hidden")),
  )) {
    expect(attr).toBe("true");
  }

  // No hard-coded colour anywhere in the kit, or an icon would go invisible
  // in one of the five worlds.
  const painted = await icons.evaluateAll((els) =>
    els.flatMap((e) =>
      [...e.querySelectorAll("*")].map((n) => ({
        fill: n.getAttribute("fill"),
        stroke: n.getAttribute("stroke"),
      })),
    ),
  );
  for (const p of painted) {
    for (const v of [p.fill, p.stroke]) {
      if (v) expect(["currentColor", "none"]).toContain(v);
    }
  }
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:e2e e2e/kernel.spec.ts --project=desktop`
Expected: FAIL — the locator finds nothing, so `expect(icons.first()).toBeVisible()` times out.

- [ ] **Step 3: Write the component**

Create `src/components/micro/Icon.astro`:

```astro
---
/**
 * The kit's only pictorial primitive. Everything else here is a rule, a box or
 * a strip; these are the five marks that genuinely need a path.
 *
 * Authored on a 24-unit grid at stroke-width 1.5, so at the default 16px a
 * stroke lands on 1px and matches --rule. Painted in currentColor only: an
 * icon inherits whatever world and whatever text colour it sits in, which is
 * the same contract every other primitive keeps with the four tokens.
 */
export type IconName =
  | "arrow-right"
  | "caret-down"
  | "theme-light"
  | "theme-dark"
  | "theme-deep-space";

interface Props {
  name: IconName;
  /** px, applied to both axes. */
  size?: number;
  class?: string;
}

const { name, size = 16, class: className } = Astro.props;
---

<svg
  class:list={["micro-icon", className]}
  data-micro="icon"
  data-icon={name}
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="square"
  stroke-linejoin="miter"
  aria-hidden="true"
  focusable="false"
>
  {
    name === "arrow-right" && (
      <>
        <path d="M3 12h17" />
        <path d="M13.5 5.5 20 12l-6.5 6.5" />
      </>
    )
  }
  {name === "caret-down" && <path d="M5 9l7 7 7-7" />}
  {
    name === "theme-light" && (
      <>
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M19.4 4.6l-2.1 2.1M6.7 17.3l-2.1 2.1" />
      </>
    )
  }
  {
    /* One closed path rather than a masked disc: a mask needs two shapes to
      agree at 16px and they do not. */
    name === "theme-dark" && (
      <path d="M20 14.5A9 9 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    )
  }
  {
    /* The theme is named after the black hole world; the mark echoes it. */
    name === "theme-deep-space" && (
      <>
        <circle cx="12" cy="12" r="3.5" />
        <ellipse cx="12" cy="12" rx="10" ry="4.5" />
      </>
    )
  }
</svg>

<style>
  .micro-icon {
    display: inline-block;
    flex: none;
    vertical-align: middle;
  }
</style>
```

- [ ] **Step 4: Put every icon in the kit's proof page**

`src/pages/kitchen-sink.astro` is the page that proves the architecture holds, so it must render all five, in all three themes and under the world override. The page styles everything inline; follow that rather than introducing a class.

Import it alongside the other micro components:

```astro
import Icon from "../components/micro/Icon.astro";
```

In the per-theme flex row at lines 44-51, after the two `Barcode`s:

```astro
<Icon name="arrow-right" />
<Icon name="caret-down" />
<Icon name="theme-light" />
<Icon name="theme-dark" />
<Icon name="theme-deep-space" />
<Icon name="arrow-right" size={24} />
```

And in the world-override row at lines 79-85, after the `Barcode`, so the icons are proved against a fifth palette too:

```astro
<Icon name="arrow-right" />
<Icon name="theme-deep-space" />
```

- [ ] **Step 5: Run the test and watch it pass**

Run: `pnpm test:e2e e2e/kernel.spec.ts --project=desktop`
Expected: PASS.

- [ ] **Step 6: Check the icons in every theme and world**

Run: `SHOTS=1 pnpm test:e2e e2e/shots.spec.ts --project=desktop --grep 'kitchen-sink'`
Then open `shots/desktop/kitchen-sink-light.png`, `-dark.png` and `-deep-space.png` and confirm all six marks are visible and legible in each, with strokes reading as hairlines rather than as heavy lines.

- [ ] **Step 7: Commit**

```bash
npx prettier --write src/components/micro/Icon.astro src/pages/kitchen-sink.astro e2e/kernel.spec.ts
git add src/components/micro/Icon.astro src/pages/kitchen-sink.astro e2e/kernel.spec.ts
git commit -m "feat: add the Icon primitive to the micrographics kit

Five marks on a 24-unit grid at stroke-width 1.5, so a stroke lands on 1px
at the default size and matches --rule. currentColor only, so an icon
inherits the world it lands in like every other primitive."
```

---

### Task 3: Replace the arrows and the two drawn marks

**Files:**

- Modify: `src/components/home/Contact.astro:41-43`, `src/components/home/WorkBand.astro:28`, `src/components/home/ProjectIndex.astro:69-71`, `src/components/project/ProjectLinks.astro:26`, `src/pages/work.astro:82`, `src/pages/projects/cipherbound.astro:52-54`, `src/worlds/cipherbound.css:165-172`, `src/worlds/study-companion.css:239-244`, `src/worlds/black-hole.ts:132`
- Test: `e2e/kernel.spec.ts`

**Interfaces:**

- Consumes: `Icon.astro` from Task 2.
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

This is the test that keeps the glyphs from creeping back. Append to `e2e/kernel.spec.ts`:

```ts
// The characters that used to stand in for icons. Middots, ©, // and $ are
// typography and are deliberately absent from this list.
const ICON_GLYPHS = ["→", "▼", "□", "◐", "♥", "♡"];

for (const path of [
  "/",
  "/work/",
  "/projects/study-companion/",
  "/projects/ntnu-api/",
  "/projects/cipherbound/",
  "/projects/black-hole/",
  "/projects/game-of-life/",
]) {
  test(`no glyph stands in for an icon on ${path}`, async ({ page }) => {
    await page.goto(path);
    // Rendered text plus generated content, since two of these lived in
    // CSS ::before rules where textContent would never see them.
    const found = await page.evaluate((glyphs) => {
      const hits: string[] = [];
      const walk = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_ELEMENT,
      );
      const check = (s: string, where: string) => {
        for (const g of glyphs)
          if (s.includes(g)) hits.push(`${g} in ${where}`);
      };
      check(document.body.innerText, "text");
      let node = walk.currentNode as Element | null;
      while (node) {
        for (const pseudo of ["::before", "::after"]) {
          const c = getComputedStyle(node, pseudo).content;
          if (c && c !== "none") check(c, `${node.tagName}${pseudo}`);
        }
        node = walk.nextNode() as Element | null;
      }
      return hits;
    }, ICON_GLYPHS);
    expect(found).toEqual([]);
  });
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:e2e e2e/kernel.spec.ts --project=desktop`
Expected: FAIL on `/`, `/work/`, `/projects/cipherbound/` and `/projects/study-companion/`, reporting `→`, `▼` and `□`. `/projects/ntnu-api/`, `/projects/black-hole/` and `/projects/game-of-life/` should already pass — the black hole `→` is painted into a canvas, which this test cannot see, and is handled in Step 8 regardless.

- [ ] **Step 3: Replace the four wrapped arrows**

Each of these already wraps the glyph in an `aria-hidden` span, so the span goes and the `Icon` takes its place — `Icon` is `aria-hidden` itself.

In `src/components/home/Contact.astro`, add `import Icon from "../micro/Icon.astro";` to the frontmatter and replace lines 41-43:

```astro
<Icon name="arrow-right" class="arrow" />
```

In `src/components/home/WorkBand.astro`, add `import Icon from "../micro/Icon.astro";` and replace line 28:

```astro
<Icon name="arrow-right" />
```

In `src/components/home/ProjectIndex.astro`, add `import Icon from "../micro/Icon.astro";` and replace lines 69-71:

```astro
<Icon name="arrow-right" class="go" size={20} />
```

In `src/components/project/ProjectLinks.astro`, add `import Icon from "../micro/Icon.astro";` and replace line 26:

```astro
<Icon name="arrow-right" />
```

- [ ] **Step 4: Fix the CSS that styled those glyphs as text**

`.arrow` in `Contact.astro` and `.go` in `ProjectIndex.astro` set `font-size` to size the glyph. An SVG ignores that, so the size now comes from the `size` prop and the rules keep only colour and transform. In `Contact.astro`:

```css
.arrow {
  color: var(--muted);
  transition:
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.25s ease;
}
```

(unchanged — it never set a font-size). In `ProjectIndex.astro`, drop the `font-size` line so `.go` reads:

```css
.go {
  color: var(--muted);
  transition:
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
```

- [ ] **Step 5: Replace the inline arrow in the work page's link**

`src/pages/work.astro:82` has the glyph inside the link text, where it is read aloud. Add `import Icon from "../components/micro/Icon.astro";` to the frontmatter and replace the link with:

```astro
<a class="aker-link" href={AKER_PAGE} rel="noopener"
  >Verdal production site <Icon name="arrow-right" /></a
>
```

and add:

```css
.aker-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
```

- [ ] **Step 6: Replace the Cipherbound caret**

In `src/pages/projects/cipherbound.astro`, add `import Icon from "../../components/micro/Icon.astro";` and give the Next button its mark:

```astro
<button class="cb-next" type="button" data-cb-next aria-label="Next line">
  Next <Icon name="caret-down" size={14} />
</button>
```

In `src/worlds/cipherbound.css`, delete the `content: "\25bc"` rule at line 169 along with its now-empty `::after` selector block, and give the button the layout the icon needs:

```css
.cb-next {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
```

Read lines 160-175 first — merge that into the existing `.cb-next` rule rather than adding a second one.

- [ ] **Step 7: Draw the study companion checkbox instead of typing it**

In `src/worlds/study-companion.css`, replace the rule at lines 241-244:

```css
.sc-goals li::before {
  content: "";
  width: 0.62em;
  height: 0.62em;
  border: var(--rule) solid var(--sig);
  flex: none;
  translate: 0 0.1em;
}
```

A hairline box drawn by the same mechanism as every other hairline on the site, inheriting `--rule`. The parent `.sc-goals li` is already `display: flex` with `align-items: baseline`, so `flex: none` stops it collapsing and the `translate` sits it on the text's baseline.

- [ ] **Step 8: Draw the black hole diagram's arrowhead**

`src/worlds/black-hole.ts:132` paints `"light in →"` as canvas text on a diagram otherwise made of lines. Replace it with the label plus a real arrowhead:

```ts
ctx!.fillText("light in", 10 * dpr, 14 * dpr);
// The arrowhead belongs to the diagram, not to the font. Positioned
// just past the label's advance width at this size.
const ax = 10 * dpr + ctx!.measureText("light in").width + 6 * dpr;
const ay = 10 * dpr;
ctx!.beginPath();
ctx!.moveTo(ax, ay);
ctx!.lineTo(ax + 9 * dpr, ay);
ctx!.moveTo(ax + 5 * dpr, ay - 4 * dpr);
ctx!.lineTo(ax + 9 * dpr, ay);
ctx!.lineTo(ax + 5 * dpr, ay + 4 * dpr);
ctx!.stroke();
```

Read the surrounding lines first: match whatever `strokeStyle`, `lineWidth` and `fillStyle` the neighbouring diagram strokes already set, and set them here if the preceding code left them on a different value.

- [ ] **Step 9: Run the test and watch it pass**

Run: `pnpm test:e2e e2e/kernel.spec.ts --project=desktop`
Expected: PASS on all seven pages.

- [ ] **Step 10: Run the suites that cover the pages just touched**

Run: `pnpm typecheck && pnpm test:e2e --project=desktop`
Expected: PASS. `a11y.spec.ts` in particular must stay green — it walks all seven pages in all three themes.

- [ ] **Step 11: Look at the black hole diagram, which no test can judge**

Run: `SHOTS=1 pnpm test:e2e e2e/shots.spec.ts --project=desktop --grep 'black-hole'`
Open `shots/desktop/black-hole-deep-space.png` and confirm the arrowhead sits beside the label at the same weight as the diagram's other lines, and does not collide with the ray it annotates.

- [ ] **Step 12: Commit**

```bash
npx prettier --write src/ e2e/
git add -A
git commit -m "refactor: draw the icons instead of typing them

Five arrows, a caret, a checkbox and a canvas arrowhead were characters
standing in for marks, so their weight and baseline came from whichever
font resolved and nothing lined up with the hairlines around them. The
checkbox and the arrowhead are drawn rather than iconised: a box made of
--rule and a head made of the diagram's own lines are both more correct
than a picture of one would be.

e2e/kernel.spec.ts now fails if a glyph comes back, including from a CSS
::before where textContent would never see it."
```

---

### Task 4: The theme toggle

**Files:**

- Modify: `src/layouts/Base.astro:141-151,241-259`
- Test: `e2e/theme.spec.ts`

**Interfaces:**

- Consumes: `Icon.astro` from Task 2.
- Produces: nothing. `src/scripts/theme.ts` is **not** modified — it keeps sole ownership of the `aria-label`, and the blocking script in `<head>` already sets `data-theme` before first paint, so the correct icon is correct on the first frame with no JS involvement.

- [ ] **Step 1: Write the failing test**

Append to `e2e/theme.spec.ts`:

```ts
test("the toggle shows the active theme's own mark", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");

  const shown = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("#theme-toggle [data-icon]")]
        .filter((e) => getComputedStyle(e).display !== "none")
        .map((e) => e.getAttribute("data-icon")),
    );

  // Exactly one mark at a time, and it names the theme in effect.
  expect(await shown()).toEqual(["theme-light"]);
  await page.locator("#theme-toggle").click();
  expect(await shown()).toEqual(["theme-dark"]);
  await page.locator("#theme-toggle").click();
  expect(await shown()).toEqual(["theme-deep-space"]);
  await page.locator("#theme-toggle").click();
  expect(await shown()).toEqual(["theme-light"]);
});

test("the right mark is up before the page has run any script", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("msa-theme", "deep-space"),
  );
  await page.goto("/", { waitUntil: "commit" });
  // data-theme is set by the blocking head script, so CSS alone decides this.
  expect(await page.locator("html").getAttribute("data-theme")).toBe(
    "deep-space",
  );
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:e2e e2e/theme.spec.ts --project=desktop`
Expected: FAIL — `shown()` returns `[]`, because the button contains a `◐` in a span and no `[data-icon]` element.

- [ ] **Step 3: Put all three marks in the button**

In `src/layouts/Base.astro`, add `import Icon from "../components/micro/Icon.astro";` to the frontmatter, then replace the button on lines 147-149:

```astro
<button id="theme-toggle" type="button" aria-label="Toggle theme">
  <Icon name="theme-light" size={15} />
  <Icon name="theme-dark" size={15} />
  <Icon name="theme-deep-space" size={15} />
</button>
```

The accessible name stays on the button and `theme.ts` keeps updating it; the marks are all `aria-hidden`, so assistive tech sees one control with one name regardless of which is painted.

- [ ] **Step 4: Let CSS pick the one that matches**

Add to the `<style>` block in `Base.astro`, after the existing `#theme-toggle` rules:

```css
/* All three ship in the markup and CSS paints one. The blocking script
         in <head> sets data-theme before first paint, so the mark is right on
         the first frame without waiting for theme.ts to load. */
#theme-toggle :global(.micro-icon) {
  display: none;
}

:global([data-theme="light"]) #theme-toggle :global([data-icon="theme-light"]),
:global([data-theme="dark"]) #theme-toggle :global([data-icon="theme-dark"]),
:global([data-theme="deep-space"])
  #theme-toggle
  :global([data-icon="theme-deep-space"]) {
  display: block;
}
```

`:global()` is required on the `[data-theme]` and `[data-icon]` parts: Astro scopes component styles by adding a hash attribute to elements in _this_ file, and `<html>` is not one of them, nor is the `<svg>` inside `Icon.astro`.

- [ ] **Step 5: Run the test and watch it pass**

Run: `pnpm test:e2e e2e/theme.spec.ts --project=desktop`
Expected: PASS, including the pre-existing cycle, persistence and aria-label cases.

- [ ] **Step 6: Confirm the header still holds its shape**

Run: `SHOTS=1 pnpm test:e2e e2e/shots.spec.ts --project=desktop --grep 'home'`
Open the three `shots/desktop/home-*.png` and check the toggle: the mark should be centred in its 2rem box, sit at hairline weight against the border, and differ between the three files.

- [ ] **Step 7: Commit**

```bash
npx prettier --write src/layouts/Base.astro e2e/theme.spec.ts
git add src/layouts/Base.astro e2e/theme.spec.ts
git commit -m "feat: the theme toggle shows which theme is on

It was a single ◐ at whatever weight the mono fallback gave it, saying
nothing about which of the three themes was active — state theme.ts
already tracked and wrote into the aria-label. All three marks ship in the
markup and CSS paints the one matching data-theme, which the blocking head
script sets before first paint, so no JavaScript is involved."
```

---

### Task 5: The hero band

**Files:**

- Modify: `src/lib/life.ts`, `src/components/home/Hero.astro`, `README.md`
- Test: `test/life.test.ts`, `e2e/home.spec.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces: two additions to `src/lib/life.ts`, both consumed only by `Hero.astro`:

  ```ts
  /** True when one step of the board reproduces it exactly. */
  export function isStillLife(
    cells: Uint8Array,
    width: number,
    height: number,
  ): boolean;
  ```

  and a new optional field on `LifeSceneOptions`:

  ```ts
  /**
   * Called after every generation, and once more when the board settles.
   * `settled` is true from the first generation that reproduces itself.
   */
  onGeneration?: (generation: number, settled: boolean) => void;
  ```

- [ ] **Step 1: Write the failing test for the pure part**

Append to `test/life.test.ts`:

```ts
test("isStillLife recognises a block and rejects a blinker", () => {
  const block = new Uint8Array(16);
  block[1 * 4 + 1] = block[1 * 4 + 2] = block[2 * 4 + 1] = block[2 * 4 + 2] = 1;
  assert.equal(isStillLife(block, 4, 4), true);

  const blinker = new Uint8Array(25);
  blinker[1 * 5 + 2] = blinker[2 * 5 + 2] = blinker[3 * 5 + 2] = 1;
  assert.equal(isStillLife(blinker, 5, 5), false);
});

test("the hero plan first becomes a still life at generation 276", () => {
  const plan = parsePlan(readFileSync("public/martin_plan.txt", "utf8"));
  let cells = plan.cells;
  let first = null;
  for (let i = 0; i < 300; i++) {
    if (isStillLife(cells, plan.width, plan.height)) {
      first = i;
      break;
    }
    cells = step(cells, plan.width, plan.height);
  }
  // The readout says STILL LIFE at this number, and Hero.astro's layout is
  // built around the word the board holds from here on.
  assert.equal(first, 276);
});

test("the settled word is 206 cells wide, which sets the hero overscale", () => {
  const plan = parsePlan(readFileSync("public/martin_plan.txt", "utf8"));
  let cells = plan.cells;
  for (let i = 0; i < 276; i++) cells = step(cells, plan.width, plan.height);

  let minX = plan.width;
  let maxX = -1;
  for (let y = 0; y < plan.height; y++) {
    for (let x = 0; x < plan.width; x++) {
      if (!cells[y * plan.width + x]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
  }
  // Hero.astro scales the canvas to 166% so the word lands at 96% of the
  // measure: 1.66 * 206/356 = 0.96. If this width changes, that changes.
  assert.equal(maxX - minX + 1, 206);
});
```

Add `isStillLife` to the existing import at the top of the file.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test`
Expected: FAIL — `isStillLife is not a function`.

- [ ] **Step 3: Implement `isStillLife`**

In `src/lib/life.ts`, after `countLive`:

```ts
/**
 * True when one step of the board reproduces it exactly. Used to stop the hero
 * stepping a 68,352-cell board forever once it has settled, and to decide when
 * the readout says STILL LIFE.
 */
export function isStillLife(
  cells: Uint8Array,
  width: number,
  height: number,
): boolean {
  const next = step(cells, width, height);
  for (let i = 0; i < cells.length; i++) {
    if (next[i] !== cells[i]) return false;
  }
  return true;
}
```

- [ ] **Step 4: Run the pure tests and watch them pass**

Run: `pnpm test`
Expected: PASS, all three new cases included.

- [ ] **Step 5: Wire the callback and the halt into the scene**

In `src/lib/life.ts`, add the option to `LifeSceneOptions`:

```ts
  /**
   * Called after every generation, and once more when the board settles.
   * `settled` is true from the first generation that reproduces itself.
   */
  onGeneration?: (generation: number, settled: boolean) => void;
```

Destructure it in `createLifeScene` alongside the others (`onGeneration` with no default), add `let settled = false;` beside `let generation = 0;`, and change the stepping block inside `frame()` so it stops once the board settles:

```ts
const interval = 1000 / speed;
let guard = 0;
while (acc >= interval && guard < 8) {
  const next = step(board, plan.width, plan.height);
  // A still life will never change again, so keep painting it but stop
  // computing it. Only when nothing else wants the loop running.
  if (!loopAfter && !restartOnExtinction && sameBoard(next, board)) {
    settled = true;
    board = next;
    generation++;
    draw();
    onGeneration?.(generation, true);
    stop();
    return;
  }
  board = next;
  generation++;
  acc -= interval;
  guard++;

  if (loopAfter && generation >= loopAfter) {
    board = plan.cells;
    generation = 0;
  } else if (restartOnExtinction && countLive(board) === 0) {
    board = plan.cells;
    generation = 0;
  }
}

draw();
onGeneration?.(generation, settled);
raf = requestAnimationFrame(frame);
```

and add the private helper above `createLifeScene`:

```ts
function sameBoard(a: Uint8Array, b: Uint8Array): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
```

`isStillLife` is the exported, tested form of the same idea; `frame()` uses `sameBoard` because it already has the stepped board in hand and must not step twice per generation.

Finally, report the settled state under reduced motion too — in `start()`, after `renderGeneration(loopAfter ?? 277)`:

```ts
if (reducedMotion) {
  renderGeneration(loopAfter ?? 277);
  onGeneration?.(generation, true);
  return;
}
```

- [ ] **Step 6: Write the failing test for the readout**

Append to `e2e/home.spec.ts`:

```ts
test("the hero reports the generation, and settles", async ({ page }) => {
  await page.goto("/");
  const readout = page.locator("[data-life-readout]");
  await expect(readout).toBeVisible();
  await expect(readout).toHaveText(/GEN \d{3} · B3\/S23 · 356×192/);

  // ~11s at 24 generations/s, plus slack for a loaded machine.
  await expect(readout).toHaveText(/GEN 276 · STILL LIFE/, { timeout: 25_000 });
});

test("the settled word is not clipped by the frame", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const box = await page.locator(".life-frame").evaluate((el) => {
    const canvas = el.querySelector("canvas") as HTMLCanvasElement;
    const f = el.getBoundingClientRect();
    const c = canvas.getBoundingClientRect();
    // Word bbox in board coords, asserted in test/life.test.ts: x 75..280.
    return {
      left: c.left + (75 / 356) * c.width - f.left,
      right: c.left + (281 / 356) * c.width - f.left,
      frame: f.width,
    };
  });
  // A real inset on both sides, not a flush fit that cuts the outer column.
  expect(box.left).toBeGreaterThan(4);
  expect(box.right).toBeLessThan(box.frame - 4);
});
```

- [ ] **Step 7: Run it and watch it fail**

Run: `pnpm test:e2e e2e/home.spec.ts --project=desktop`
Expected: FAIL on both — no `[data-life-readout]` element, and the word is flush (measured: it overhangs by 0.6px on each side at 173%).

- [ ] **Step 8: Add the readout and fix the overscale**

In `src/components/home/Hero.astro`, put the readout under the frame:

```astro
<div class="life-frame" aria-hidden="true">
  <canvas id="life-canvas" width="356" height="192"></canvas>
</div>
<p class="micro-label life-readout" data-life-readout aria-hidden="true">
  GEN 000 · B3/S23 · 356×192
</p>
```

`aria-hidden`, because the heading above already states the name and a screen reader has no use for a generation counter.

Update the canvas comment and the overscale in the `<style>` block:

```css
/* The settled word is 206 of the board's 356 columns, so 166% puts it at
     96% of the frame: 1.66 * 206/356 = 0.96. It used to be 173%, which put it
     at 100.1% and cut the outer column off the M and the N. */
#life-canvas {
  position: absolute;
  left: 50%;
  top: 50%;
  translate: -50% -50%;
  width: 166%;
  /* The kernel reset caps media at 100%, which would silently undo the
       overscale the crop depends on. */
  max-width: none;
  height: auto;
  aspect-ratio: var(--board-aspect);
  image-rendering: pixelated;
}

.life-readout {
  display: block;
  margin-top: calc(var(--space-1) * -1);
  margin-bottom: var(--space-5);
  font-variant-numeric: tabular-nums;
}
```

and change `.life-frame`'s `margin-block` from `var(--space-2) var(--space-5)` to `var(--space-2) var(--space-1)`, since the readout now carries the space below.

Then feed it from the scene:

```astro
<script>
  import { createLifeScene } from "../../lib/life.ts";

  const canvas = document.getElementById("life-canvas");
  const readout = document.querySelector("[data-life-readout]");

  if (canvas instanceof HTMLCanvasElement) {
    const scene = createLifeScene({
      canvas,
      planSrc: "/martin_plan.txt",
      // 277 generations at the old 10/s took 28 seconds to spell the name,
      // which meant in practice nobody ever saw it resolve. At 24/s it lands
      // in about 11, and the board is a still life from there on.
      speed: 24,
      pauseWhenOffscreen: true,
      onGeneration(generation, settled) {
        if (!readout) return;
        readout.textContent = settled
          ? `GEN ${String(generation).padStart(3, "0")} · STILL LIFE`
          : `GEN ${String(generation).padStart(3, "0")} · B3/S23 · 356×192`;
      },
    });
    scene?.start();
  }
</script>
```

- [ ] **Step 9: Run the tests and watch them pass**

Run: `pnpm test && pnpm test:e2e e2e/home.spec.ts --project=desktop`
Expected: PASS, including the pre-existing "life canvas actually renders cells" case.

- [ ] **Step 10: Confirm it on mobile too, where the frame is a different aspect**

Run: `pnpm test:e2e e2e/home.spec.ts --project=mobile`
Expected: PASS.

- [ ] **Step 11: Look at it settled, at both sizes**

```bash
SHOTS=1 SHOTS_SETTLED=1 pnpm test:e2e e2e/shots.spec.ts --grep 'home light'
```

Open `shots/desktop/home-light.png` and `shots/mobile/home-light.png`. Confirm the word reads as MARTIN with clear space at both ends rather than cut at the frame edge, and that the readout sits under the band without crowding the lead paragraph.

- [ ] **Step 12: Record the derivation in the README**

In the bullet Task 1 wrote, extend the first entry:

```markdown
- **The hero Game of Life converges to "MARTIN"** and becomes a still life at
  generation 276, which is when the readout under the band switches to
  `STILL LIFE` and the scene stops stepping. `test/life.test.ts` asserts all
  of that, and asserts the settled word is 206 cells wide — the number
  `Hero.astro`'s `166%` overscale is derived from, since
  `1.66 × 206/356 = 0.96` puts the word at 96% of the measure. Change the
  plan file and that overscale changes with it.
```

- [ ] **Step 13: Commit**

```bash
npx prettier --write src/lib/life.ts src/components/home/Hero.astro test/life.test.ts e2e/home.spec.ts README.md
git add src/lib/life.ts src/components/home/Hero.astro test/life.test.ts e2e/home.spec.ts README.md
git commit -m "feat: the hero band states what it is computing, and stops

Two measured faults. The canvas was overscaled to 173%, which put the
206-cell word at 100.1% of the frame and cut the outer column off the M
and the N; 166% puts it at 96%, and the number is now derived from a width
the test asserts rather than chosen by eye. And the eleven seconds before
the board settles were undifferentiated static with nothing saying a
simulation was running, so a readout ticks the generation and switches to
STILL LIFE at 276.

The scene now stops stepping once the board reproduces itself, which is
what produces that state and also stops the home page simulating 68,352
cells forever for no visible change."
```

---

### Task 6: The remaining home page polish

**Files:**

- Modify: `src/components/home/ProjectIndex.astro`, `src/components/home/Contact.astro`, `src/pages/index.astro`
- Test: `e2e/home.spec.ts`

**Interfaces:**

- Consumes: `Crosshair.astro` and `Marginalia.astro`, both already in `src/components/micro/` and both currently unused outside `kitchen-sink.astro`.
- Produces: nothing.

- [ ] **Step 1: Write the failing test**

Append to `e2e/home.spec.ts`:

```ts
test("the project index numerals sit on one line with their names", async ({
  page,
}) => {
  await page.goto("/");
  const rows = page.locator(".project-card .row");
  const count = await rows.count();
  expect(count).toBe(5);

  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const n = await row.locator(".n").boundingBox();
    const name = await row.locator(".name").boundingBox();
    // Cap heights aligned, not a hand-tuned padding that drifts as the two
    // type steps scale against each other.
    expect(Math.abs(n!.y - name!.y)).toBeLessThan(3);
  }
});

test("the contact lattice is marked at its centre", async ({ page }) => {
  await page.goto("/");
  const mark = page.locator("#contact [data-micro='crosshair']");
  await expect(mark).toHaveCount(1);
  const box = await mark.boundingBox();
  const grid = await page.locator("#contact ul").boundingBox();
  expect(
    Math.abs(box!.x + box!.width / 2 - (grid!.x + grid!.width / 2)),
  ).toBeLessThan(2);
  expect(
    Math.abs(box!.y + box!.height / 2 - (grid!.y + grid!.height / 2)),
  ).toBeLessThan(2);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test:e2e e2e/home.spec.ts --project=desktop`
Expected: FAIL — the numeral test fails on the `padding-top: 0.35rem` offset, and the crosshair does not exist.

- [ ] **Step 3: Align the numeral properly**

In `src/components/home/ProjectIndex.astro`, `.n` is pushed onto the name's baseline by `align-self: start; padding-top: 0.35rem` — a constant that drifts as `--step-2` and `--step-3` scale against each other at different viewport widths. Replace those two declarations with a shared line box:

```css
.n {
  font-family: var(--font-mono);
  font-size: var(--step-3);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  /* Matched to .name's line-height so the two cap heights land together at
       every viewport width, instead of on a padding tuned at one of them. */
  line-height: 1.05;
  color: var(--muted);
  align-self: start;
  transition: color 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
```

If the test still reports a gap over 3px, the remaining difference is the two fonts' cap-height ratio; correct it with a single `translate: 0 <n>em` on `.n` and comment the measured value rather than reintroducing a padding.

- [ ] **Step 4: Mark the contact lattice**

The 2×2 grid is already a real hairline lattice — `gap: var(--rule)` over a `--hair` background. Its centre intersection is the one place a crosshair belongs. In `src/components/home/Contact.astro`, import it:

```astro
import Crosshair from "../micro/Crosshair.astro";
```

wrap the list so the mark can be positioned against it:

```astro
<div class="lattice">
  <ul>...unchanged...</ul>
  <Crosshair class="lattice-mark" size={18} />
</div>
```

and add:

```css
.lattice {
  position: relative;
}

/* Sits on the intersection the two hairline gaps already make. */
.lattice-mark {
  position: absolute;
  left: 50%;
  top: 50%;
  translate: -50% -50%;
  pointer-events: none;
}

@media (max-width: 40rem) {
  /* One column, so there is no intersection to mark. */
  .lattice-mark {
    display: none;
  }
}
```

- [ ] **Step 5: Set the About section's index in the gutter**

`Marginalia` is the other primitive the home page never reaches for. In `src/pages/index.astro`, import it:

```astro
import Marginalia from "../components/micro/Marginalia.astro";
```

and place it against the About section:

```astro
<section id="about" class="about card">
  <div class="wrap">
    <Rule label="Idx_03 / About" />
    <div class="cols">
      <Marginalia text="Idx_03" class="about-mark" />
      <p class="statement">...</p>
    </div>
  </div>
</section>
```

with:

```css
.about-mark {
  position: absolute;
  left: calc(var(--gutter) * -1);
  top: 0;
}

.cols {
  position: relative;
}

/* No gutter to sit in below this width. */
@media (max-width: 62rem) {
  .about-mark {
    display: none;
  }
}
```

- [ ] **Step 6: Run the tests and watch them pass**

Run: `pnpm test:e2e e2e/home.spec.ts --project=desktop && pnpm test:e2e e2e/home.spec.ts --project=mobile`
Expected: PASS on both. The mobile run matters: `home.spec.ts` already asserts no horizontal overflow at 390px, and the marginalia sits in negative space outside the wrap.

- [ ] **Step 7: Check contrast, since two new painted elements exist**

Run: `node scripts/check-contrast.mjs && pnpm test:e2e e2e/a11y.spec.ts`
Expected: PASS in all three themes.

- [ ] **Step 8: Review the page against where it started**

```bash
SHOTS=1 SHOTS_SETTLED=1 pnpm test:e2e e2e/shots.spec.ts --grep 'home'
```

Open all six `shots/*/home-*.png`. Check specifically: the five numerals sit level with their names; the crosshair reads as a registration mark rather than a stray dot; the marginalia does not collide with the wrap at intermediate widths; nothing overflows at 390px.

- [ ] **Step 9: Commit**

```bash
npx prettier --write src/components/home/ src/pages/index.astro e2e/home.spec.ts
git add -A
git commit -m "feat: tighten the home page's alignment and mark its lattices

The project index numerals were pushed onto their names' baseline by a
0.35rem padding tuned at one viewport width, which drifts as --step-2 and
--step-3 scale against each other; they share a line box now. The contact
grid is a real hairline lattice with an unmarked intersection at its
centre, and the About section had a gutter with nothing in it — Crosshair
and Marginalia were both sitting in the kit unused."
```

---

### Task 7: Full verification

**Files:** none — this task changes nothing unless it finds something.

- [ ] **Step 1: Everything, from a clean build**

```bash
rm -rf dist .astro
pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e
```

Expected: PASS. Both Playwright projects, all specs.

- [ ] **Step 2: The two manual checkers**

```bash
node scripts/check-contrast.mjs
node scripts/check-links.mjs
```

Expected: PASS. `check-links.mjs` walks every external link in `dist/`, so it needs the build from Step 1 present.

- [ ] **Step 3: Confirm the glyphs are gone from the source, not just the render**

```bash
grep -rnP '[\x{2190}-\x{2BFF}\x{25A0}-\x{25FF}]|&rarr;|&larr;|&times;' src/ | grep -v 'lensing.ts'
```

Expected: no output. `src/lib/lensing.ts` is excluded because its `3√3/2` and `≈` are mathematics in a comment, not icons.

- [ ] **Step 4: Confirm the RPG left nothing behind**

```bash
grep -rn -i 'rpg\|konami\|MSA_RPG\|girl_sheet' src/ e2e/ test/ scripts/ README.md
```

Expected: only `src/content/projects/cipherbound.md` lines 5 and 46, both prose describing the Cipherbound game.

- [ ] **Step 5: Capture the full visual record**

```bash
SHOTS=1 SHOTS_SETTLED=1 pnpm test:e2e e2e/shots.spec.ts
```

Review all 42 images — seven pages × three themes × two viewports — against the versions in git history. Every project page should be unchanged except for its arrows and, on Cipherbound, its caret. The home page should differ in the hero band, the readout, the numeral alignment, the crosshair and the marginalia, and in nothing else.

- [ ] **Step 6: Commit anything the review turned up, or report clean**

If Steps 1-5 all passed with no changes needed, say so explicitly with the command output rather than asserting success.

---

## Self-Review

**Spec coverage.** Section 1's table has ten rows; Tasks 2, 3 and 4 cover all ten — five arrows and the work-page arrow in Task 3, the caret and checkbox in Task 3, the black hole arrowhead in Task 3, the theme toggle in Task 4. The `♥ ♡` row is covered by Task 1 deleting the file that drew them. Section 2's hero work is Task 5; its four "everything else" bullets are Task 6, except the mobile pass, which is a step inside Tasks 5 and 6 rather than a task of its own. Section 3 is Task 1 in full, including all six edited files and both deleted tests. Section 4's verification list is Task 7.

**Type consistency.** `IconName` is declared once in Task 2 and its five members are used verbatim in Tasks 3 and 4. `isStillLife(cells, width, height)` and `onGeneration(generation, settled)` are declared in Task 5's Interfaces block and used with those exact signatures in its steps. `sameBoard` is private to `life.ts` and never referenced outside it. `data-life-readout`, `data-micro="icon"`, `data-icon` and `data-micro="crosshair"` are the four selectors tests depend on, and each is introduced in the same task that first asserts it.

**One deliberate omission.** `LifeSceneOptions.loopAfter`, `restartOnExtinction` and `LifeScene.renderGeneration` have no callers — `Hero.astro` is the only consumer of `createLifeScene`, and the Game of Life project page imports `parsePlan` and `step` directly. Removing them is a real cleanup but it is not in this spec, so Task 5 leaves them in place and guards the still-life halt behind them rather than assuming they are unused.
