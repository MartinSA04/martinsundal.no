import { test, expect } from "@playwright/test";
import { MESH_LINES } from "../src/lib/quantum.ts";
import { MERIDIANS, MERIDIAN_SLOTS } from "../src/lib/globe.ts";

test("hero keeps the life canvas and states the name in real text", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#life-canvas")).toHaveCount(1);

  // The name used to live in a .visually-hidden span while the canvas spelled
  // it out over ~28 seconds, so sighted visitors saw "Hi, I'm" above noise.
  // It is now the visible h1 and the simulation echoes it.
  const h1 = page.getByRole("heading", { level: 1 });
  await expect(h1).toHaveText(/Martin Sundal\s*Aspås/);
  await expect(h1).toBeVisible();
});

test("the life canvas actually renders cells", async ({ page }) => {
  await page.goto("/");
  await expect
    .poll(
      async () =>
        page.locator("#life-canvas").evaluate((c: HTMLCanvasElement) => {
          const ctx = c.getContext("2d");
          if (!ctx || !c.width) return 0;
          const { data } = ctx.getImageData(0, 0, c.width, c.height);
          let lit = 0;
          for (let i = 3; i < data.length; i += 4) if (data[i]! > 0) lit++;
          return lit;
        }),
      { timeout: 10_000 },
    )
    .toBeGreaterThan(100);
});

/**
 * The board is the real B3/S23 simulation over the real plan, not an animation
 * of a precomputed picture. The proof is that it is a *simulation*: the live
 * population passes through values the settled board never has.
 */
test("the board runs the rule rather than replaying a picture", async ({
  page,
}) => {
  await page.goto("/");
  // The scene pauses while offscreen, so bring it into view before sampling.
  await page.locator("#life-canvas").scrollIntoViewIfNeeded();
  const seen = new Set<string>();
  const pop = page.locator("[data-pop]");
  for (let i = 0; i < 14; i++) {
    seen.add(((await pop.textContent()) ?? "").trim());
    await page.waitForTimeout(220);
  }
  // A replayed still life would report one population the whole way through.
  expect(seen.size).toBeGreaterThan(3);
  // And it must land exactly on the settled figure.
  await expect(pop).toHaveText("388", { timeout: 25_000 });
});

/**
 * The travellers are placed by offset-path, which is the one thing in the
 * masthead with no fallback: if it stops resolving they all pile up on the
 * viewBox origin at the top-left corner and the figure still "renders".
 */
test("the orbital's travellers are carried onto their paths", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const box = await page.locator(".orb svg").boundingBox();
  const spots = await page.evaluate(() =>
    [...document.querySelectorAll(".orb .trav")].map((c) => {
      const r = c.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }),
  );
  expect(spots).toHaveLength(6);
  expect(
    new Set(spots.map((s) => `${s.x.toFixed(0)},${s.y.toFixed(0)}`)).size,
  ).toBe(6);

  // Nothing is parked in the corner, and nothing has wandered out of frame.
  for (const s of spots) {
    expect(s.x).toBeGreaterThan(box!.x + 4);
    expect(s.x).toBeLessThan(box!.x + box!.width - 4);
    expect(s.y).toBeGreaterThan(box!.y + 4);
    expect(s.y).toBeLessThan(box!.y + box!.height - 4);
  }
});

/**
 * Where a path is stroked, it is a trailing arc that ends on its traveller.
 * This has to probe the *painted* stroke, not the geometry: an earlier version
 * of this test computed where the arc ought to end and compared that to the
 * node, which passed happily while `vector-effect: non-scaling-stroke` was
 * walking every rendered arc a fifth of an orbit clear of its traveller.
 * elementFromPoint only hits painted pixels, so a gap in the dash reads as a
 * miss.
 */
