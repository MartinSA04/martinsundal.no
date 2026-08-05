import { test, expect } from "@playwright/test";

test("leads with the C++ render, not with a live simulation", async ({ page }) => {
  await page.goto("/projects/black-hole/");
  const render = page.locator(".bh-render img[src*='render.png']");
  await expect(render).toBeVisible();

  // The real artifact must come before the explanatory diagram.
  const order = await page.evaluate(() => {
    const img = document.querySelector(".bh-render img")!;
    const diagram = document.querySelector("[data-bh-diagram]")!;
    return img.compareDocumentPosition(diagram) & Node.DOCUMENT_POSITION_FOLLOWING;
  });
  expect(order).toBeTruthy();
});

test("draws the geodesic diagram", async ({ page }) => {
  await page.goto("/projects/black-hole/");
  await expect
    .poll(() =>
      page.locator("[data-bh-diagram]").evaluate((c: HTMLCanvasElement) => {
        const ctx = c.getContext("2d");
        if (!ctx || !c.width) return 0;
        const { data } = ctx.getImageData(0, 0, c.width, c.height);
        let drawn = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i]! > 0) drawn++;
        return drawn;
      }),
    )
    .toBeGreaterThan(1000);
});

test("uses no WebGL at all", async ({ page }) => {
  const contexts: string[] = [];
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
      (window as any).__ctx = [...((window as any).__ctx ?? []), type];
      return (orig as any).call(this, type, ...rest);
    } as typeof orig;
  });
  await page.goto("/projects/black-hole/");
  await page.waitForTimeout(600);
  contexts.push(...((await page.evaluate(() => (window as any).__ctx)) ?? []));
  expect(contexts).not.toContain("webgl2");
  expect(contexts).not.toContain("webgl");
});

test("nothing keeps running once the diagram is drawn", async ({ page }) => {
  await page.goto("/projects/black-hole/");
  await page.waitForTimeout(500);
  const a = await page.locator("[data-bh-diagram]").screenshot();
  await page.waitForTimeout(900);
  const b = await page.locator("[data-bh-diagram]").screenshot();
  expect(Buffer.compare(a, b)).toBe(0);
});

test("shows the render with JavaScript disabled", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/projects/black-hole/");
  await expect(page.locator("img[src*='render.png']")).toBeVisible();
  await ctx.close();
});

test("the diagram has an accessible description", async ({ page }) => {
  await page.goto("/projects/black-hole/");
  const canvas = page.locator("[data-bh-diagram]");
  await expect(canvas).toHaveAttribute("role", "img");
  const label = await canvas.getAttribute("aria-label");
  expect(label).toMatch(/light rays/i);
  expect(label!.length).toBeGreaterThan(80);
});
