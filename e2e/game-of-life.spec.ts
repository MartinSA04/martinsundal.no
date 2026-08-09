import { test, expect, type Page } from "@playwright/test";

/**
 * Read the canvas backing store rather than screenshotting the element. The
 * board is 656 cells wide and narrow viewports crop the viewport down to the
 * band the text settles in, so what is on screen is a window onto the run —
 * the pixels behind it are the same either way.
 */
function boardHash(page: Page) {
  return page.locator("canvas[data-life]").evaluate((c: HTMLCanvasElement) => {
    const { data } = c.getContext("2d")!.getImageData(0, 0, c.width, c.height);
    let h = 2166136261;
    for (let i = 3; i < data.length; i += 4) {
      h ^= data[i]!;
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  });
}

test("the scrubber moves the simulation deterministically", async ({
  page,
}) => {
  await page.goto("/projects/game-of-life/");
  const scrub = page.locator("[data-life-scrubber]");
  await scrub.fill("120");
  const a = await boardHash(page);

  await scrub.fill("0");
  await scrub.fill("120");
  const b = await boardHash(page);

  expect(b).toBe(a);
});

test("scrubbing pauses playback", async ({ page }) => {
  await page.goto("/projects/game-of-life/");
  const scrub = page.locator("[data-life-scrubber]");
  await scrub.fill("60");
  await expect(page.locator("[data-life-play]")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  // The ceiling is derived from the plan at build time, so the test asks the
  // control what it is instead of hard-coding a number that can go stale.
  const max = await scrub.getAttribute("max");
  await expect(page.locator("[data-life-gen]")).toHaveText(`gen 60 / ${max}`);
});

test("the run ends on the settled still life", async ({ page }) => {
  await page.goto("/projects/game-of-life/");
  const scrub = page.locator("[data-life-scrubber]");
  const max = (await scrub.getAttribute("max"))!;
  await scrub.fill(max);

  await expect(page.locator("[data-life-state]")).toHaveText(/still life/i);
  // 159 blocks of four cells: the text, and nothing else still moving.
  await expect(page.locator("[data-life-pop]")).toHaveText("pop 636");

  // One more generation would change nothing, which is what settled means.
  const before = await boardHash(page);
  await scrub.fill(String(Number(max) - 1));
  await scrub.fill(max);
  expect(await boardHash(page)).toBe(before);
});

test("the scrubber is keyboard operable and announces its generation", async ({
  page,
}) => {
  await page.goto("/projects/game-of-life/");
  const scrub = page.locator("[data-life-scrubber]");
  await expect(scrub).toHaveAttribute("aria-label", /generation/i);
  await scrub.focus();
  const before = await scrub.inputValue();
  await page.keyboard.press("ArrowRight");
  expect(await scrub.inputValue()).not.toBe(before);
});

test("the board actually draws cells", async ({ page }) => {
  await page.goto("/projects/game-of-life/");
  await page.locator("[data-life-scrubber]").fill("40");
  await expect
    .poll(() =>
      page.locator("canvas[data-life]").evaluate((c: HTMLCanvasElement) => {
        const ctx = c.getContext("2d")!;
        const { data } = ctx.getImageData(0, 0, c.width, c.height);
        let lit = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i]! > 0) lit++;
        return lit;
      }),
    )
    .toBeGreaterThan(50);
});

/**
 * The world pins a light palette in both themes. The board used to read its
 * cell colour from the document root, which does follow the theme, so in dark
 * mode it painted #f4f1ea cells onto #fbfbf8 paper and the whole simulation
 * disappeared.
 */
test("cells stay visible against the world's paper in dark mode", async ({
  page,
}) => {
  await page.goto("/projects/game-of-life/");
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
  });
  await page.locator("[data-life-scrubber]").fill("40");

  const ink = await page
    .locator("canvas[data-life]")
    .evaluate((c: HTMLCanvasElement) => {
      const { data } = c
        .getContext("2d")!
        .getImageData(0, 0, c.width, c.height);
      let lit = 0;
      let luma = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3]! === 0) continue;
        lit++;
        luma +=
          0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!;
      }
      return { lit, luma: luma / Math.max(1, lit) };
    });

  expect(ink.lit).toBeGreaterThan(50);
  // The paper is #fbfbf8. Anything approaching that luminance is invisible.
  expect(ink.luma).toBeLessThan(120);
});

test("links to the live browser version", async ({ page }) => {
  await page.goto("/projects/game-of-life/");
  await expect(
    page.locator("a[href*='conway.martinsundal.no']").first(),
  ).toBeVisible();
});