test("each arc is painted behind its traveller and not ahead of it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  // Only some travellers carry an arc — N-01 and N-04 ride bare, the way the
  // reference sheet leaves its called-out node unattached. So work off the
  // trails that exist rather than one per orbit.
  const probes = await page.evaluate(() =>
    [...document.querySelectorAll<SVGPathElement>(".orb .trail")].map(
      (path) => {
        const id = [...path.classList].find((c) => /^o\d$/.test(c))!;
        const len = path.getTotalLength();
        const sweep = parseFloat(
          getComputedStyle(path).getPropertyValue("--sweep"),
        );
        const tail = parseFloat(
          getComputedStyle(path).getPropertyValue("--tail"),
        );
        const m = path.ownerSVGElement!.getScreenCTM()!;
        const inked = (at: number) => {
          const q = path.getPointAtLength(
            ((((at % 100) + 100) % 100) / 100) * len,
          );
          const hit = document.elementFromPoint(
            m.a * q.x + m.c * q.y + m.e,
            m.b * q.x + m.d * q.y + m.f,
          );
          return hit?.classList.contains(id) ?? false;
        };
        // Sample only the 2-6% immediately behind the traveller. That band is the
        // whole test: the displacement bug leaves the last ~10% before the node
        // bare while the rest of the arc still paints, so probing further back
        // finds ink either way and proves nothing. Nearer than 2% is inside the
        // traveller's own disc, which paints over the arc.
        //
        // Several samples because elementFromPoint returns only the topmost
        // element: where two paths cross the later sibling wins and the one being
        // probed reads as bare. Behind the node a single hit is proof of ink;
        // ahead of it occlusion can only mask a hit, never invent one, so
        // requiring every sample to miss stays sound.
        return {
          id,
          tail,
          behind: [2, 3, 4, 5, 6].some((d) => inked(sweep - d)),
          ahead: [4, 8, 12].some((d) => inked(sweep + d)),
        };
      },
    ),
  );

  expect(probes.map((p) => p.id)).toEqual(["o2", "o3", "o5", "o6"]);
  for (const p of probes) {
    expect(p.behind, `${p.id} inked behind its traveller`).toBe(true);
    // N-06 is the one path drawn whole, so ink ahead of it is correct.
    expect(p.ahead, `${p.id} bare ahead of its traveller`).toBe(p.tail === 100);
  }
});

/**
 * The index claims to be a table of the periods the travellers actually run at.
 * It only stays true as long as nobody retimes an orbit without retyping a row.
 */
test("each index row states its orbit's real period", async ({ page }) => {
  await page.goto("/");
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll(".orb [data-orbit]")].map((t) => {
      const id = t.getAttribute("data-orbit")!;
      const trav = document.querySelector(`.orb .trav.${id}`)!;
      return {
        id,
        label: (t.textContent ?? "").trim(),
        duration: getComputedStyle(trav).animationDuration,
      };
    }),
  );
  expect(rows).toHaveLength(6);
  for (const r of rows) {
    expect(r.label, `${r.id} label`).toMatch(/\d+s$/);
    expect(r.duration, `${r.id} duration`).toBe(
      `${r.label.match(/(\d+)s$/)![1]}s`,
    );
  }
});

test("project index links to all five project pages", async ({ page }) => {
  await page.goto("/");
  for (const slug of [
    "study-companion",
    "ntnu-api",
    "cipherbound",
    "black-hole",
    "game-of-life",
  ]) {
    await expect(page.locator(`a[href='/projects/${slug}/']`)).toHaveCount(1);
  }
});

test("work band links to /work/", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("a[href='/work/']").first()).toBeVisible();
});

test("no horizontal overflow at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("the old What I work on section is gone", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /what i work on/i }),
  ).toHaveCount(0);
});

test("the settle marker is present throughout and changes state", async ({
  page,
}) => {
  await page.goto("/");

  const state = page.locator("[data-state]");
  const gen = page.locator("[data-gen]");

  // On the plate from the first frame — it changes state rather than
  // appearing, so there is never a gap where the board has no reported state.
  await expect(state).toBeVisible();
  await expect(state).toHaveText("Resolving");
  await expect(state).not.toHaveAttribute("data-settled", "");

  // The scene pauses while offscreen, so bring it into view before waiting on
  // it — on a phone the board starts below the fold.
  await page.locator("#life-canvas").scrollIntoViewIfNeeded();

  // Wait on the STATE, not the generation: `gen` ships pre-rendered at 276, so
  // asserting it first passes trivially and then races the run that is still
  // counting up from zero. ~11s at 24 generations/s, plus slack.
  await expect(state).toHaveText("Still life · stable", { timeout: 30_000 });
  await expect(state).toHaveAttribute("data-settled", "");
  await expect(gen).toHaveText("276");
});

