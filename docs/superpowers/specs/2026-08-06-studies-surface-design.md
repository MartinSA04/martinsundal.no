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

A particle in a **circular** infinite well: the thing an STM builds out of a
ring of adatoms. Separating in polar coordinates,

```text
psi(r, th, t) = J_m(j_mn * r) * e^(i*m*th) * e^(-i*E*t)

Re psi = J_2(j_21 * r) * cos(2*th - w*t)        j_21 = 5.13562 (first zero of J_2)
```

Two up-lobes and two down-lobes on a disc, turning about the axis. J_m is the
Bessel function of the first kind; pinning j_21 to the wall is what forces psi
to vanish at r = 1, so the rim is flat and the lobes rise inside it.

**Why the well is round.** The first pass used a square box, and its silhouette
was a diamond. The reference sheet's figure is unmistakably round, with lobes
that cross in front of each other. The corral is the same physics on the domain
the drawing actually has.

**Why one mode and not four.** A single mode carries a single energy, so its
time dependence is a rigid rotation of the pattern and Re psi is exactly
periodic — full stop. Mixing modes would ripple the surface, but a circular
well's energies go as j_mn^2 and those ratios are irrational (5.783 against
26.37 for the first two), so no combination of them ever closes a loop. Rigid
rotation is not a compromise here; it is what a circular well permits, and the
square box's four-mode ripple was only available because its energies happened
to be integers.

The projection does the rest. Seen nearly edge-on, the lobes sweep past one
another and the silhouette changes continuously even though the surface is
rigid.

Constants: SPAN 120, SQUASH 0.42, RISE 86, in a 300 panel. SQUASH is the whole
look — at 1.0 the disc is seen from directly above and the lobes flatten into
shading; near 0.4 the view is low enough that they stand up. A test asserts a
lobe rises further than the plan is deep, so the figure cannot silently go flat
again.

**Drawing.** 40 spokes of 24 samples and 12 rings of 81, hairline, no
hidden-line removal.

**The wall is not drawn.** psi is pinned to zero at r = 1, so anything drawn
there is a node: dead flat, and flat forever while the rest of the surface
turns. Drawing it put a static ellipse around a moving figure, which read as a
frame rather than as part of the state. The mesh therefore stops at r = 0.94 and
the wall has nothing to show — it still sets the state, through j_21, it just
does not appear. A test samples every polyline at two phases and requires all of
them to have moved.

**Markers on the axes.** Open squares at each axis end and one filled square out
along the horizontal, which is where the reference sheet puts them. Not panel
corners — that was the first pass, and it read as a crop mark rather than a
plot.

## The Bloch sphere

Drawn the canonical way, after `docs/inspo/Bloch_Sphere_representation.svg.webp`:

```text
|psi> = cos(th/2)|0> + e^(i*ph)*sin(th/2)|1>     th = 52 deg fixed, ph advancing
```

- Three axes with arrowheads on the positive directions, labelled x, y, z in
  italic; z carries on below the origin, unarrowed, to |1>.
- The equator split at the silhouette: solid where it passes in front of the
  sphere, dashed where it runs behind.
- Both angles marked with their arcs — th from the z axis to the state, ph in
  the equatorial plane from the x axis — and both arcs swing with the state
  rather than sitting in a fixed plane.
- The state's drop onto the equatorial plane, and the radius out to where it
  lands: the pair that fixes ph.
- Dots at both poles and at the tip. No fill on the disc: everything on this
  plate is drawn, nothing is shaded.

th is fixed and ph advances, which is free precession.

## Timing

The surface turns once in 72s and the sphere precesses in 54s. Both are much
slower than the first pass at 24s and 12s, which read as animations rather than
as states being integrated. An m = 2 pattern looks the same after half a turn,
so the surface repeats every 36s, against the sphere's 54 — a 2:3 ratio, so the
band never settles into one beat. A test holds both floors.

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

Captions: `Fig. 05a · Quantum corral · Re ψ = J₂(j₂₁·r)·cos(2θ − ωt) · m = 2 ·
T 72s` and `Fig. 05b · Bloch sphere · θ = 52° · precession · T 54s`.

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
- No multi-mode ripple on the surface. A circular well cannot close a loop with
  more than one mode, and a seamless loop is worth more here than a busier
  figure.
- No third figure. Two computed objects in one band is already the densest
  thing on the page.
- No course list. It was in the first draft as an index in the manner of the
  node map's, and it earned nothing the specialization line does not already
  say.
