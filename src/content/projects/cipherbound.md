---
index: 3
name: Cipherbound
tagline: A Pokémon-like game written from scratch in C++, and the best project in its NTNU course.
summary: A tile-based RPG built in C++ on hand-written game systems for map streaming, turn-based battles, dialogue, and save state. Won Best Project in TDT4102.
world:
  sub: "#101820"
  ink: "#e0f8d0"
  hair: "#3f5a48"
  sig: "#88c070"
spec:
  - label: Language
    value: C++
  - label: Course
    value: TDT4102, NTNU
  - label: Award
    value: Best Project
  - label: Built on
    value: Hand-written game systems
tags:
  - C++
  - Game systems
  - Architecture
links:
  - label: Visit Cipherbound
    href: https://cipherbound.com
    primary: true
  - label: CipherBound on GitHub
    href: https://github.com/MartinSA04/CipherBound
repo: https://github.com/MartinSA04/CipherBound
live: https://cipherbound.com
languages:
  - C++
award: Best Project, TDT4102 Procedural and Object-Oriented Programming, NTNU
image:
  src: /cipherbound.png
  alt: Cipherbound screenshot showing a pixel-art town with two characters
  width: 1533
  height: 1146
datePublished: "2025-05-01"
dateModified: "2026-07-28"
---

## What it is

A tile-based creature-collecting RPG, in the shape everyone recognises: walk
a map, talk to people, get into fights, win, save, continue.

None of that comes free in C++. There is no scene graph, no entity system and
no dialogue runtime, so all of it had to be designed and written first. That
is the actual subject of the project.

## The systems underneath

**Map and collision.** Tiles carry their own walkability, so the world is
data rather than a hard-coded set of walls, and a new area is a new file.

**Turn-based battles.** A state machine over turn phases, with moves, types
and damage resolution kept separate from how any of it is drawn.

**Dialogue.** Scripted conversations that can branch and can change world
state, so an NPC can affect the game rather than only print text.

**Persistence.** Save and load across sessions, which quietly constrains every
other system: anything that matters has to be serialisable.

## Why it won

TDT4102 is where most students meet C++ properly, and most projects stop at
one working mechanic. This one is a set of systems with clean seams between
them, each extendable without reaching into the others. It took **Best
Project** in the course.

The sprite walking around the margin of this page is from it.