/**
 * The readouts are rendered at their settled values at build time, so the page
 * is correct with no script at all. This is the assertion that stops them
 * silently regressing to zeroed or empty boxes.
 */
test("the board readouts ship their settled values without script", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");

  await expect(page.locator("[data-gen]")).toHaveText("276");
  await expect(page.locator("[data-pop]")).toHaveText("388");

  // With no script the board on screen IS the final still life, so the marker
  // must say so and carry its accent.
  const state = page.locator("[data-state]");
  await expect(state).toHaveText("Still life · stable");
  await expect(state).toHaveAttribute("data-settled", "");

  await context.close();
});

/**
 * The whole board is shown now — no overscale, no crop — so the settled word
 * cannot be clipped by a frame. What has to hold instead is that the canvas is
 * drawn at the board's own aspect and fits inside its bracket.
 */
test("the board is shown whole, at the board's own aspect", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const box = await page.locator(".board-fig").evaluate((el) => {
    const c = el.querySelector("canvas") as HTMLCanvasElement;
    const f = el.getBoundingClientRect();
    const r = c.getBoundingClientRect();
    return {
      aspect: r.width / r.height,
      cells: c.width / c.height,
      insideLeft: r.left >= f.left - 1,
      insideRight: r.right <= f.right + 1,
    };
  });
  expect(box.aspect).toBeCloseTo(356 / 192, 1);
  expect(box.aspect).toBeCloseTo(box.cells, 1);
  expect(box.insideLeft).toBe(true);
  expect(box.insideRight).toBe(true);
});

/**
 * The specimen field is now the whole of Fig. 02, so it carries every project
 * and every route into one. If a specimen or its link goes missing the page
 * stops linking to a project at all.
 */
test("every project has a specimen that links to its page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  for (const slug of [
    "study-companion",
    "ntnu-api",
    "cipherbound",
    "black-hole",
    "game-of-life",
  ]) {
    const spec = page.locator(`[data-spec="${slug}"]`);
    await expect(spec).toHaveCount(1);
    await expect(spec.locator(`a[href="/projects/${slug}/"]`)).toHaveCount(1);
  }

  // Every specimen takes its own cell, or the field encodes nothing.
  const cells = await page.evaluate(() =>
    [...document.querySelectorAll("[data-spec]")].map((s) => {
      const r = s.getBoundingClientRect();
      return `${Math.round(r.x)}:${Math.round(r.y)}`;
    }),
  );
  expect(new Set(cells).size).toBe(5);
});

/**
 * The black hole plate asserts a threshold, so the drawing has to obey it. It
 * used to draw its hole at 96px, which put every ray on the figure inside
 * b_crit — the plate showed four rays escaping that would all have fallen in.
 * The rays and the hole are now drawn to one scale, and this is the guard on
 * it: read the geometry back off the built page and check it against the
 * physics rather than against a number typed twice.
 */
test("the black hole plate is drawn to one scale", async ({ page }) => {
  await page.goto("/");
  const plate = page.locator('[data-spec="black-hole"] svg');

  const rs = Number(await plate.locator("circle.h").nth(1).getAttribute("r"));
  const ring = Number(await plate.locator("circle.acc-ring").getAttribute("r"));
  // The photon sphere sits at 1.5 rs by definition, not by eye.
  expect(ring / rs).toBeCloseTo(1.5, 2);

  const bCrit = ((3 * Math.sqrt(3)) / 2) * rs;

  // Every ray drawn as escaping is aimed outside the threshold...
  const refs = await plate
    .locator("g.d path")
    .evaluateAll((paths) =>
      paths.map((p) =>
        Number(/M0 ([\d.]+)h460/.exec(p.getAttribute("d")!)![1]),
      ),
    );
  expect(refs.length).toBe(4);
  for (const y of refs) expect(Math.abs(y - 200)).toBeGreaterThan(bCrit);

  // ...and the one drawn as captured is aimed inside it, and reaches the
  // horizon rather than stopping somewhere short of it.
  const points = (await plate
    .locator("[data-capture-ray]")
    .getAttribute("data-points"))!
    .split(" ")
    .map((p) => p.split(",").map(Number) as [number, number]);

  expect(Math.abs(points[0]![1] - 200)).toBeLessThan(bCrit);
  const [ex, ey] = points[points.length - 1]!;
  expect(Math.hypot(ex - 230, ey - 200)).toBeCloseTo(rs, 0);
});

