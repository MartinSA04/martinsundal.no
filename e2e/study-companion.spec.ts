import { test, expect } from "@playwright/test";

test("every rendered widget reveals once its source is in view", async ({
  page,
}) => {
  await page.goto("/projects/study-companion/");
  const widgets = page.locator("[data-sc-out]");
  await expect(widgets).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    await expect(widgets.nth(i)).toHaveAttribute("data-shown", "", {
      timeout: 8000,
    });
    await expect(widgets.nth(i)).toHaveCSS("opacity", "1");
  }
});

test("widgets are all visible with JavaScript disabled", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/projects/study-companion/");
  // Content must be readable; the reveal is decoration, not a gate.
  await expect(page.locator("[data-sc-out]")).toHaveCount(3);
  expect((await page.locator(".sc-split").innerText()).length).toBeGreaterThan(
    100,
  );
  await ctx.close();
});

test("the formula renders without missing glyphs", async ({ page }) => {
  await page.goto("/projects/study-companion/");
  const text = await page.locator(".sc-formula").innerText();
  expect(text).toContain("F");
  expect(text).toContain("m");
  // U+20D7 and friends would show as tofu in the subset webfont.
  expect(text).not.toMatch(/[⃐-⃿�]/);
});
