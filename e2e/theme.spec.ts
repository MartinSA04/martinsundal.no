import { test, expect } from "@playwright/test";

test("defaults to light with no stored preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("cycles light -> dark -> deep-space -> light", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const html = page.locator("html");
  const toggle = page.locator("#theme-toggle");
  await toggle.click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await toggle.click();
  await expect(html).toHaveAttribute("data-theme", "deep-space");
  await toggle.click();
  await expect(html).toHaveAttribute("data-theme", "light");
});

test("persists the choice under the msa-theme key", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.locator("#theme-toggle").click();
  expect(await page.evaluate(() => localStorage.getItem("msa-theme"))).toBe(
    "dark",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("applies the stored theme before first paint", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("msa-theme", "dark"));
  await page.goto("/", { waitUntil: "commit" });
  expect(await page.locator("html").getAttribute("data-theme")).toBe("dark");
});

test("follows the system preference when nothing is stored", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("the toggle reports its state to assistive tech", async ({ page }) => {
  await page.goto("/");
  const toggle = page.locator("#theme-toggle");
  await expect(toggle).toHaveAttribute("aria-label", /theme/i);
  const before = await toggle.getAttribute("aria-label");
  await toggle.click();
  expect(await toggle.getAttribute("aria-label")).not.toBe(before);
});

test("keeps .site-header for the RPG", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".site-header")).toHaveCount(1);
});

test("skip link is the first focusable element and targets main", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toHaveAttribute("href", "#main");
  await expect(page.locator("#main")).toHaveCount(1);
});