/**
 * The ray ships whole, so the plate is a complete drawing with the script
 * blocked, and the label that names it ships with it. Both are the script's to
 * take away — see scripts/capture.ts, which cannot use a dash reveal because
 * the sheet's strokes are non-scaling, and which declines to take anything at
 * all from a pointer that could never ask for it back.
 */
test("the captured ray is whole without script, and drawn in with it", async ({
  browser,
  page,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const still = await context.newPage();
  await still.goto("/");
  const shipped = await still.locator("[data-capture-ray]").getAttribute("d");
  expect(shipped!.split("L").length).toBeGreaterThan(100);
  await expect(still.locator(".bh-caplbl")).toBeVisible();
  await context.close();

  await page.goto("/");
  const plate = page.locator('[data-spec="black-hole"] svg');
  const ray = page.locator("[data-capture-ray]");

  // The player marks the plate either way, so waiting on it cannot pass by
  // simply never running.
  await expect(plate).toHaveAttribute("data-capture", /live|still/);

  if ((await plate.getAttribute("data-capture")) === "still") {
    // Nothing here can hover, so the whole ray is the still and stays it.
    expect(await ray.getAttribute("d")).toBe(shipped);
    await expect(page.locator(".bh-caplbl")).toBeVisible();
    return;
  }

  // Demoted to nothing the moment the player takes it over.
  await expect.poll(() => ray.getAttribute("d"), { timeout: 5000 }).toBe("");

  const spec = page.locator('[data-spec="black-hole"]');
  await spec.scrollIntoViewIfNeeded();
  await spec.hover();
  await expect
    .poll(() => ray.evaluate((p: SVGPathElement) => p.getTotalLength()), {
      timeout: 5000,
    })
    .toBeGreaterThan(300);

  await page.locator("h1").hover();
  await expect.poll(() => ray.getAttribute("d"), { timeout: 5000 }).toBe("");
});

/**
 * The instruments are the page's anchors, not row markers. Each specimen's
 * figure has to stay substantial next to the name it sits above.
 */
test("each specimen figure is a substantial anchor", async ({ page }) => {
  for (const width of [1100, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const sizes = await page.evaluate(() =>
      [...document.querySelectorAll("[data-spec] figure")].map((f) => {
        const b = f.getBoundingClientRect();
        return { w: b.width, h: b.height };
      }),
    );
    expect(sizes).toHaveLength(5);
    for (const s of sizes) {
      expect(s.w, `figure width at ${width}px`).toBeGreaterThan(100);
      expect(s.h, `figure height at ${width}px`).toBeGreaterThan(80);
    }
  }
});

test("the contact channels are all reachable", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  for (const href of [
    "mailto:martin.s.aspas@gmail.com",
    "https://github.com/MartinSA04",
    "https://linkedin.com/in/martinsa04",
    "https://www.npmjs.com/~martinsa04",
  ]) {
    await expect(page.locator(`#contact a[href='${href}']`)).toHaveCount(1);
  }
});

/**
 * Fig. 04. The surface is rendered on the server from src/lib/quantum.ts and
 * then advanced by src/scripts/surface.ts, so there are two separate things to
 * hold: that the served frame is a real surface, and that it moves.
 */
test("the studies band states the specialization", async ({ page }) => {
  await page.goto("/");
  const band = page.locator("[data-surface]");

  await expect(
    page.getByRole("heading", { name: /Fig\. 04 — Studies/ }),
  ).toHaveCount(1);
  await expect(band).toContainText("Quantum Technology");
  await expect(band).toContainText("Fysikk og matematikk");
  await expect(band).toContainText("2024");
  await expect(band).toContainText("2029");

  // Contact closes the plate.
  await expect(
    page.getByRole("heading", { name: /Fig\. 05 — Contact/ }),
  ).toHaveCount(1);
});

test("the corral surface is served whole and then advances", async ({
  page,
}) => {
  await page.goto("/");
  const lines = page.locator(".mesh polyline");

  // Every spoke and every ring, present before any script runs on them.
  await expect(lines).toHaveCount(MESH_LINES);

  await page.locator("[data-surface]").scrollIntoViewIfNeeded();

  // Nothing in the figure sits still. The wall of the well is a node, so a ring
  // drawn on it would stay flat forever while the rest turned — the mesh stops
  // just inside it, and this is the guard on that holding in the browser.
  const before = await lines.evaluateAll((els) =>
    els.map((e) => e.getAttribute("points")),
  );
  await expect
    .poll(
      async () => {
        const now = await lines.evaluateAll((els) =>
          els.map((e) => e.getAttribute("points")),
        );
        return now.filter((p, i) => p !== before[i]).length;
      },
      { timeout: 8000 },
    )
    .toBe(before.length);

  // And a spoke through the middle carries real relief rather than being a
  // straight line that happens to translate.
  const mid = (await lines.nth(5).getAttribute("points"))!;
  expect(
    new Set(mid.split(" ").map((p) => p.split(",")[1])).size,
  ).toBeGreaterThan(3);
});

test("the studies figures are whole without JavaScript, and still under reduced motion", async ({
  browser,
  page,
}) => {
  // Served, not built: the tau = 0 frame comes out of the server render, so a
  // visitor with no JavaScript gets a correct surface rather than an empty box.
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto("/");
  await expect(p.locator(".mesh polyline")).toHaveCount(MESH_LINES);
  await expect(p.locator("[data-tip]")).toHaveCount(1);
  await expect(p.locator("[data-surface]")).toContainText("Quantum Technology");
  await ctx.close();

  // Reduced motion never starts the loop at all, so the same frame just stays.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("[data-surface]").scrollIntoViewIfNeeded();
  const mid = page.locator(".mesh polyline").nth(5);
  const before = await mid.getAttribute("points");
  await page.waitForTimeout(1200);
  expect(
    await mid.getAttribute("points"),
    "the surface moved under reduce",
  ).toBe(before);
});

/**
 * Fig. 05. The globe is rendered on the server from src/lib/globe.ts and then
 * turned by src/scripts/globe.ts, so the same two things hold as for the
 * corral: the served frame is a whole globe, and it moves. The third is
 * particular to this figure — only the meridians are allowed to move, because
 * a circle of latitude is symmetric about the polar axis and every parallel is
 * therefore drawn once and never touched again.
 */
test("the globe is served whole and then turns, moving only its meridians", async ({
  page,
}) => {
  await page.goto("/");
  const zone = page.locator("[data-globe]");

  // Every meridian slot is in the markup before any script runs on them, so
  // there is nothing for the loop to allocate.
  await expect(page.locator("[data-mer]")).toHaveCount(
    MERIDIANS * MERIDIAN_SLOTS,
  );
  await zone.scrollIntoViewIfNeeded();

  const meridians = page.locator("[data-mer]");
  const parallels = page.locator(".par path");

  const merBefore = await meridians.evaluateAll((els) =>
    els.map((e) => e.getAttribute("d")),
  );
  const parBefore = await parallels.evaluateAll((els) =>
    els.map((e) => e.getAttribute("d")),
  );
  const nodesBefore = await zone.locator("svg *").count();

  await expect
    .poll(
      async () => {
        const now = await meridians.evaluateAll((els) =>
          els.map((e) => e.getAttribute("d")),
        );
        return now.filter((d, i) => d !== merBefore[i]).length;
      },
      { timeout: 8000 },
    )
    .toBeGreaterThan(0);

  // The parallels are the whole reason this is affordable. If one of them ever
  // moves, the invariant the loop is built on has been broken.
  expect(
    await parallels.evaluateAll((els) => els.map((e) => e.getAttribute("d"))),
    "a parallel moved, so the turn is redrawing more than it needs to",
  ).toEqual(parBefore);

  // The DOM is the size it was served at: the loop rewrites attributes and
  // never builds a node, which is what the preallocated slots are for.
  expect(
    await zone.locator("svg *").count(),
    "the loop changed the node count",
  ).toBe(nodesBefore);
});

test("the globe is whole without JavaScript, and still under reduced motion", async ({
  browser,
  page,
}) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto("/");
  // Served, not built. Every meridian slot is present and the used ones carry
  // a path, so a visitor with no JavaScript gets a correct globe.
  await expect(p.locator("[data-mer]")).toHaveCount(MERIDIANS * MERIDIAN_SLOTS);
  expect(
    await p
      .locator("[data-mer]")
      .evaluateAll((els) => els.filter((e) => e.getAttribute("d")).length),
  ).toBeGreaterThan(MERIDIANS);
  await expect(p.locator("[data-origin-cross]")).toHaveCount(1);
  await ctx.close();

  // Reduced motion never starts the loop, so the served frame just stays.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator("[data-globe]").scrollIntoViewIfNeeded();
  const first = page.locator("[data-mer]").first();
  const before = await first.getAttribute("d");
  await page.waitForTimeout(1200);
  expect(await first.getAttribute("d"), "the globe turned under reduce").toBe(
    before,
  );
});

