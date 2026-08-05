import test from "node:test";
import assert from "node:assert/strict";
import { homeGraph, projectGraph, workGraph, personNode, SITE } from "../src/lib/jsonld.ts";
import type { Project } from "../src/lib/schema.ts";

const p: Project = {
  index: 3,
  name: "Cipherbound",
  tagline: "A Pokémon-like game built from scratch in C++.",
  summary: "Core game systems, gameplay, and architecture, written in C++.",
  world: { sub: "#101820", ink: "#e0f8d0", hair: "#3a5a44", sig: "#88c070" },
  spec: [{ label: "LANG", value: "C++" }],
  tags: ["C++"],
  links: [{ label: "Visit", href: "https://cipherbound.com", primary: true }],
  repo: "https://github.com/MartinSA04/CipherBound",
  live: "https://cipherbound.com",
  languages: ["C++"],
  award: "Best Project, TDT4102, NTNU",
  datePublished: "2025-06-01",
  dateModified: "2026-07-28",
};

const slugOf = () => "cipherbound";

test("site constant has no trailing slash surprises", () => {
  assert.equal(SITE, "https://martinsundal.no");
});

test("person node has a stable @id", () => {
  assert.equal(personNode()["@id"], "https://martinsundal.no/#martin-sundal-aspas");
});

test("person node keeps the employer and university links", () => {
  const json = JSON.stringify(personNode());
  assert.match(json, /akersolutions\.com/);
  assert.match(json, /ntnu\.edu/);
  assert.match(json, /github\.com\/MartinSA04/);
});

test("project graph carries WebPage, SoftwareSourceCode and BreadcrumbList", () => {
  const types = projectGraph(p, slugOf())["@graph"].map((n: any) => n["@type"]);
  assert.deepEqual([...types].sort(), ["BreadcrumbList", "SoftwareSourceCode", "WebPage"]);
});

test("project graph references the person by @id, never inlining a duplicate", () => {
  const json = JSON.stringify(projectGraph(p, slugOf()));
  assert.ok(json.includes('"@id":"https://martinsundal.no/#martin-sundal-aspas"'));
  assert.equal((json.match(/"familyName"/g) ?? []).length, 0);
});

test("breadcrumb trail is Home then the project", () => {
  const graph = projectGraph(p, slugOf())["@graph"] as any[];
  const crumbs = graph.find((n) => n["@type"] === "BreadcrumbList").itemListElement;
  assert.equal(crumbs.length, 2);
  assert.equal(crumbs[0].name, "Home");
  assert.equal(crumbs[1].name, "Cipherbound");
  assert.equal(crumbs[1].item, "https://martinsundal.no/projects/cipherbound/");
});

test("award appears on the SoftwareSourceCode node", () => {
  const graph = projectGraph(p, slugOf())["@graph"] as any[];
  const code = graph.find((n) => n["@type"] === "SoftwareSourceCode");
  assert.equal(code.award, "Best Project, TDT4102, NTNU");
  assert.equal(code.codeRepository, "https://github.com/MartinSA04/CipherBound");
  assert.deepEqual(code.programmingLanguage, ["C++"]);
});

test("every url in a graph is absolute", () => {
  const json = JSON.stringify(projectGraph(p, slugOf()));
  for (const m of json.matchAll(/"(url|item|contentUrl|thumbnailUrl)":"([^"]+)"/g)) {
    assert.ok(m[2].startsWith("https://"), `${m[1]} was not absolute: ${m[2]}`);
  }
});

test("home graph lists every project exactly once", () => {
  const graph = homeGraph([{ data: p, id: "cipherbound" }] as any)["@graph"] as any[];
  const list = graph.find((n) => n["@type"] === "ItemList");
  assert.equal(list.numberOfItems, 1);
  assert.equal(list.itemListElement.length, 1);
  assert.equal(list.itemListElement[0].position, 1);
});

test("home graph carries Person, WebSite, ProfilePage and ItemList", () => {
  const types = homeGraph([{ data: p, id: "cipherbound" }] as any)["@graph"].map(
    (n: any) => n["@type"],
  );
  assert.deepEqual([...types].sort(), ["ItemList", "Person", "ProfilePage", "WebSite"]);
});

test("work graph omits VideoObject when no video metadata is supplied", () => {
  const types = workGraph(null)["@graph"].map((n: any) => n["@type"]);
  assert.ok(!types.includes("VideoObject"));
  assert.ok(types.includes("WebPage"));
  assert.ok(types.includes("BreadcrumbList"));
});

test("work graph includes VideoObject with duration and copyright holder", () => {
  const graph = workGraph({
    name: "Verdal Production Line highlights",
    description: "Aker Solutions' highlights from the Verdal Production Line.",
    thumbnailUrl: "https://martinsundal.no/vpl/poster.avif",
    uploadDate: "2025-08-18",
    duration: "PT1M9S",
    contentUrl: "https://martinsundal.no/vpl/highlights.mp4",
  })["@graph"] as any[];
  const v = graph.find((n) => n["@type"] === "VideoObject");
  assert.equal(v.duration, "PT1M9S");
  assert.equal(v.copyrightHolder.name, "Aker Solutions");
  assert.equal(v.uploadDate, "2025-08-18");
});
