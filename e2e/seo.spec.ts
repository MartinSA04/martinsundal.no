import { test, expect } from "@playwright/test";

export const PAGES = [
  "/",
  "/work/",
  "/projects/study-companion/",
  "/projects/ntnu-api/",
  "/projects/cipherbound/",
  "/projects/black-hole/",
  "/projects/game-of-life/",
];

for (const path of PAGES) {
  test.describe(path, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test("has exactly one h1", async ({ page }) => {
      await expect(page.locator("h1")).toHaveCount(1);
    });

    test("has a self-referencing canonical", async ({ page }) => {
      const href = await page.locator("link[rel=canonical]").getAttribute("href");
      expect(href).toBe(`https://martinsundal.no${path}`);
    });

    test("has a title and a description within sane length", async ({ page }) => {
      expect((await page.title()).length).toBeGreaterThan(10);
      const desc = await page.locator("meta[name=description]").getAttribute("content");
      expect(desc!.length).toBeGreaterThan(50);
      expect(desc!.length).toBeLessThanOrEqual(160);
    });

    test("has an absolute og:image", async ({ page }) => {
      const og = await page.locator("meta[property='og:image']").getAttribute("content");
      expect(og).toMatch(/^https:\/\/martinsundal\.no\//);
    });

    test("every JSON-LD block parses and is a graph", async ({ page }) => {
      const blocks = await page
        .locator("script[type='application/ld+json']")
        .allTextContents();
      expect(blocks.length).toBeGreaterThan(0);
      for (const b of blocks) {
        const parsed = JSON.parse(b);
        expect(parsed["@context"]).toBe("https://schema.org");
        expect(Array.isArray(parsed["@graph"])).toBe(true);
        expect(parsed["@graph"].length).toBeGreaterThan(0);
      }
    });

    test("all images carry alt text and explicit dimensions", async ({ page }) => {
      const imgs = page.locator("img:not([aria-hidden='true'])");
      const n = await imgs.count();
      for (let i = 0; i < n; i++) {
        const img = imgs.nth(i);
        expect(await img.getAttribute("alt")).not.toBeNull();
        expect(await img.getAttribute("width")).not.toBeNull();
        expect(await img.getAttribute("height")).not.toBeNull();
      }
    });

    test("declares a language", async ({ page }) => {
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
    });
  });
}

test("sitemap lists all seven pages and excludes the kitchen sink", async ({ request }) => {
  const index = await (await request.get("/sitemap-index.xml")).text();
  const url = index.match(/<loc>([^<]+sitemap-0\.xml)<\/loc>/)![1];
  const body = await (await request.get(url)).text();
  for (const p of PAGES) expect(body).toContain(`https://martinsundal.no${p}`);
  expect(body).not.toContain("kitchen-sink");
});
