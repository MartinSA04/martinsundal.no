---
index: 5
name: Game of Life Text Generator
tagline: Type a word and it gets built out of colliding gliders in Conway's Game of Life.
summary: A planner that aims two gliders per pixel so they collide into still-life blocks spelling what you typed, verified by simulation before anything is shown.
world:
  sub: "#fbfbf8"
  ink: "#14161a"
  hair: "#c4c8cf"
  sig: "#2563eb"
spec:
  - label: Planner
    value: Python 3.14
  - label: Browser app
    value: TypeScript + Pyodide worker
  - label: Desktop app
    value: PySide6
  - label: Per pixel
    value: Two gliders, aimed and delayed
  - label: Export
    value: RLE, opens in Golly
tags:
  - Python
  - Cellular automata
  - TypeScript
  - Pyodide
links:
  - label: Try it in your browser
    href: https://conway.martinsundal.no/
    primary: true
  - label: GameOfLifeText on GitHub
    href: https://github.com/MartinSA04/GameOfLifeText
repo: https://github.com/MartinSA04/GameOfLifeText
live: https://conway.martinsundal.no/
languages:
  - Python
  - TypeScript
datePublished: "2025-04-26"
dateModified: "2026-07-28"
---

## The premise

Conway's Game of Life has no author. You set a starting state, and from then
on the rules decide everything. So: pick a starting state whose future
happens to spell a word.

## How it actually works

Not by search. The renderer turns each glyph pixel into a 2×2 still-life
block, and the planner constructs a collision that produces it.

It walks the blocks outward from the centre. For each one it picks a
two-glider synthesis — a pair of gliders whose launch direction and delay make
them collide exactly where that block belongs. The hard constraint is
interference: each pair has to stay clear of every block already placed **and**
every block still to come, since those gliders have not been fired yet but
their flight paths are already spoken for.

Every construction is verified by simulation before it is shown. If the board
does not settle into the intended text, it is not offered.

## Two front ends

The desktop app is PySide6. The browser version at
[conway.martinsundal.no](https://conway.martinsundal.no/) runs the *same*
Python planner in a Pyodide worker, with the canvas and simulation loop in
TypeScript. First visit downloads the WebAssembly runtime and NumPy, then
caches them.

Patterns export as RLE, so anything it builds opens in Golly or LifeViewer
like any other Life pattern.

## The one on the front page

The header of this site is not a picture of the word "MARTIN". It is a board
that becomes it, around generation 277.
