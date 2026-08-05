import { test, expect } from "@playwright/test";

test("kernel tokens resolve on the document root", async ({ page }) => {
  await page.goto("/kitchen-sink/");
  const tokens = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return {
      sub: s.getPropertyValue("--sub").trim(),
      ink: s.getPropertyValue("--ink").trim(),
      hair: s.getPropertyValue("--hair").trim(),
      sig: s.getPropertyValue("--sig").trim(),
    };
  });
  expect(tokens.sub).toBe("#f4f1ea");
  expect(tokens.ink).toBe("#0b0b0c");
  expect(tokens.hair).not.toBe("");
  expect(tokens.sig).not.toBe("");
});

test("a world override repaints the kit without touching components", async ({
  page,
}) => {
  await page.goto("/kitchen-sink/");
  const rule = page.locator("[data-micro='rule']").first();
  const before = await rule.evaluate(
    (el) => getComputedStyle(el).borderTopColor,
  );
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--hair", "rgb(255, 0, 0)");
  });
  const after = await rule.evaluate(
    (el) => getComputedStyle(el).borderTopColor,
  );
  expect(before).not.toBe("rgb(255, 0, 0)");
  expect(after).toBe("rgb(255, 0, 0)");
});

test("IDX label zero-pads", async ({ page }) => {
  await page.goto("/kitchen-sink/");
  await expect(page.locator("[data-micro='index']").first()).toHaveText(
    /IDX_0[1-9]/,
  );
});

test("Barcode is deterministic for a given seed", async ({ page }) => {
  const alpha = "[data-micro='barcode'][data-seed='alpha']";
  await page.goto("/kitchen-sink/");

  // Every instance of a seed must be byte-identical to every other.
  const first = await page
    .locator(alpha)
    .evaluateAll((els) => els.map((e) => e.innerHTML));
  expect(first.length).toBeGreaterThan(1);
  expect(new Set(first).size).toBe(1);

  // And stable across a reload.
  await page.reload();
  const second = await page
    .locator(alpha)
    .evaluateAll((els) => els.map((e) => e.innerHTML));
  expect(second).toEqual(first);

  // A different seed must produce a different strip, or the hash is useless.
  const bravo = await page
    .locator("[data-micro='barcode'][data-seed='bravo']")
    .first()
    .innerHTML();
  expect(bravo).not.toBe(first[0]);
});

test("every icon renders as an svg that inherits currentColor", async ({
  page,
}) => {
  await page.goto("/kitchen-sink/");
  const icons = page.locator('[data-micro="icon"]');
  await expect(icons.first()).toBeVisible();

  const names = await icons.evaluateAll((els) =>
    els.map((e) => e.getAttribute("data-icon")),
  );
  for (const name of [
    "arrow-right",
    "caret-down",
    "theme-light",
    "theme-dark",
    "theme-deep-space",
  ]) {
    expect(names).toContain(name);
  }

  // Hidden from the accessibility tree: every call site names itself in text
  // or on the parent control.
  for (const attr of await icons.evaluateAll((els) =>
    els.map((e) => e.getAttribute("aria-hidden")),
  )) {
    expect(attr).toBe("true");
  }

  // No hard-coded colour anywhere in the kit, or an icon would go invisible
  // in one of the five worlds.
  const painted = await icons.evaluateAll((els) =>
    els.flatMap((e) =>
      [...e.querySelectorAll("*")].map((n) => ({
        fill: n.getAttribute("fill"),
        stroke: n.getAttribute("stroke"),
      })),
    ),
  );
  for (const p of painted) {
    for (const v of [p.fill, p.stroke]) {
      if (v) expect(["currentColor", "none"]).toContain(v);
    }
  }
});
