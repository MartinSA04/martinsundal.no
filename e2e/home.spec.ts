import { test, expect } from "@playwright/test";

test("hero keeps the life canvas and states the name in real text", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#life-canvas")).toHaveCount(1);

  // The name used to live in a .visually-hidden span while the canvas spelled
  // it out over ~28 seconds, so sighted visitors saw "Hi, I'm" above noise.
  // It is now the visible h1 and the simulation echoes it.
  const h1 = page.getByRole("heading", { level: 1 });
  await expect(h1).toHaveText(/Martin Sundal Aspås/);
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

test("the hero instruments report the run, and settle", async ({ page }) => {
  await page.goto("/");

  const value = page.locator('[data-dial="generation"] [data-dial-value]');
  const state = page.locator("[data-life-state]");
  const pop = page.locator('[data-trace="population"] [data-trace-value]');

  await expect(value).toHaveText(/^\d{3}$/);
  // The annunciator is only shown once the board reproduces itself.
  await expect(state).toBeHidden();

  // ~11s at 24 generations/s, plus slack for a loaded machine.
  await expect(value).toHaveText("276", { timeout: 25_000 });
  await expect(state).toBeVisible();
  await expect(pop).toHaveText("388");

  // The dial is an arc, so the number is only half the readout: a settled
  // board must show a full ring, not a full ring's worth of digits.
  const offset = await page
    .locator('[data-dial="generation"] [data-dial-arc]')
    .getAttribute("stroke-dashoffset");
  expect(Number(offset)).toBeCloseTo(0, 1);
});

/**
 * The instruments are rendered at their settled values at build time, so the
 * page is correct with no script at all. This is the assertion that stops
 * them silently regressing to zeroed or empty boxes.
 */
test("the hero instruments ship their settled values without script", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");

  await expect(
    page.locator('[data-dial="generation"] [data-dial-value]'),
  ).toHaveText("276");
  await expect(
    page.locator('[data-trace="population"] [data-trace-value]'),
  ).toHaveText("388");

  // A single point projects to a polyline that draws nothing; the static
  // trace must carry the whole rolling window.
  const points = await page
    .locator('[data-trace="population"] [data-trace-line]')
    .getAttribute("points");
  expect(points!.trim().split(/\s+/).length).toBeGreaterThan(100);

  await context.close();
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

/**
 * Screen y of an element's cap top, from font metrics. Comparing bounding
 * boxes cannot see this: `.n` and `.name` start on the same line by
 * construction, so their box tops always agree while the glyphs inside them
 * sit at different heights.
 */
function capTopDelta() {
  const probe = document.createElement("canvas").getContext("2d")!;
  const capTop = (el: Element, sample: string) => {
    const cs = getComputedStyle(el);
    probe.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = probe.measureText(sample);
    const fontH = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
    const lh =
      cs.lineHeight === "normal" ? fontH : Number.parseFloat(cs.lineHeight);
    const box = el.getBoundingClientRect();
    const baseline =
      box.top +
      Number.parseFloat(cs.paddingTop) +
      (lh - fontH) / 2 +
      m.fontBoundingBoxAscent;
    return baseline - m.actualBoundingBoxAscent;
  };
  return [...document.querySelectorAll(".project-card .row")].map(
    (row) =>
      capTop(row.querySelector(".n")!, "01") -
      capTop(row.querySelector(".name")!, "S"),
  );
}

test("the project index numerals cap-align with their names at every width", async ({
  page,
}) => {
  // The correction is derived from both type steps, and --step-2 and --step-3
  // clamp at different widths, so one viewport proves nothing. Before it, the
  // numeral sagged 5.9px to 9.6px depending on where you measured.
  for (const width of [390, 560, 760, 900, 1100, 1280, 1600, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const deltas = await page.evaluate(capTopDelta);
    expect(deltas).toHaveLength(5);
    for (const d of deltas) {
      expect(
        Math.abs(d),
        `cap delta ${d.toFixed(2)}px at ${width}px`,
      ).toBeLessThan(2);
    }
  }
});

test("the contact lattice is marked at its centre", async ({ page }) => {
  // Two columns, so the grid has a centre intersection to mark.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const mark = page.locator("[data-lattice-mark]");
  await expect(mark).toBeVisible();

  const box = await mark.boundingBox();
  const grid = await page.locator("#contact ul").boundingBox();
  expect(
    Math.abs(box!.x + box!.width / 2 - (grid!.x + grid!.width / 2)),
  ).toBeLessThan(2);
  expect(
    Math.abs(box!.y + box!.height / 2 - (grid!.y + grid!.height / 2)),
  ).toBeLessThan(2);

  // The figure is structural, not a sticker: its crosshair arms have to reach
  // the lattice rules they continue. If a cell's padding ever shrinks below
  // the figure's radius the target starts covering a handle instead.
  const cell = await page.locator("#contact li a").first().boundingBox();
  expect(box!.width / 2).toBeLessThan(cell!.height / 2);
});

test("the lattice mark is gone once the grid is one column", async ({
  page,
}) => {
  // Below 40rem there is no intersection, so the target would be a mark on
  // nothing.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("[data-lattice-mark]")).toBeHidden();
});
