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

A Life board takes no input after generation zero. Everything it will ever do
is already sitting in the starting cells, which makes the useful question a
backwards one: given a picture, what start produces it?

This program answers that for text. The board above is its output — 318
gliders that spend 436 generations flying at each other and stop as the words
GAME OF LIFE. The one at the top of the front page is the same program run on
my name, settling at generation 276.

## How it works

The renderer turns each glyph pixel into a 2×2 block, a still life, so once it
exists it stays put. That leaves the planner 159 blocks to build out of
gliders without any of the deliveries running into each other.

It works outward from the centre of the text. Each block gets two gliders
aimed to collide on it, launched from the pair of outward directions its
position implies and delayed by whole glider periods until the flight path is
clear of everything already placed. The delay is the trick. A block whose
gliders would cross an earlier delivery waits its turn, and there are 256 slots
to try before the planner gives up on it.

What it never does is run the combined board to find out whether a slot works.
It proves that instead: no live cell of the candidate ever comes within a move
of a live cell of a placed block at the same generation, and every dead cell
taking neighbours from both flips the way it would flip for each of them
alone. Both are checked against a running record of where every placed block
has been, generation by generation. The finished construction is simulated
once at the end, and refused if the last cells are not exactly the text that
was asked for.

## Two front ends

The desktop app is PySide6. The browser version at
[conway.martinsundal.no](https://conway.martinsundal.no/) runs the same Python
planner in a Pyodide worker, with the canvas and simulation loop in TypeScript.
First visit downloads the WebAssembly runtime and NumPy, then caches them.

Patterns export as RLE, so anything it builds opens in Golly or LifeViewer
like any other Life pattern.
