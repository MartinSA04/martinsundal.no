# Fig. 05 — Studies

A new band on the home plate, carrying the studies and the quantum technology
specialization, built around an animated wavefunction surface and a Bloch
sphere.

References: the surface graph in the middle of `docs/inspo/macro.webp`, and
`docs/inspo/Bloch_Sphere_representation.svg.webp` for the sphere.

## Why

The plate says what I build and where I work. It does not say what I study, and
it does not say that from the third year the study has a direction. The
specialization is quantum technology, which is the one fact on the page that
explains why a portfolio of simulators exists at all — so it earns a band rather
than a line in the masthead meta.

The band also gives the plate its second computed figure. Fig. 00 is a node map
whose periods are real; this one is a wavefunction whose energies are real. The
figures are not decoration that happens to move, they are the thing being
described.

## Layout

A `zone` between `About` and `Contact`, three columns:

```text
┌─ FIG. 05 — Studies ─────────────────────────────────────────────────┐
│  ╷            ╷    NTNU · Trondheim               ◜◝                │
│ ─┼────────────┼─   Fysikk og matematikk         ◜  |0⟩  ◝           │
│  │  ╱╲╱╲╱╲    │    MSc · 5 yr · 2024–2029      │  ╲ │      │        │
│  │ ╲╱╲╱╲╱╲    │    Year 03 / 05                │   ╲│      │        │
│ ─┼────────────┼─                               │ ───●───  │        │
│  │            │    SPEC · KVANTETEKNOLOGI       ◟  |1⟩   ◞         │
│  ╵            ╵    lead paragraph                  ◟◞               │
│                                                                     │
│  Fig. 05a · Re ψ                                Fig. 05b · Bloch  │
└─────────────────────────────────────────────────────────────────────┘
```

Left: the surface, a contained panel at roughly 1:1 and about a quarter of the
plate width. Not a full-bleed row — on the reference sheet the surface is a
panel among panels, and that proportion is the point.

Centre: the readout and the lead.

Right: the Bloch sphere, smaller.

Below `67rem` the three columns collapse to one, surface first, in the same
order the band reads.

Numbering: this is Fig. 05. `Contact` renumbers from Fig. 05 to Fig. 06.

## The surface — a quantum corral

A particle in a circular infinite well: the thing an STM builds out of a ring of
adatoms. Separating in polar coordinates gives modes J_m(j_m1 r) e^(i m th) with
energies proportional to j_m1^2, where j_m1 is J_m's first zero — which is what
pins psi to zero on the wall at r = 1. The drawn height is the real part of a
three-mode superposition in that one well:

```text
Re psi = A * J_2(j_21 r) * cos(2th - w_A t)      four lobes, turning
       + B * J_0(j_01 r) * cos(w_B t)            a central swell, breathing
       + C * J_3(j_31 r) * cos(3th + w_C t)      six lobes, turning back

A = 1.00   B = 0.28   C = 0.34        w proportional to j_m1^2, one shared clock
```

Every frequency is the mode's real energy. The amplitudes are the only free
numbers in the figure.

**Why the well is round.** The first pass used a square box, and its silhouette
was a diamond. The reference sheet's figure is unmistakably round, with lobes
that cross in front of each other.

**Why three modes and not one.** The second pass drew the m = 2 mode alone,
because a single mode carries a single energy and therefore closes an exact
loop. But a single mode's time dependence is a rigid rotation: the shape never
changes, it only turns, and that is exactly what it looked like. Three modes at
their true energies genuinely deform — one pattern turns each way and the
central swell breathes through both.

**On giving up the exact loop.** j_m1^2 ratios are irrational, so the state is
quasi-periodic and never exactly repeats. That was the reason for the single
mode, and it was the wrong call. A seam could only appear at a restart, and
there is no restart: the figure runs from a continuous clock and evolves
smoothly forever. The loop bought nothing and cost the motion.

**Normalisation is exact rather than sampled.** At a fixed point each mode is a
cosine of fixed amplitude whose phase sweeps the whole circle, and the three
frequencies are mutually irrational — so over time the phases become
independent and the supremum is just the sum of the three amplitudes. No
sampling in time, no safety margin. It is rarely reached, which is deliberate:
the surface sits around two thirds of its height budget and swells towards the
top of it when the modes come into phase.

Constants: SPAN 120, SQUASH 0.42, RISE 98, in a 300 panel. SQUASH is the whole
look — at 1.0 the disc is seen from directly above and the lobes flatten into
shading; near 0.4 the view is low enough that they stand up. A test asserts a
lobe rises further than the plan is deep.

**Drawing.** 40 spokes of 24 samples and 12 rings of 81, hairline, no
hidden-line removal.

**The wall is not drawn.** psi is pinned to zero at r = 1, so anything drawn
there is a node: dead flat, and flat forever while the rest of the surface
moves. The mesh stops at r = 0.94 and the wall has nothing to show — it still
sets the state, through the three zeros, it just does not appear. A test samples
every polyline at two times and requires all of them to have moved.

**Markers on the axes.** Open squares at each axis end and one filled square out
along the horizontal, which is where the reference sheet puts them.

## The Bloch sphere

Drawn the canonical way, after `docs/inspo/Bloch_Sphere_representation.svg.webp`:
three axes arrowed on the positive directions and labelled x, y, z in italic;
the equator solid where it passes in front and dashed where it runs behind; both
angles marked with their arcs; the state's drop onto the equatorial plane and
the radius out to where it lands. No fill on the disc — everything on this plate
is drawn, nothing is shaded.

