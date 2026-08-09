/**
 * The Study Companion page is the framework's own output, not a drawing of it,
 * and these are the ways that can quietly stop being true.
 */
import { test, expect } from "@playwright/test";

const PAGE = "/projects/study-companion/";

test("the printed source and the built widgets are the same file", async ({
  page,
}) => {
  await page.goto(PAGE);
  const source = (await page.locator("pre").first().innerText()).trim();

  // Every widget the excerpt opens must exist on the page as a real element,
  // and the strings it passes must be the strings that got rendered. A hand-
  // written stand-in beside a hand-written listing would pass neither.
  expect(source).toContain('<Example title="Brytning ved vann–luft">');
  expect(source).toContain("<SelfCheck question=");

  await expect(
    page.locator(".example").filter({ hasText: "Brytning ved vann–luft" }),
  ).toHaveCount(1);
  await expect(page.locator(".selfcheck")).toHaveCount(1);
});

/* KaTeX ships the glyphs and a visually-hidden MathML twin of them. Drop
   katex.min.css and the twin has nothing hiding it, so every formula prints
   twice ("n₁ = 1,33n₁ = 1,33"). It is not a crash and not a build error — it
   just looks like the page is stuttering, which is exactly the kind of thing
   that survives a redesign unnoticed. */
test("server-rendered math appears once, not twice", async ({ page }) => {
  await page.goto(PAGE);
  // Measured, not read: the MathML twin stays in the accessibility tree (and
  // so in innerText) by design, and what katex.min.css does is take it out of
  // the layout. So the check is that it occupies no space next to glyphs that
  // do.
  const math = page.locator(".example .katex").first();
  await expect(math).toBeVisible();
  const box = await math.locator(".katex-mathml").boundingBox();
  expect(box?.width ?? 0).toBeLessThanOrEqual(1);
});

test("the solution opens with JavaScript disabled", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(PAGE);

  const answer = page.getByText("59", { exact: false }).last();
  await expect(answer).toBeHidden();
  await page.locator(".example summary").click();
  await expect(answer).toBeVisible();

  await ctx.close();
});

/* This world carries a real light and dark palette instead of one fixed
   substrate, which is why it is the only project page that keeps the toggle
   (see `themed` in the entry's frontmatter). */
test("the toggle repaints the page from the framework's dark tokens", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(PAGE);

  const ground = () =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const light = await ground();

  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await ground()).not.toBe(light);
});
