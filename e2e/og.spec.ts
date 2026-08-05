import { test, expect } from "@playwright/test";

const SLUGS = [
  "home",
  "work",
  "study-companion",
  "ntnu-api",
  "cipherbound",
  "black-hole",
  "game-of-life",
];

for (const slug of SLUGS) {
  test(`og image for ${slug} is a 1200x630 png`, async ({ request }) => {
    const res = await request.get(`/og/${slug}.png`);
    expect(res.ok()).toBe(true);
    expect(res.headers()["content-type"]).toContain("image/png");
    const buf = await res.body();
    expect(buf.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect(buf.readUInt32BE(16)).toBe(1200);
    expect(buf.readUInt32BE(20)).toBe(630);
    // A card that fell back to a missing font renders nearly empty.
    expect(buf.byteLength).toBeGreaterThan(8000);
  });
}

test("each page points at its own og image", async ({ page }) => {
  for (const [path, slug] of [
    ["/", "home"],
    ["/work/", "work"],
    ["/projects/cipherbound/", "cipherbound"],
  ] as const) {
    await page.goto(path);
    const og = await page.locator("meta[property='og:image']").getAttribute("content");
    expect(og).toBe(`https://martinsundal.no/og/${slug}.png`);
  }
});
