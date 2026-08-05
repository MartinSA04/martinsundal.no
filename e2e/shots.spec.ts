/**
 * Visual capture harness. Not an assertion suite — it writes full-page
 * screenshots to shots/ so they can be reviewed by eye.
 *
 *   SHOTS=1 pnpm test:e2e shots --project=desktop
 *
 * Skipped unless SHOTS=1, so it never slows the real suite down.
 */
import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";

const PAGES: [name: string, path: string][] = [
  ["home", "/"],
  ["work", "/work/"],
  ["study-companion", "/projects/study-companion/"],
  ["ntnu-api", "/projects/ntnu-api/"],
  ["cipherbound", "/projects/cipherbound/"],
  ["black-hole", "/projects/black-hole/"],
  ["game-of-life", "/projects/game-of-life/"],
  ["kitchen-sink", "/kitchen-sink/"],
];

const THEMES = ["light", "dark", "deep-space"] as const;

test.skip(process.env.SHOTS !== "1", "set SHOTS=1 to capture");

for (const [name, path] of PAGES) {
  for (const theme of THEMES) {
    test(`shot ${name} ${theme}`, async ({ page }, info) => {
      const dir = `shots/${info.project.name}`;
      mkdirSync(dir, { recursive: true });
      await page.addInitScript((t) => localStorage.setItem("msa-theme", t), theme);
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: `${dir}/${name}-${theme}.png`, fullPage: true });
    });
  }
}
