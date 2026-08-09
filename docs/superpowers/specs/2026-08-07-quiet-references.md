# Quiet references

**Date:** 2026-08-07
**Branch:** `redesign/micrographics`
**Status:** **home plate built 2026-08-09; 02, 06, 07, 12 and 13 built then cut**
**Surface:** the home plate (`src/pages/index.astro`), `/projects/black-hole/`, `/projects/cipherbound/` — the last deferred
**Follows:** `2026-08-05-home-plates-design.md`

## What is built

| # | Where it went |
| --- | --- |
| 04 | `--tail` (Fig. 00), a new 42-graduation scale on the board's `gticks` (Fig. 01), `TICKS` (Fig. 02), `SPOKES` and the pre-existing `SQUASH = 0.42` (Fig. 05), `START_LON` (Fig. 06). Six. `ENOMSG` waits on a 404 page, which the site does not have |
| 05 | `Coastline · Slartibartfast del.` on the globe's foot band. Not the margin beside the callout — nothing that long clears the limb up there |
| 08 | `.p-scale` is now a mask-driven intensity ramp on the Big Ear alphabet. Three heads carry the linear wedge `1 5 9 D H L P T X`; Fig. 01 alone carries `.p-scale--wow` |
| 09 | `public/humans.txt`, declared from `Base.astro` with `rel="author"`. Names the references, never the locations, and states the count |
| 11 | The colophon: `· valid to 2038-01-19T03:14:07Z` |

**Outstanding:** 01 and 10, both black hole page; 03, Cipherbound. All three
are off the home plate and were not in scope for this pass.

## Cut after building — 02, 06, 07, 12, 13

All five were built on 2026-08-09, looked at, and removed. The reasons are here
so the entries are not resurrected on the same reasoning that selected them.

**12 · the Apple crash codes — a comment is not a place.** The ledger sent both
codes to the source, and in the source all they could ever be is a sentence in
a comment naming a path after a joke. **An entry that ends up as prose about
itself is not an entry.** Nothing on the plate changed, nothing computed
differently, and no visitor could find it — the only reader is someone already
reading the file, and what they get is a paragraph explaining a reference
instead of the thing being referenced.

This kills the whole class: **`/* here is a reference */` is not shipping a
reference.** If it cannot show up in the drawing or in a value, it is not on
the sheet. The same test the other four failed.

**13 · Planck, and 06 · the Voyager light-time — a value set as subtext is not
a reference.** Both landed as a small line of type under something else, and
both then had to explain themselves: `exact by definition since 2019`,
`± 8 min · Earth's orbit not modelled`. A number that needs its own caption to
be interesting is a footnote, and a footnote is the opposite of what this sheet
is doing. **A stated constant is not a hidden thing, and annotating it makes it
less hidden, not more.** The 42s work precisely because nothing on the plate
says a word about them.

This is a class, not two mistakes: **do not add an entry as a line of subtext
under an existing readout.** If it cannot be a parameter something already
computes, or a value the figure was going to print anyway, it does not go on
the plate.

**07 · CP 1919 — far too loud.** The ledger asked for a small stacked-trace
ornament; eighty traces is not small at any width. It took a column of Fig. 03,
turned a prose section into a figure section, and pulled the eye off the five
specimens above it. The subject reading was right and the size was not, and
there is no version of eighty stacked traces that is quiet. If it comes back it
is a project page's, not the plate's.

**02 · λ — the reference needs a whole world to read, and the plate cannot
spare one.** λ was supposed to be Half-Life. On a sheet that already carries ψ,
θ, φ, Σ and J_m, a lone Greek letter beside a curve reads as exactly what it
looks like: a variable. **The reference only works with the conviction around
it** — the orange, the mark, the rest of the visual language — and this plate
has none of that room. `sig: "#ff8c42"` sitting on the black hole page is a
coincidence worth enjoying and is not worth building on.

Generalised: **an entry that only reads once the surrounding design commits to
it is not a quiet reference, it is a theme.** The plate does not have a spare
theme.

Fourteen references selected over three passes, plus a deferred pair for the
Cipherbound page. **The main plate has enough — stop adding.** Anything new goes
on a project page or nowhere.

The passes and their candidate pools are kept below for the reasoning, but the
ledger in the next section is the buildable list.

## The ledger

