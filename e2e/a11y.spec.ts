import { test, expect } from "@playwright/test";

const PAGES = [
  "/",
  "/work/",
  "/projects/study-companion/",
  "/projects/ntnu-api/",
  "/projects/cipherbound/",
  "/projects/black-hole/",
  "/projects/game-of-life/",
];

const THEMES = ["light", "dark", "deep-space"] as const;

/**
 * Measures the worst contrast among the page's real text, in the browser,
 * against rendered colours. Project worlds override the theme inside their own
 * subtree, so a token-level check would miss them.
 */
function worstContrast() {
  // Resolve colours through a canvas rather than parsing the string: the site
  // uses color-mix(in oklab, ...), which computes to an oklab() value, and
  // reading the first three numbers out of that as RGB gives nonsense.
  const probe = document.createElement("canvas").getContext("2d")!;
  const toRgb = (css: string): [number, number, number] => {
    probe.fillStyle = "#000";
    probe.fillStyle = css;
    probe.clearRect(0, 0, 1, 1);
    probe.fillRect(0, 0, 1, 1);
    const d = probe.getImageData(0, 0, 1, 1).data;
    return [d[0]!, d[1]!, d[2]!];
  };

  const lum = (css: string) => {
    const [r, g, b] = toRgb(css).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };

  const bgOf = (el: Element) => {
    let node: Element | null = el;
    while (node) {
      const c = getComputedStyle(node).backgroundColor;
      if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c;
      node = node.parentElement;
    }
    return (
      getComputedStyle(document.body).backgroundColor || "rgb(255,255,255)"
    );
  };

  // Only elements that render their own text. A container whose text lives in
  // a differently-coloured child (the breadcrumb <li> wrapping an <span>) would
  // otherwise be measured in a colour nothing is actually painted in.
  const ownText = (el: Element) =>
    [...el.childNodes]
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent ?? "")
      .join("")
      .trim();

  const targets = [
    ...document.querySelectorAll("main p, main li, main h1, main h2, main dd"),
  ]
    .filter((el) => ownText(el).length > 20)
    .slice(0, 16);

  let worst = 99;
  let culprit = "nothing measured";
  for (const el of targets) {
    const [hi, lo] = [lum(getComputedStyle(el).color), lum(bgOf(el))].sort(
      (a, b) => b - a,
    );
    const ratio = (hi! + 0.05) / (lo! + 0.05);
    if (ratio < worst) {
      worst = ratio;
      culprit = `${el.tagName}.${(el as HTMLElement).className} — "${(el.textContent ?? "").trim().slice(0, 40)}"`;
    }
  }
  return { worst, culprit, measured: targets.length };
}

for (const path of PAGES) {
  for (const theme of THEMES) {
    test(`${path} @ ${theme}: body text clears WCAG AA`, async ({ page }) => {
      await page.addInitScript(
        (t) => localStorage.setItem("msa-theme", t),
        theme,
      );
      await page.goto(path);
      const { worst, culprit, measured } = await page.evaluate(worstContrast);
      expect(
        measured,
        "no text was measured — the selector missed",
      ).toBeGreaterThan(2);
      expect(
        worst,
        `lowest contrast on ${path} (${theme}) — ${culprit}`,
      ).toBeGreaterThanOrEqual(4.5);
    });
  }

  test(`${path}: focus is visible on the first interactive element`, async ({
    page,
  }) => {
    await page.goto(path);
    await page.keyboard.press("Tab");
    const visible = await page.locator(":focus").evaluate((el) => {
      const s = getComputedStyle(el);
      return s.outlineStyle !== "none" || s.boxShadow !== "none";
    });
    expect(visible).toBe(true);
  });

  test(`${path}: has a main landmark and a skip link`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("main#main")).toHaveCount(1);
    await expect(page.locator("a.skip")).toHaveCount(1);
  });

  test(`${path}: heading order does not skip a level`, async ({ page }) => {
    await page.goto(path);
    const levels = await page.evaluate(() =>
      [...document.querySelectorAll("main h1, main h2, main h3, main h4")].map(
        (h) => Number(h.tagName[1]),
      ),
    );
    for (let i = 1; i < levels.length; i++) {
      expect(
        levels[i]! - levels[i - 1]!,
        `heading jump at index ${i}: h${levels[i - 1]} -> h${levels[i]}`,
      ).toBeLessThanOrEqual(1);
    }
  });
}