**The motion is a tilted precession, not a circle.** Free precession about z
holds the polar angle fixed, so the tip traces one circle and reads as a loop
with nothing to watch. Here the state precesses about an effective field lying
55 degrees off z — what a detuned drive produces — so its polar angle rises and
falls. That path is then carried round again by the lab frame's own rotation.
Two rotations composed, 2 nutations against 3 precessions per cycle: coprime, so
it does not close early, and both whole, so it does close exactly at 60s.

The state sweeps a band from 26 to 84 degrees, clear of both poles, so the angle
arcs never degenerate. Tests hold the band edges, the winding, and the closure.

**The vector holds one weight all the way round.** It used to drop to the
hairline behind the sphere as a depth cue, which read as the state fading rather
than as it passing behind. The equator already carries the depth.

**The kets hang off the ends of the z axis**, out where the state cannot reach
them. Beside the poles, |0> and |psi> landed on each other every time the state
swung high.

## Timing

The surface's m = 2 component turns once in 72s, which sets the shared clock;
the other two modes follow from their own energies. The sphere's trajectory
closes in 60s. Both are far slower than the first pass at 24s and 12s, which
read as animations rather than as states being integrated, and a test holds both
floors.

## Copy

All facts below are from the NTNU catalogue: programme `MTFYMA`, cohort 2024,
specialization `MTFYMAKVANTE24`.

**Readout.**

- NTNU · Trondheim
- Applied Physics and Mathematics, with `Fysikk og matematikk` beneath it —
  English first, the way the specialization block already read. The two were
  the other way round at first, which left the same page stating a programme
  Norwegian-first and its specialization English-first.
- Integrated MSc · 5 years · 2024–2029
- Year 03 / 05
- Spec · Quantum Technology / Kvanteteknologi

**Lead** (draft, first person, in the register of Fig. 03):

> Five years of physics and mathematics at NTNU, and from the third year the
> quantum technology track. It is the corner of engineering where the
> mathematics is not a description of the device, it is the device — a qubit is
> a two-state vector before it is anything you can point at, and the two
> figures in this band are not pictures of that, they are it, evaluated. The
> rest of this page is simulators. This is where the physics they simulate gets
> read.

Captions: `Fig. 05a · Quantum corral · Re ψ = Σ cₘ·J_m(j_m₁·r)·cos(mθ ± ω_m t) ·
m = 0, 2, 3 · turn 72s` and `Fig. 05b · Bloch sphere · Driven qubit · tilted
precession · T 60s`.

## Code

**`src/lib/quantum.ts`** — pure, no DOM, mirroring `lensing.ts`:

- `besselJ(m, x)` — by its power series, stepped term-to-term so nothing
  overflows. x never exceeds 5.14 here, where it converges in a dozen terms.
- `psiReal(r, th, phase)` — the scalar field above, normalised to ±1.
- `meshPoints(phase)` — every spoke and ring as a `points` string, already
  projected. Screen x never moves — the pattern rotates, the geometry does not
  — so it is cached with the mode amplitude and a frame is two multiplications
  per point.
- `blochFrame(t)` — the state vector and all its furniture: tip, foot,
  arrowhead, both angle arcs, and where each label hangs.
- `AXES`, `RIM`, `BLOCH_GEOMETRY` — everything static, so the component and the
  tests read the same numbers instead of keeping copies.

**`test/quantum.test.ts`** — periodicity (`psiReal(x, y, τ) === psiReal(x, y,
τ + 2π)`), boundary conditions (ψ = 0 on all four walls for every τ), mode
orthogonality, and that no projected point escapes the panel bounds over a
full period.

**`src/components/home/Studies.astro`** — the band. Renders the τ = 0 frame
server-side, so the figure is correct and still with JavaScript off.

**`src/scripts/surface.ts`** — a `requestAnimationFrame` loop rewriting the
`points` attribute on the existing polylines and every moving part of the
sphere. An
`IntersectionObserver` pauses it when the band is off-screen, and
`prefers-reduced-motion` means it never starts at all, leaving the server-
rendered frame — the same contract the masthead keeps when `kernel.css`
collapses its animations.

**Edits elsewhere:**

- `src/pages/index.astro` — mount `Studies` between `About` and `Contact`;
  meta description gains the specialization. Adding it to the old sentence put
  the description at 190 characters against a 160 limit, so the day-job clause
  gives up "industrial software" rather than the studies giving up the point.
- `src/components/home/Contact.astro` — Fig. 05 → Fig. 06.
- `src/lib/jsonld.ts` — profile description gains the specialization;
  `knowsAbout` gains quantum technology and quantum computing; the person node
  gains `affiliation` to the existing NTNU organization node, since `alumniOf`
  alone reads as finished.
- `e2e/home.spec.ts` — assert the band renders, the specialization text is
  present, and the mesh has its expected polyline count.

## Not doing

- No hidden-line removal or shading. The reference is a wireframe and the
  transparency is what makes it read as an instrument plot.
- No interactivity — no drag-to-rotate, no scrubbing. Every other figure on the
  plate runs on its own clock and this one does too.
- No third figure. Two computed objects in one band is already the densest
  thing on the page.
- No course list. It was in the first draft as an index in the manner of the
  node map's, and it earned nothing the specialization line does not already
  say.
