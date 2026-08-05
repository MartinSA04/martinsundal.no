import { test, expect } from "@playwright/test";

test("home page renders and is titled", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Martin Sundal Aspås/);
});

test("CNAME survives the build", async () => {
  const { readFileSync } = await import("node:fs");
  expect(readFileSync("dist/CNAME", "utf8").trim()).toBe("martinsundal.no");
});

test("robots.txt points at the generated sitemap", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.ok()).toBe(true);
  expect(await res.text()).toContain("https://martinsundal.no/sitemap-index.xml");
});
