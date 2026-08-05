import sharp from "sharp";
import { test, expect } from "@playwright/test";

// Serial and slow on purpose. Headless Chromium has no GPU, so the lensing
// shader is software-rendered — 300 integration steps per pixel over most of a
// megapixel. Several of these running at once starves every worker. On a real
// GPU it is a fraction of a frame.
test.describe.configure({ mode: "serial" });
test.slow();

test("renders the lensing canvas when WebGL2 is available", async ({ page }) => {
  await page.goto("/projects/black-hole/");
  const canvas = page.locator("canvas[data-lensing]");
  await expect(canvas).toBeVisible();

  // Not just present: it drew something other than a flat black frame.
  //
  // Asserted on a screenshot rather than by reading the canvas. Without
  // preserveDrawingBuffer the WebGL drawing buffer is cleared once the frame
  // is composited, so gl.readPixels and drawImage both come back black even
  // though the page looks right — and enabling that flag would cost real
  // performance purely to make this test easier.
  //
  // A clipped page screenshot rather than an element screenshot, because the
  // latter waits for the element to be "stable" and this canvas animates
  // continuously, so it never settles.
  await page.waitForTimeout(1200); // let a few frames land
  const box = (await canvas.boundingBox())!;
  const shot = await page.screenshot({ clip: box });
  const stats = await sharp(shot).stats();

  // A flat black frame has max 0 on every channel and no spread.
  const maxima = stats.channels.slice(0, 3).map((c) => c.max);
  expect(Math.max(...maxima)).toBeGreaterThan(40);
  const stdev = Math.max(...stats.channels.slice(0, 3).map((c) => c.stdev));
  expect(stdev).toBeGreaterThan(5);
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
  await expect(page.locator("[data-bh-note]")).toContainText(/WebGL2 is unavailable/i);
  await ctx.close();
});

test("shows the still image with JavaScript disabled", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/projects/black-hole/");
  await expect(page.locator("img[src*='render.png']")).toBeVisible();
  await ctx.close();
});

test("holds a still frame under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/black-hole/");
  await page.waitForTimeout(600);
  const canvas = page.locator("canvas[data-lensing]");
  const a = await canvas.screenshot();
  await page.waitForTimeout(900);
  const b = await canvas.screenshot();
  expect(Buffer.compare(a, b)).toBe(0);
});

test("the canvas is keyboard orbitable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/black-hole/");
  const canvas = page.locator("canvas[data-lensing]");
  await canvas.focus();
  const before = await canvas.screenshot();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(300);
  const after = await canvas.screenshot();
  expect(Buffer.compare(before, after)).not.toBe(0);
});
