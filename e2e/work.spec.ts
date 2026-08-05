import { test, expect } from "@playwright/test";

test("video transfers zero bytes before the user clicks play", async ({ page }) => {
  const videoRequests: string[] = [];
  page.on("request", (r) => {
    if (/\.(webm|mp4)$/.test(new URL(r.url()).pathname)) videoRequests.push(r.url());
  });
  await page.goto("/work/");
  await page.waitForLoadState("networkidle");
  expect(videoRequests).toHaveLength(0);
});

test("clicking the facade loads and plays the video", async ({ page }) => {
  await page.goto("/work/");
  await page.locator("[data-video-facade] button").click();
  const video = page.locator("[data-video-facade] video");
  await expect(video).toBeVisible();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState), { timeout: 20_000 })
    .toBeGreaterThan(0);
});

test("the facade is keyboard reachable and labelled", async ({ page }) => {
  await page.goto("/work/");
  const btn = page.locator("[data-video-facade] button");
  await expect(btn).toHaveAttribute("aria-label", /verdal production line/i);
  await btn.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-video-facade] video")).toBeVisible();
});

test("credits Aker Solutions and links to the source", async ({ page }) => {
  await page.goto("/work/");
  await expect(page.getByText(/aker solutions/i).first()).toBeVisible();
  await expect(
    page.locator("a[href*='akersolutions.com'][href*='verdal-production-site']"),
  ).toHaveCount(1);
});

test("prints no unsourced claims", async ({ page }) => {
  await page.goto("/work/");
  const body = (await page.locator("body").innerText()).toLowerCase();
  expect(body).not.toContain("10x faster");
  expect(body).not.toContain("10 times faster");
  expect(body).not.toMatch(/opened in 2024/);
  expect(body).not.toMatch(/since 2024/);
});

test("poster reserves its space so there is no layout shift", async ({ page }) => {
  await page.goto("/work/");
  const img = page.locator("[data-video-facade] img");
  expect(await img.getAttribute("width")).not.toBeNull();
  expect(await img.getAttribute("height")).not.toBeNull();
});

test("emits a VideoObject naming Aker as copyright holder", async ({ page }) => {
  await page.goto("/work/");
  const blocks = await page.locator("script[type='application/ld+json']").allTextContents();
  const nodes = blocks.flatMap((b) => JSON.parse(b)["@graph"]);
  const video = nodes.find((n: any) => n["@type"] === "VideoObject");
  expect(video).toBeTruthy();
  expect(video.copyrightHolder.name).toBe("Aker Solutions");
  expect(video.duration).toBe("PT1M9S");
});