| # | Entry | Lands on | Detail |
| --- | --- | --- | --- |
| 01 | `0x5F3759DF` + `// what the fuck?` | black hole, `spec:` block | [01](#01--0x5f3759df) |
| 02 | Half-Life orange, and λ | black hole figure | [02](#02--half-lifes-orange-and-λ) |
| 03 | Ser. no. 151, filed 1996 | Cipherbound patent plate | [03](#03--ser-no-151-filed-1996) |
| 04 | **42 × 6** + `ENOMSG` on the 404 | six figures, one off-plate | [04](#04--forty-two) |
| 05 | Slartibartfast | Fig. 06 globe margin | [05](#05--slartibartfast) |
| 06 | Light-time to Voyager 1 | Fig. 06 globe foot | [06](#06--light-time-to-voyager-1) |
| 07 | CP 1919 · P = 1.3373 s | a stacked-trace ornament | [07](#07--cp-1919--p--13373-s) |
| 08 | `6EQUJ5` | one `.p-scale` | [08](#08--6equj5) |
| 09 | `humans.txt` | `public/` | [09](#09--humanstxt) |
| 10 | `12 550 821` — Far Lands | black hole page | [N03](#n03--12-550-821--accepted) |
| 11 | `2038-01-19T03:14:07Z` | the colophon | [N04](#n04--2038-01-19t031407z--accepted) |
| 12 | `0x8BADF00D` / `0xDEADFA11` | source, the offscreen-pause paths | below |
| 13 | Planck, exact since 2019 | Fig. 05 readout | below |
| — | Konami code, the cake | Cipherbound — **deferred** | [10](#10--konami-code-and-the-cake--deferred-to-cipherbound) |

### 12 · `0x8BADF00D` / `0xDEADFA11` — accepted

Apple's iOS crash codes, jokes on purpose. **8BADF00D** — ate bad food — is the
watchdog killing an app that took too long to respond. **DEADFA11** — dead fall
— is the user force-quitting it. Both appear in real crash reports.

**Where: the source, on the paths that stop work when nobody is looking.**
`src/scripts/orbit.ts`, `Board.astro`'s `pauseWhenOffscreen`, and
`src/worlds/black-hole.ts` all kill running work on a condition — which is what
a watchdog is. Name those paths after the codes in comment.

**Not the 404.** See the collision table below.

### 13 · Planck, `6.626 070 15 × 10⁻³⁴` — accepted

Exact by definition since 2019: the kilogram is now defined *from* it rather
than measured against it, the same inversion as the metre and the speed of
light. **Where:** Fig. 05's readout, beside the specialisation it belongs to.

The one entry that is not a pop reference at all. It is here because a quantum
specialisation stated in a readout should carry the constant it is about.

## Collisions, resolved

The set is closed, so these are decided rather than flagged.

| Contested slot | Wanted it | Resolution |
| --- | --- | --- |
| The 404 | `ENOMSG 42`, the iOS crash pair, specimen 00 | **`ENOMSG 42` takes it.** It is a 42, it is part of the spread, and *no message of desired type* is precisely what a 404 is. The iOS pair moves to the source. Specimen 00 was never accepted |
| Black hole page | Far Lands, Pac-Man 256 | **Far Lands.** Pac-Man was never accepted, so there is no second overflow joke to crowd it |
| Fig. 06 globe margin | Slartibartfast, "Mostly harmless" | **Slartibartfast.** The other was never accepted |
| A commissioning line | HAL's Urbana date, Roy Batty's incept date | Moot — neither accepted |

## Density check

Worth reading before building, because the load is not even.

- **Fig. 06 is the busiest figure on the plate.** It now carries the Voyager
  light-time, the Slartibartfast note, and `START_LON = 42`. The 42 is invisible,
  but the other two are both *text in the globe's margin*. Build the light-time
  first and look at it before adding the joke — if the margin is tight,
  Slartibartfast is the one to move or cut, since it is the entry already
  acknowledged as over the ceiling.
- **The black hole page takes three additions** — the spec row, the λ label, and
  the Far Lands. That page has the room, but it is now the densest surface in the
  project and should be reviewed as a whole rather than three times.
- **`.p-scale` appears in four section heads.** Only one carries `6EQUJ5`. The
  other three get the ramp treatment without the sequence, or the entry becomes
  wallpaper.
- **Entry 07 has no assigned figure.** The stacked-trace ornament needs somewhere
  to live; that is a drawing decision and is the only open question left in the
  ledger.

## The rule

**Revised 2026-08-07, after the first pass.** The earlier version of this
section said every entry had to be a correct value, a real citation, or a real
construction in its own right — load-bearing or out.

That was the wrong constraint. **The page exists to be worth looking closely at
and to be recognisably one person's.** A reference does not have to be reachable
from the code to belong on the plate; it has to be one worth pointing at.
`0x5F3759DF` goes in the black hole spec table whether or not the renderer calls
it, and it does not.

Truth is still preferred where it is free — a value that is both a reference and
correct is strictly better, and most of these are. It is no longer a gate.

Three limits survive, because none of them was ever about accuracy:

- **Nothing goes in `alt` text, an `aria-label`, or a figure's accessible
  description.** Those are the page's plain account of what a drawing is. A joke
  in there is a wrong caption delivered to the readers with the least context to
  discount it.
- **Every entry hides in a working state, never a broken one.** No error message
  is a punchline.
- **No quotations on the home plate.** A quotation is a joke waiting to be
  recognised rather than a thing to be found. The Cipherbound exception in entry
  10 holds because that page has a character to say it.

## Correction to the earlier sheet

`src/scripts/synthesis.ts` is the **visual** two-glider synthesis of a Life
block — "synthesis" in the Life-lexicon sense, not the audio one. The site has
no audio anywhere: no `AudioContext`, no media files. Any suggestion that
depended on sound (a spectrogram payload, a tuned tone, a stated duration) is
dead and is not carried forward below.

---

## Selected

### 01 · `0x5F3759DF`

The magic constant in Quake III Arena's fast inverse square root, shipped in
`q_math.c` with its comments intact:

```c
i  = * ( long * ) &y;                       // evil floating point bit level hacking
i  = 0x5f3759df - ( i >> 1 );               // what the fuck?
```

**Where.** The black hole specimen — C++, ray tracing, a spec table that already
lists the metric and the photon sphere radius.

**Resolved: a row in `black-hole.md`'s `spec:` block.** The renderer does not
call it. It goes in anyway — that is the whole point of the revised rule.

Word the row's label so it reads as homage rather than as a claim about the code
— `Constant of record`, `Inherited from`, something in that register. The spec
block feeds JSON-LD and the OG card, so the row should not assert a fact about
the source that is untrue; it can perfectly well assert an allegiance.

**Footnote worth carrying with it:** Chris Lomont proved in 2003 that
`0x5F375A86` is very slightly better — max relative error 0.175124% against
0.175228% after one Newton step. Almost nobody uses it. That is the more
interesting half of the story and it belongs in the same comment.

### 02 · Half-Life's orange, and λ

`src/content/projects/black-hole.md` already sets `sig: "#ff8c42"` on a
near-black substrate, next to a figure about a captured ray. That is close
enough to hazard orange to read as it.

**Nothing about the palette changes.** The entry is one label: mark the captured
ray's falloff on the home-plate figure with **λ**. λ is the correct symbol for a
decay constant, so the label is right whether or not anyone reads it twice.

Q3. The cheapest entry on the list — one glyph, and the coincidence that was
already sitting there becomes deliberate.

### 03 · Ser. no. 151, filed 1996

Cipherbound's figure is drawn as a patent plate for a capture device, hinge pin
and all. A patent figure carries a filing block; this one carries the two numbers
that say what it is a drawing of.

- **151** — species in the first generation.
- **1996** — Pocket Monsters Red and Green, Japan, 27 February.

**Do not fabricate a real patent number.** A serial and a year in the patent-figure
grammar is the honest version and the funnier one. Q5.

### 04 · Forty-two

**Never written as text.** It survives only as a parameter somebody counts. Set
in type anywhere on the page it is the most worn reference on the internet, and
it makes everything near it read as a list of references.

**Not one parameter — spread across the plate.** One 42 in one file is a
coincidence. Six of them, one per figure that has numbers, is a motif: anyone who
spots the second goes looking for the rest.

Real parameters in the real files, with what they hold today:

| Figure | Site | What it is | Now → 42 | Cost |
| --- | --- | --- | --- | --- |
| Fig. 00 | `Masthead.astro` | `--tail` on N-02, percent of path the arc shows | 44 → **42** | None |
| Fig. 01 | `Board.astro` | `<g class="gticks">` is an **empty group** — the gauge has three rings and no graduations | 0 → **42** | New linework the dial has wanted since it was drawn |
| Fig. 02 | `WorkField.astro` | `ticks`, graduations per axis | 21 → **42** | Twice the density; reads as a finer scale |
| Fig. 05 | `quantum.ts` | `SPOKES`, radial lines in the corral mesh | 40 → **42** | None, 5% denser |
| Fig. 05 | `quantum.ts` | `SQUASH` — **already `0.42`**, and has been since the surface was built | — | Free |
| Fig. 06 | `globe.ts` | `START_LON`, the longitude facing the viewer at load | 8 → **42** | Rotates the opening frame 34°; check Trondheim is still on the near face |
| Off-plate | the 404 | `ENOMSG` — Linux errno 42 | **42** | A status line that is also a real errno |

**`ENOMSG` is the best of them.** Verified on this machine, not from memory:

```text
/usr/include/asm-generic/errno.h:23
#define ENOMSG    42    /* No message of desired type */
```

A 42 that is also the correct code for what a missing page is doing, and every
Linux box on earth agrees with it.

**Fig. 03 / 04 gets none.** Approach and Day job are prose and two pills; there
is no number in them to be 42, and inventing one is exactly where a spread stops
being invisible. Six on the plate, not seven — an even distribution is not worth
one visible seam.

**`humans.txt` says how many, never where.** One line — *there are six of them on
the plate* — turns a scattering into a hunt with a finish line.

### 05 · Slartibartfast

A margin note on the globe, near the coast the origin sits on — the fjords won
an award.

**This is the one entry over the ceiling.** Everything else on the sheet is at
Q6 or under; this is Q7 and it is a joke a stranger will read as a joke. It is
kept because the reference is specifically about this country, on a plate whose
author lives in it, and because it is the only entry that lands for someone who
knows nothing about any of the others. Spend the budget here or nowhere.

Note the conflict with new candidate N09 below — both want the same three
centimetres of globe margin, and two Douglas Adams jokes on one figure is a
theme rather than an easter egg. Pick one.

### 06 · Light-time to Voyager 1

The globe's foot already reads **1 turn = 1 day = 120 s**.

On **18 November 2026 at 02:16:07 PST** — `2026-11-18T10:16:07Z` — Voyager 1
reaches exactly one light-day from Earth, a moment NASA has computed to the
second. On that date the light-time to Voyager 1 is exactly one turn of this
globe.

That is the entry. The figure and the reference become the same statement, and
the plate gets a second live number to sit beside the one it already computes.

**Constants to hardcode.**

| Symbol | Value | Note |
| --- | --- | --- |
| `c` | 299 792 458 m/s | Exact by SI definition since 1983 |
| `EPOCH` | `2026-11-18T10:16:07Z` | PST is UTC−8 |
| `d(EPOCH)` | `c × 86400 s` = 25 902 068 371.2 km | **Derive it, do not copy a figure.** Secondhand km values for this milestone disagree in the last two digits; deriving from `c` is self-consistent and is the whole point of the date |
| `v` | 17.0 km/s | Unchanged since the Saturn flyby, November 1980 |

```text
d(t) = c·86400 + v·(t − EPOCH)
L(t) = d(t) / c
```

Sanity check at the time of writing (2026-08-07): `L ≈ 23 h 52 m`, counting up
to 24 h 00 m in November. Good number. It reads as a countdown without being
labelled one.

**The caveat, which has to be printed.** `v` is heliocentric. Earth's own orbit
swings the Earth–Voyager distance by up to ±1 AU over a year, which is ±499 s —
**about ±8 minutes of light-time** that this model does not carry. Three ways
out:

1. Print to the nearest minute with `± 8 min · Earth's orbit not modelled`.
   **Recommended** — printing the uncertainty is what this plate does everywhere
   else, and the caveat is itself interesting.
2. Model Earth's heliocentric angle. Ten lines, and `src/lib/globe.ts` already
   has the machinery.
3. Print distance from the **Sun** instead, which has no such wobble. Honest,
   and it loses the light-day coincidence entirely.

Do not print seconds. A figure that implies precision it does not have is the
same failure as a decorative spec row.

### 07 · CP 1919 · P = 1.3373 s

The first radio pulsar, found in 1967 by Jocelyn Bell Burnell. Harold Craft's
1970 thesis stacked 80 consecutive pulses into one plot; Peter Saville put that
plot on *Unknown Pleasures* in 1979 and it has not stopped being on things
since.

Its period is **1.3373021601895 s**. It begins 1337. Nobody arranged that.

**Where.** A small stacked-trace ornament. `src/components/micro/Trace.astro`
and `Fan.astro` already draw stacked line work.

**Numbers, if the ornament is going to be honest:** 80 traces, one per pulse,
period 1.3373 s, pulse width ~0.04 s. Stacking 80 is the real count and it is
also what the cover does.

**Caption the source and the period. Do not caption the 1337.** It is emergent
or it is nothing. Q5.

### 08 · `6EQUJ5`

Big Ear, 15 August 1977, near the 1420 MHz hydrogen line. The printout rated
signal strength `1`–`9` then `A`–`Z`; 72 seconds of rise and fall came out as
**6EQUJ5**, and the astronomer on shift circled it and wrote one word in the
margin. Never heard again.

**Where.** `.p-scale` — the short filler rule in every section head. It is
currently the only pure decoration on the plate.

Make it a real intensity ramp on the Big Ear alphabet and the rule gains a job.

**Caution:** `.p-scale` appears in four section heads. All four reading `6EQUJ5`
is a wallpaper, not a reference. Put the real sequence on one and give the
others their own readings, or make the ramp a ramp everywhere and let one
carry the sequence. Q4.

### 09 · `humans.txt`

The 2011 convention: `robots.txt` is for machines, this one is for people.
Goes in `public/`, beside the `robots.txt` already there.

**Open question, and it is a real one.** Enumerating every egg and its location
kills the hunt for anyone who finds this file first — and this file is the
easiest thing on the list to find.

**Recommend: name the references, not the locations.** Credit *Unknown
Pleasures*, Quake III, Adams, Big Ear, Looking Glass. Do not write "the mesh has
42 spokes". Someone who reads the list then knows what they are looking for and
still has to find it, which is the better game and the better credit.

Draft shape, in the humanstxt.org format:

```text
/* SITE */
    Plate 001 — martinsundal.no
    Drawn in SVG and CSS. Every figure computes.

/* STANDING ON */
    Quake III Arena, id Software, 1999
    Unknown Pleasures, Joy Division / Peter Saville, 1979 — after Craft, 1970
    Big Ear, Ohio State, 15 August 1977
    Douglas Adams
    ...

/* THANKS */
    ...
```

### 10 · Konami code and the cake — deferred to Cipherbound

**Not on the home plate.** Both are allowed on `/projects/cipherbound/`, and the
distinction is the register of the page, not the quality of the joke:

- The home plate is a technical drawing. It earns attention by being dense, and a
  key sequence that summons a second thing onto it contradicts that argument.
  This is also why the earlier Konami RPG was removed, and nothing has changed.
- The Cipherbound page is **a game's page**. It already has a sprite walking its
  margin and a dialogue system. A game page may have a cheat code; that is what
  game pages are.

Two entries, both for later:

- **↑ ↑ ↓ ↓ ← → ← → B A** — Kazuhisa Hashimoto wrote it into *Gradius* in 1986
  because the game was too hard to test. *Contra* is where it became famous, at
  30 lives.
- **The cake is a lie** — *Portal*, 2007. Fits the dialogue system that page
  already runs, which is the only reason it survives the "no quotations" rule
  applied everywhere else: on that page it is a line of dialogue, in a dialogue
  box, delivered by a character.

**Status: not now.** Written down so the decision is not re-argued.

---

## Second pass

Candidates from the same seam as the ten above. The pattern in the selection is
clear enough to aim at: **a real constant or a computed number, drawn on the
plate, that a curious person can verify** — from code, games, or science —
plus one warm joke and one loud place to put credits.

Ranked. The first four are the ones I would actually build.

### N01 · `0.70 ns` — the Golden Record's own time unit

The record's cover diagram defines the hyperfine transition of neutral hydrogen
— the 21 cm line — as the fundamental time unit for everything else engraved on
it. That period is **0.70 billionths of a second**, and every other number on
the cover is expressed in multiples of it.

**Where.** A second line under entry 06's light-time, giving the same interval in
the unit the spacecraft it is measuring is carrying.

One light-day ≈ **1.23 × 10¹⁴** hydrogen periods.

This is the strongest new candidate. It extends the pick the selection liked
most, the unit is real and is defined by the object being measured, and the
number is absurd in a way a plate can state flatly. Q4.

### N02 · `0451`

The door code in *System Shock*, *System Shock 2*, *Deus Ex*, *BioShock*,
*Dishonored*, *Prey*, *Deathloop* — a signature passed down the immersive-sim
line for thirty years. It was the keypad code on Looking Glass Studios' office
in Cambridge, and the game used it first; the office took it from the game. The
Bradbury reading came along for free and the developers have never fully agreed
on how deliberate it was.

**Where.** Cipherbound's capture device already has a release drawn on it. A
device with a release has a code.

Closest new entry to the taste of the selected ten: a four-digit number, a real
provenance, invisible unless you know. Q4.

### N03 · `12 550 821` — **accepted**

Minecraft's terrain generator increases by 171.103 per block and overflows at
±12 550 821. Past that the height map stops being terrain and becomes a wall
running to the world height — the Far Lands, which existed for years before
anyone reached them legitimately.

**Where.** The black hole page, or the scatter field's axis. A real coordinate
where an arithmetic runs out.

Sits naturally beside `0x5F3759DF`: both are numbers that are famous because of
how a machine represents them, not because of what they mean. Q3.

### N04 · `2038-01-19T03:14:07Z` — **accepted**

The last second a signed 32-bit `time_t` can hold. The timestamp reads
**03:14:07**.

**Where.** Anywhere the plate states an epoch — the colophon's year is computed
at build time and is the natural neighbour.

Two facts in one value, which is the same shape as CP 1919's period, and it is
the only entry here that is also a real deadline. Q3.

### N05 · `1/137`

The fine-structure constant, ≈ 1/137.036 — the dimensionless number that fixes
how strongly light couples to matter, which is precisely what a quantum corral
is a picture of. Pauli, who spent a career on it, died in room 137 of the
Rotkreuz hospital in Zurich.

**Where.** Fig. 05's readout or the corral's caption, which already carries the
mode sum.

Q4, and the room is not printed. The number is the entry; the story is for
whoever already knows it.

### N06 · `c = 299 792 458 m/s`

Not a reference so much as the honest companion to entry 06: print the constant
the light-time readout divided by. It has been exact by definition since 1983 —
the metre is defined from it, not the other way round — which is a fact most
people find out with some surprise.

Q2. One line, and it makes the Voyager readout auditable by anyone with a
calculator.

### N07 · Specimen 00

The specimen field runs 01–05. **MissingNo.** is Pokédex index 000: not a
species, an out-of-range read rendered as one.

**Where.** The 404 page, as specimen 00.

A missing-page plate numbered for the thing that is not there. Do **not** put an
empty specimen on the home plate — on a portfolio that reads as a bug, which is
the one place this cannot afford to be misread. Q4.

### N08 · Level 256

Pac-Man's level counter is one byte. The fruit-drawing routine adds 1 to the
level number; on level 256 it adds 1 to 255, the byte rolls to 0, and the
routine reads whatever follows as drawing instructions. The right half of the
screen fills with garbage and the game stops being a game.

**Where.** Needs a home. It has no natural one yet, which is why it is this far
down — the black hole page is the only candidate and Far Lands (N03) is already
aimed there, and two overflow jokes on one page is one too many.

**Hold unless N03 goes somewhere else.** Q3.

### N09 · Mostly harmless

The Guide's revised entry for Earth, in its entirety.

**Where.** The globe's data block, beside `Orthographic · graticule 15°`.

**Conflicts directly with entry 05.** Both are Adams, both want the globe's
margin, and two of them together stop being a hidden joke and start being a
bit. Listed because it is arguably the better of the two — it is shorter, it
reads as a legend entry rather than as a punchline, and it is on the nose for a
figure whose entire job is labelling a planet. Q5.

### N10 · The SEP field

*Somebody Else's Problem*: a cloaking device that works because the eye refuses
to rest on the thing. It is a fair description of what every entry in this
document is trying to be.

**Where.** The class or data attribute the eggs are hung on. Source only, and it
documents itself.

Q1, and it costs nothing. The weakest entry that is still clearly worth doing.

### N11 · `sv_gravity 800`

Half-Life's default gravity, in units per second squared. Real engine default,
still the value in Source today.

**Where.** The black hole page, in a column of real gravitational figures.

Q3, and it only works if the column around it is real — one made-up neighbour
and the whole table is decoration. Weakest of the game entries because the joke
needs a table built to hold it.

### Held, and why

Two of these were held for reasons the revised rule dissolved. Struck through
below; both are now live and are carried into the third pass.

| Candidate | Why not |
| --- | --- |
| A spectrogram payload | **There is no audio on this site.** `synthesis.ts` is the visual Life synthesis. Still dead |
| The Deep Note, A440, the Microsoft Sound's 3.25 s | Same — every one needs sound the page does not have. Still dead |
| HTTP 418, RFC 2324 | GitHub Pages cannot return a custom status, so it can only be a comment. Weak, not blocked |
| ~~`2^53 − 1`~~ | ~~No natural home~~ — no longer a disqualification |
| ~~`0xCAFEBABE`~~ | ~~Nothing on this site is Java~~ — no longer a disqualification |
| Improbability 2^276709 | The board settles at 276. Too thin to state |

## Third pass — closed

Twenty-five further candidates were generated under the revised rule and are
kept as **Plate 003**. **Two were taken:** the Apple crash-code pair and the
Planck constant, both now in the ledger above.

The rest are not rejected, they are **surplus to what the main plate can hold**.
The strongest of them, kept here so the pool is not regenerated from scratch:

| Candidate | Note |
| --- | --- |
| **Gargantua, `a/M = 0.999`** | Thorne and Double Negative's published spin, CQG 2015. The best unplaced entry in the whole project. It is a **black hole page** entry, not a main-plate one — if that page is ever revised, take this first |
| `0451` | A Cipherbound entry. Goes with the deferred Konami pair whenever that page is worked on |
| Mew, under the truck | Same — Cipherbound, whenever |
| `0xCAFEBABE`, the Cobra Mk III wireframe, K&R `hello, world`, `1/137`, `1:4:9`, specimen 00, `sv_gravity 800`, Arecibo 23 × 73, `2^53 − 1`, the Golden Record's 0.70 ns | All still good, all now surplus. Plate 003 has the reasoning |

**Do not add more to the home plate.** The count that matters is not how many
references it holds but how long it takes a stranger to notice it is holding
any.

---

## Not doing

Carried from the first pass, unchanged.

- **A quotation, anywhere on the home plate.** A quotation is not quiet — it is a
  joke waiting to be recognised, and it dates the page to the year it was added
  rather than to nothing at all. The Cipherbound exception in entry 10 holds
  only because that page has a character to say it.
- **Anything inside `alt`, `aria-label`, or a figure description.**
- **An error state as a punchline.** The one visitor who genuinely cannot run
  the page gets an explanation, not a gag.
- **Forty-two, set in type.** Entry 04 or nothing.

## Order to build in

Ordered by cost. Nothing here blocks anything else, so this is a suggestion
about momentum rather than a dependency graph.

1. **02** — one glyph.
2. **12** — comments on three existing pause paths.
3. **04, the invisible four** — `--tail`, `SPOKES`, `START_LON`, and noting
   `SQUASH` was already 0.42. Four one-line changes, no drawing affected.
4. **11, 13** — a line in the colophon, a line in the Fig. 05 readout.
5. **01, 10** — two rows in `black-hole.md`, plus its λ label if 02 is not
   already done.
6. **09** — a file in `public/`. Write it last of the cheap ones, once the
   count of 42s is final.
7. **04, the two that draw** — 42 graduations on the board's empty `gticks`,
   42 ticks on the plot's axes. These change figures; review them on screen.
8. **08** — `.p-scale` stops being decoration.
9. **06** — a `src/lib/` module and a test, same as every other computed figure
   on the plate. The biggest single piece of work in the ledger.
10. **05** — after 06, so the globe margin is judged with the light-time already
    in it.
11. **07** — needs a home and a drawing. The only open question left.
12. **03** — Cipherbound, whenever that page is next opened.

**Not now:** the Konami pair, and everything in the third-pass surplus table.
