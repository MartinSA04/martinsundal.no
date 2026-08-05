import { test, expect } from "@playwright/test";

test("runs a real query against the live worker", async ({ page }) => {
  await page.goto("/projects/ntnu-api/");
  await page.locator("[data-mcp-preset='search']").click();
  await expect(page.locator("[data-mcp-result]")).toContainText(
    /TFY|FY\d|TDT/,
    {
      timeout: 25_000,
    },
  );
  await expect(page.locator("[data-mcp-wire]")).toContainText(
    '"method": "tools/call"',
  );
  await expect(page.locator("[data-mcp-dot]")).toHaveAttribute(
    "data-state",
    "live",
  );
  await expect(page.locator("[data-mcp-fallback]")).toBeHidden();
});

test("falls back to a labelled snapshot when the worker is unreachable", async ({
  page,
}) => {
  await page.route("**ntnu-mcp.martinsundal.no/**", (r) => r.abort());
  await page.goto("/projects/ntnu-api/");
  await page.locator("[data-mcp-preset='search']").click();
  const fb = page.locator("[data-mcp-fallback]");
  await expect(fb).toBeVisible({ timeout: 15_000 });
  await expect(fb).toContainText(/snapshot/i);
  await expect(fb).toContainText(/not invented data/i);
  // The snapshot still shows genuine course codes.
  await expect(page.locator("[data-mcp-result]")).toContainText(/TFY|FY\d/);
});

test("the console is keyboard operable", async ({ page }) => {
  await page.goto("/projects/ntnu-api/");
  const btn = page.locator("[data-mcp-preset='search']");
  await btn.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-mcp-result]")).toContainText(
    /TFY|FY\d|TDT/,
    {
      timeout: 25_000,
    },
  );
});

test("grade distribution renders as bars", async ({ page }) => {
  await page.goto("/projects/ntnu-api/");
  await page.locator("[data-mcp-preset='grades']").click();
  await expect(page.locator(".mcp-bar-fill").first()).toBeVisible({
    timeout: 25_000,
  });
});

test("the console degrades to readable copy without JavaScript", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/projects/ntnu-api/");
  await expect(page.locator("[data-mcp]")).toBeVisible();
  await expect(page.locator("[data-mcp-wire]")).toContainText(/Pick a tool/);
  await ctx.close();
});
