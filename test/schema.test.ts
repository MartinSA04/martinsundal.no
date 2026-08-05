import test from "node:test";
import assert from "node:assert/strict";
import { projectSchema } from "../src/lib/schema.ts";

const valid = {
  index: 1,
  name: "Study Companion",
  tagline: "An Astro framework for interactive course study guides.",
  summary: "Courses are authored as plain data against a pinned framework version.",
  world: { sub: "#f4f1ea", ink: "#0b0b0c", hair: "#c9c3b6", sig: "#8a5a2b" },
  spec: [{ label: "STACK", value: "Astro · MDX · KaTeX" }],
  tags: ["Astro", "MDX"],
  links: [{ label: "Browse courses", href: "https://kurs.martinsundal.no", primary: true }],
  languages: ["TypeScript"],
  datePublished: "2026-05-01",
  dateModified: "2026-07-28",
};

test("accepts a well-formed project", () => {
  assert.equal(projectSchema.parse(valid).name, "Study Companion");
});

test("rejects a non-hex world token", () => {
  const bad = { ...valid, world: { ...valid.world, sig: "orange" } };
  assert.throws(() => projectSchema.parse(bad), /hex/i);
});

test("rejects an index outside 1..5", () => {
  assert.throws(() => projectSchema.parse({ ...valid, index: 9 }));
});

test("requires at least one link and one spec row", () => {
  assert.throws(() => projectSchema.parse({ ...valid, links: [] }));
  assert.throws(() => projectSchema.parse({ ...valid, spec: [] }));
});

test("rejects a dateModified earlier than datePublished", () => {
  assert.throws(
    () => projectSchema.parse({ ...valid, dateModified: "2026-01-01" }),
    /dateModified/,
  );
});

test("caps tagline at 160 chars so it can seed a meta description", () => {
  assert.throws(() => projectSchema.parse({ ...valid, tagline: "x".repeat(161) }));
});

test("requires alt text whenever an image is present", () => {
  const noAlt = {
    ...valid,
    image: { src: "/render.png", width: 100, height: 100 },
  };
  assert.throws(() => projectSchema.parse(noAlt));
  const withAlt = {
    ...valid,
    image: { src: "/render.png", alt: "A render", width: 100, height: 100 },
  };
  assert.equal(projectSchema.parse(withAlt).image?.alt, "A render");
});
