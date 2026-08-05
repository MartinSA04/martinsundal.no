import { test, expect } from "@playwright/test";

const WORLDS = [
  { slug: "study-companion", sig: "#8a5a2b" },
  { slug: "ntnu-api", sig: "#ffb000" },
  { slug: "cipherbound", sig: "#88c070" },
  { slug: "black-hole", sig: "#ff8c42" },
  { slug: "game-of-life", sig: "#2563eb" },
];

const hexOf = (rgb: string) => {
  const [r, g, b] = rgb.match(/\d+/g)!.slice(0, 3).map(Number);
  return `#${[r, g, b].map((v) => v!.toString(16).padStart(2, "0")).join("")}`;
};

for (const w of WORLDS) {
  test.describe(w.slug, () => {
    test("applies its own world tokens", async ({ page }) => {
      await page.goto(`/projects/${w.slug}/`);
      const sig = await page.evaluate(() =>
        getComputedStyle(document.querySelector("[data-world]")!)
          .getPropertyValue("--sig")
          .trim(),
      );
      const normalised = sig.startsWith("#") ? sig.toLowerCase() : hexOf(sig);
      expect(normalised).toBe(w.sig);
    });

    test("shows breadcrumbs matching the structured data", async ({ page }) => {
      await page.goto(`/projects/${w.slug}/`);
      const visible = await page
        .locator("nav[aria-label='Breadcrumb'] li")
        .allInnerTexts();
      const ld = JSON.parse(
        (await page
          .locator("script[type='application/ld+json']")
          .first()
          .textContent())!,
      );
      const crumbs = ld["@graph"].find(
        (n: any) => n["@type"] === "BreadcrumbList",
      ).itemListElement;
      // The visible trail is uppercased by CSS, which innerText reflects. The
      // invariant is that the names agree, not their presentational casing.
      expect(visible.map((t) => t.trim().toLowerCase())).toEqual(
        crumbs.map((c: any) => c.name.toLowerCase()),
      );
    });

    test("renders full content with JavaScript disabled", async ({
      browser,
    }) => {
      const ctx = await browser.newContext({ javaScriptEnabled: false });
      const p = await ctx.newPage();
      await p.goto(`/projects/${w.slug}/`);
      await expect(p.locator("h1")).toBeVisible();
      expect((await p.locator("main").innerText()).length).toBeGreaterThan(400);
      await ctx.close();
    });

    test("has no horizontal overflow at 390px", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/projects/${w.slug}/`);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("holds still under reduced motion", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/projects/${w.slug}/`);
      await page.waitForTimeout(400);
      const running = await page.evaluate(
        () =>
          document.getAnimations().filter((a) => a.playState === "running")
            .length,
      );
      expect(running).toBe(0);
    });

    test("links out to the project itself", async ({ page }) => {
      await page.goto(`/projects/${w.slug}/`);
      await expect(page.locator(".links a").first()).toBeVisible();
    });
  });
}

test("each world loads only its own stylesheet payload", async ({ page }) => {
  // A shared [slug] route would ship all five worlds' CSS to every page.
  const seen: string[] = [];
  page.on("response", (r) => {
    if (r.url().endsWith(".css")) seen.push(r.url());
  });
  await page.goto("/projects/cipherbound/");
  await page.waitForLoadState("networkidle");
  const body = await Promise.all(
    seen.map(async (u) => (await page.request.get(u)).text()),
  );
  const all = body.join("\n");
  expect(all).not.toContain("--lensing");
  expect(all).not.toContain("data-world='ntnu-api'");
});
