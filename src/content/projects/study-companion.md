---
index: 1
name: Study Companion
tagline: An Astro framework where a university course is authored as data, not as a website.
summary: A versioned Astro integration and component library. Courses ship a course.yaml and some MDX, pin a framework version, and get a whole study site.
world:
  sub: "#f7f4ec"
  ink: "#1a1714"
  hair: "#cdc5b4"
  sig: "#8a5a2b"
spec:
  - label: Stack
    value: Astro 6 · MDX · KaTeX · TypeScript
  - label: A course is
    value: 3 thin files + a content/ folder
  - label: Client JS
    value: Near zero, islands only
  - label: Math
    value: Server-rendered KaTeX
  - label: Search
    value: Pagefind, built into dist/
tags:
  - Astro
  - MDX
  - KaTeX
  - TypeScript
  - Component library
links:
  - label: Browse the courses
    href: https://kurs.martinsundal.no
    primary: true
  - label: StudyCompanion on GitHub
    href: https://github.com/MartinSA04/StudyCompanion
repo: https://github.com/MartinSA04/StudyCompanion
live: https://kurs.martinsundal.no
languages:
  - TypeScript
  - Astro
  - MDX
datePublished: "2025-09-01"
dateModified: "2026-07-28"
---

## The problem

A study guide for one course is a weekend of work. A study guide for eight
courses is eight codebases drifting apart, each with its own half-finished
design and its own broken KaTeX.

## The shape

Invert it. The framework owns the design, the schema, the page wiring, and
twenty-odd widgets. A course owns only its content, and pins a version of the
framework by git tag.

A course repository is **three thin files** plus a `content/` folder:

- `package.json`, pinning the framework at a tag
- `astro.config.mjs`
- `src/content.config.ts`, a one-line re-export

No pages, no components, no toolchain config. The framework injects all of it.
An author writes `course.yaml` for metadata, formulas, glossary, exams and
deadlines, then `sections/NN-slug.mdx` for the material itself.

## Decisions worth defending

**Pinning by tag, not by latest.** A course built in September should still
build in June. Upgrading is a deliberate act, and `MIGRATIONS.md` documents
what each release needs.

**The build fails on a dead cross-reference.** A `<Term>` or `<FormulaRef>`
with no matching `course.yaml` entry, or a duplicate anchor, stops the build
and names the offending section file. Broken internal links in study material
are worse than useless, because you trust them and they lie.

**KaTeX runs on the server.** Formulas are HTML by the time they reach the
browser, so they are searchable, selectable, and free.

**The hub owns the course list.** A pinned course build never bakes in its
siblings, so adding a ninth course does not require rebuilding the other
eight.
