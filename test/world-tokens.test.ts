/**
 * The Study Companion page wears the framework's own palette, taken live
 * through var() from the tokens.css that ships in the pinned package — see
 * src/worlds/study-companion.css. Nothing there needs maintaining when the
 * framework's colours move.
 *
 * The `world:` block in the entry's frontmatter is the exception. It has to be
 * flat hex because the OG card is a single rasterised image with no cascade in
 * it, so it is a copy, and a copy is a thing that can go stale. This test is
 * what stops it: bump the pin to a release that repaints Flexoki and the suite
 * fails here, naming the value to change, instead of the site quietly shipping
 * a share card in last year's colours.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const tokens = readFileSync(
  "node_modules/study-companion/src/styles/tokens.css",
  "utf8",
);

/** The light `:root` block — the first one, before the dark override. */
const lightBlock = tokens.slice(
  tokens.indexOf(":root {"),
  tokens.indexOf(':root[data-theme="dark"]'),
);

/**
 * Custom properties are not all literals: `--accent` is
 * `var(--accent-light, #205ea6)`, where the fallback is the framework's own
 * default and the variable is what a course overrides per theme. A page with
 * no course sees the fallback, so that is the colour to compare against.
 */
function token(name: string): string {
  const decl = lightBlock.match(new RegExp(`${name}:\\s*([^;]+);`));
  assert.ok(decl, `${name} not found in the framework's light :root block`);
  const value = decl[1]!.trim();
  const fallback = value.match(/var\([^,]+,\s*(#[0-9a-f]{6})\s*\)/i);
  return (fallback ? fallback[1]! : value).toLowerCase();
}

const entry = readFileSync("src/content/projects/study-companion.mdx", "utf8");

/** The four `world:` keys, read straight out of the frontmatter block. */
function world(key: string): string {
  const line = entry.match(
    new RegExp(`^\\s+${key}:\\s*"(#[0-9a-f]{6})"`, "im"),
  );
  assert.ok(line, `world.${key} not found in the entry's frontmatter`);
  return line[1]!.toLowerCase();
}

test("the OG palette still matches the framework's tokens", () => {
  assert.deepEqual(
    {
      sub: world("sub"),
      ink: world("ink"),
      hair: world("hair"),
      sig: world("sig"),
    },
    {
      sub: token("--bg"),
      ink: token("--fg"),
      hair: token("--border"),
      sig: token("--accent"),
    },
  );
});
