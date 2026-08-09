import { test, expect } from "@playwright/test";

/**
 * Horizontal scroll is the one responsive failure a visitor cannot work
 * around, and it is almost always caused by a single element deep in the page
 * — a grid track floored at min-content, an unbreakable URL, a header row that
 * adds up to more than the screen. It costs little to assert against every
 * page at the narrow end of the phone range.
 *
 * 320px is an iPhone SE laid on its side of the range; 360px covers most
 * Android handsets in use.
 */
const PAGES = [
  "/",
  "/work/",
  "/projects/ntnu-api/",
  "/projects/black-hole/",
  "/projects/cipherbound/",
  "/projects/game-of-life/",
  "/projects/study-companion/",
];

for (const width of [320, 360]) {
  for (const path of PAGES) {
    test(`${path} does not scroll sideways at ${width}px`, async ({
      browser,
    }) => {
      const ctx = await browser.newContext({
        viewport: { width, height: 780 },
      });
      const page = await ctx.newPage();
      await page.goto(path);
      const [scrollWidth, innerWidth] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        window.innerWidth,
      ]);
      expect(scrollWidth, `${path} at ${width}px`).toBeLessThanOrEqual(
        innerWidth,
      );
      await ctx.close();
    });
  }
}
