# Source material

Facts about Martin and the projects, from Martin, recorded 2026-08-09. This
exists so copy on the site can be written from what is true instead of from
what sounds plausible.

**Rule for anyone writing copy from this file:** do not upgrade these reasons.
There is no unifying thesis behind the side projects and inventing one is the
single most common way this site's prose goes wrong. If a paragraph needs a
motive that is not written down here, ask rather than supply it.

## Why the side projects exist

All of them are for fun. Martin made them because he wanted to. There is no
deeper motive, no career plan, and not even a need to learn something — that
last one matters, because "I built it to understand how it worked" is the
default story for a portfolio and it is not the true one here.

**Game of Life text generator.** He watched a video about Game of Life and its
Turing completeness, then had the idea of generating his own name by running a
simulation. That idea became the text generator.

**Interactive black hole renderer.** He finds black holes cool and wanted a
black hole background for his phone. He could not find exactly what he wanted,
so he wrote a simulation in JavaScript while in videregående — a single render
took 30 minutes. The version on the site is a full rework of that one, done
because he wanted to and found it fun.

**Study Companion.** He likes making tools that help his friends. It just
happens to be available to everyone as well.

**Cipherbound.** He likes retro games, and he needed a good project for the C++
course at NTNU (TDT4102). The course was an excuse to spend 200 hours on it.

**NTNU course API and MCP server.** He wanted to be able to ask Claude about his
schedule. That is the whole reason.

## Aker Solutions

The main thing he works on is the code for the **welding planner used in the
Verdal Production Line (VPL)**.

He does a lot beyond that. He is part of a small tech team responsible for the
entire VPL and for many more projects at Aker, including data collection
frameworks for machine learning.

Confidentiality constraint still applies: anything published about Aker must
trace to material Aker has already published. The role description above is
Martin's own and is fine to characterise in general terms; internal figures,
process detail and the Aker mark are not.

## Studies

NTNU, programme MTFYMA (Fysikk og matematikk, integrated MSc, 5 years), cohort
2024, so year 03 of 05 begins autumn 2026. Specialization MTFYMAKVANTE24,
Kvanteteknologi, chosen from year 03.

Why quantum technology, in Martin's words: he is excited about where quantum
goes next, and wants to be on the frontier of physics and computing. Note that
year 03 is the first year of the programme with any choice in it, and there were
four specializations on offer — biophysics and medical technology, industrial
mathematics, quantum technology, technical physics.

Verified against the NTNU catalogue on 2026-08-09, year 03 of that
specialization is eight courses, not four:

| Semester | Courses |
| --- | --- |
| Autumn | TFE4146 Semiconductor devices · FY2045 Quantum mechanics I · TFY4220 Solid state physics · TFY4345 Classical mechanics |
| Spring | TIØ4252 Technology management · TFE4181 Advanced optics and photonics · TFY4355 Quantum information and computation · TFE4169 Nanoelectronics |

The four named in `src/components/home/Studies.astro` (FY2045, TFY4220, TFE4169,
TFY4355) are the quantum-relevant half, which is a fair selection — but the
comment in that file calls them "the third-year courses that specialization
actually carries", which overstates it.

TDT4102, the C++ course Cipherbound was written for, is in this same study plan,
spring of year 02.

## Writing notes

Martin's own account of the projects is flat and specific: a video, a phone
background, friends, an excuse, a schedule question. Copy that sounds more
purposeful than that is copy that has drifted.

Things that have been flagged as AI tells in this repo's prose, in order of how
often they show up:

- Ending every paragraph on a quotable closing line. This is the worst one.
- Manufactured origin stories, especially "I wanted to know how X worked and
  reading about it did not get me there."
- Not-X-but-Y and its variants: "not just X, it's Y", "X rather than Y".
- Rule-of-three lists and anaphora ("One is… One won… One exists…").
- Uniform sentence length across a whole block.
- Restating in prose what the readout next to it already says.

See also `memory/deai-ify-restructure-not-swap.md`: fixing these means
restructuring sentences, not swapping punctuation or vocabulary.
