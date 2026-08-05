import { test, expect } from "@playwright/test";

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

async function enterKonami(page: import("@playwright/test").Page) {
  for (const key of KONAMI) await page.keyboard.press(key);
}

test("konami code starts the RPG", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => Boolean(window.MSA_RPG))).toBe(true);
  await enterKonami(page);
  await expect(page.locator("html[data-rpg-active]")).toHaveCount(1);
  await expect(page.locator("canvas[data-rpg-canvas]")).toHaveCount(1);
});

test("escape stops it again", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => Boolean(window.MSA_RPG))).toBe(true);
  await enterKonami(page);
  await expect(page.locator("html[data-rpg-active]")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator("html[data-rpg-active]")).toHaveCount(0);
});

test("the spawn image is laid out, or the player has nowhere to appear", async ({
  page,
}) => {
  await page.goto("/");
  const box = await page.locator("[data-rpg-spawn] img").boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(20);
  expect(box!.height).toBeGreaterThan(20);
});

test("the black hole easter egg target is present, sized, and still render.png", async ({
  page,
}) => {
  await page.goto("/");
  const img = page.locator("img[src*='render.png']");
  await expect(img).toHaveCount(1);
  const box = await img.boundingBox();
  expect(box!.width).toBeGreaterThan(20);
  // rpg.js walks the .project-card that contains it.
  await expect(page.locator(".project-card img[src*='render.png']")).toHaveCount(1);
});

test("the RPG does not load on project pages", async ({ page }) => {
  await page.goto("/projects/cipherbound/");
  await enterKonami(page);
  await expect(page.locator("html[data-rpg-active]")).toHaveCount(0);
  expect(await page.evaluate(() => Boolean(window.MSA_RPG))).toBe(false);
});
