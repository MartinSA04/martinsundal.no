import { test, expect } from "@playwright/test";

test("the scrubber moves the simulation deterministically", async ({ page }) => {
  await page.goto("/projects/game-of-life/");
  const scrub = page.locator("[data-life-scrubber]");
  await scrub.fill("120");
  await page.waitForTimeout(250);
  const a = await page.locator("canvas[data-life]").screenshot();

  await scrub.fill("0");
  await page.waitForTimeout(150);
  await scrub.fill("120");
  await page.waitForTimeout(250);
  const b = await page.locator("canvas[data-life]").screenshot();

  expect(Buffer.compare(a, b)).toBe(0);
});

test("scrubbing pauses playback", async ({ page }) => {
  await page.goto("/projects/game-of-life/");
  await page.locator("[data-life-scrubber]").fill("60");
  await expect(page.locator("[data-life-play]")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.locator("[data-life-gen]")).toHaveText("gen 60 / 540");
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

test("links to the live browser version", async ({ page }) => {
  await page.goto("/projects/game-of-life/");
  await expect(page.locator("a[href*='conway.martinsundal.no']").first()).toBeVisible();
});