/**
 * The plate carries its own terminus, so Base.astro is told not to print the
 * site footer under it. It used to say "Plate 001 · Martin Sundal Aspås ·
 * Trondheim" and then, eleven lines and a dead gap later, "© Martin Sundal
 * Aspås" and "Trondheim · NO".
 *
 * /work opted into the same mechanism when it was reworked: its cable has to
 * plug into something, and a port sitting above a second copy of the colophon
 * is the exact duplication this exists to prevent. A project page is the
 * control now — it takes the site footer like everything else.
 */
test("a page that ends itself gets no site footer, and the rest still do", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".site-footer")).toHaveCount(0);
  await expect(page.locator("#contact .terminus")).toHaveCount(1);
  await expect(page.locator("#contact .terminus")).toContainText("WGS 84");

  // One ending, and the cable lands on it rather than beside it.
  await page.goto("/work/");
  await expect(page.locator(".site-footer")).toHaveCount(0);
  await expect(page.locator(".terminus")).toHaveCount(1);
  await expect(page.locator(".terminus [data-cable-end]")).toHaveCount(1);

  // Every other page still gets one, minus the barcode that encoded nothing.
  await page.goto("/projects/black-hole/");
  await expect(page.locator(".site-footer")).toHaveCount(1);
  await expect(page.locator(".site-footer .micro-barcode")).toHaveCount(0);
});

/**
 * Fig. 00 is pure CSS, and CSS animations do not stop when their element
 * scrolls out of view. This one is expensive enough to matter — 76ms/s of main
 * thread, measured — so it is paused off screen. The figure itself is unchanged
 * and still runs with no JavaScript at all.
 */
test("the orbital stops when it is off screen", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const state = () =>
    page.evaluate(
      () =>
        getComputedStyle(document.querySelector(".orb .trail")!)
          .animationPlayState,
    );

  await expect.poll(state).toBe("running");

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(state, { timeout: 5000 }).toBe("paused");

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(state, { timeout: 5000 }).toBe("running");
});

test("the orbital still animates with no JavaScript", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto("/");
  // The pause is an enhancement, not a dependency: without the script the
  // figure runs exactly as it did before there was one.
  const play = await p.evaluate(
    () =>
      getComputedStyle(document.querySelector(".orb .trail")!)
        .animationPlayState,
  );
  expect(play).toBe("running");
  await expect(p.locator(".orb .trav")).toHaveCount(6);
  await ctx.close();
});
