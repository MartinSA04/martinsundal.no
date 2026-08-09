/**
 * Checks every world's token palette against WCAG.
 *
 *   node scripts/check-contrast.mjs
 *
 * Exits non-zero on any failure. The whole point of one palette per world is
 * that this is checkable once, mechanically, instead of eyeballed per page.
 */
import { readdirSync, readFileSync } from "node:fs";

const DIR = "src/content/projects";

const toLinear = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * toLinear((n >> 16) & 255) +
    0.7152 * toLinear((n >> 8) & 255) +
    0.0722 * toLinear(n & 255)
  );
};

const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const worlds = [];
for (const file of readdirSync(DIR).filter((f) => f.endsWith(".md"))) {
  const text = readFileSync(`${DIR}/${file}`, "utf8");
  const pick = (key) => {
    const m = text.match(
      new RegExp(`^\\s+${key}:\\s*"(#[0-9a-fA-F]{6})"`, "m"),
    );
    if (!m) throw new Error(`${file}: no ${key} token`);
    return m[1];
  };
  worlds.push({
    name: file.replace(/\.md$/, ""),
    sub: pick("sub"),
    ink: pick("ink"),
    hair: pick("hair"),
    sig: pick("sig"),
  });
}

// Thresholds: body text AA, accent treated as large text / UI, hairline just
// has to be perceptible.
const CHECKS = [
  ["ink on sub", (w) => ratio(w.ink, w.sub), 4.5],
  ["sig on sub", (w) => ratio(w.sig, w.sub), 3.0],
  ["hair on sub", (w) => ratio(w.hair, w.sub), 1.25],
];

let failures = 0;
for (const w of worlds) {
  console.log(`\n${w.name}`);
  console.log(`  sub ${w.sub}  ink ${w.ink}  hair ${w.hair}  sig ${w.sig}`);
  for (const [label, fn, min] of CHECKS) {
    const r = fn(w);
    const ok = r >= min;
    if (!ok) failures++;
    console.log(
      `  ${ok ? "PASS" : "FAIL"}  ${label.padEnd(12)} ${r.toFixed(2)}:1  (min ${min})`,
    );
  }
}

console.log(failures ? `\n${failures} failing` : "\nall pass");
process.exit(failures ? 1 : 0);
