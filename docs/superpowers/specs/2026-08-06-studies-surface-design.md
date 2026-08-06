# Fig. 05 — Studies

A new band on the home plate, carrying the studies and the quantum technology
specialization, built around an animated wavefunction surface and a Bloch
sphere.

Reference: the surface graph in the middle of `docs/inspo/macro.webp`, and the
wireframe sphere on the same sheet.

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
│  Fig. 05a · Re ψ       ── course index ─────────  Fig. 05b · Bloch  │
└─────────────────────────────────────────────────────────────────────┘
```

Left: the surface, a contained panel at roughly 1:1 and about a quarter of the
plate width. Not a full-bleed row — on the reference sheet the surface is a
panel among panels, and that proportion is the point.

Centre: the readout and the lead.

Right: the Bloch sphere, smaller, with the course index running beneath the
centre and right columns.

Below `67rem` the three columns collapse to one, surface first, in the same
order the band reads.

Numbering: this is Fig. 05. `Contact` renumbers from Fig. 05 to Fig. 06.

## The surface — Re ψ(x, y, t)

A particle in a two-dimensional infinite square well, ħ = m = L = 1, in a
four-mode superposition. The drawn height is the real part.

```text
ψ(x, y, τ) = a·φ₁₁·e^(-2iτ)  +  b·(φ₂₁ + i·φ₁₂)·e^(-5iτ)  +  c·φ₁₃·e^(-10iτ)

φₙₘ(x, y) = sin(nπx)·sin(mπy)          Eₙₘ ∝ n² + m²  →  2, 5, 5, 10

Re ψ = a·φ₁₁·cos 2τ
     + b·(φ₂₁·cos 5τ + φ₁₂·sin 5τ)
     + c·φ₁₃·cos 10τ
```

Three properties do the work:

**The saddle rotates.** φ₂₁ and φ₁₂ are degenerate at E = 5. Adding them in
phase gives a four-lobe saddle that only breathes; adding them in quadrature —
the `+ i·φ₁₂` — gives one that turns. That turning saddle is the shape on the
reference sheet, reached from the physics rather than drawn to match it.

**It ripples rather than merely spins.** φ₁₁ and φ₁₃ sit 3 below and 5 above
the pair, so they beat against it at two different rates instead of riding
along. The detunings have to differ: φ₂₂ at E = 8 is the obvious fourth mode
and it is the wrong one, because its beat of 3 matches φ₁₁'s exactly and the
two swells then move as one. At 3 and 5 the mesh is never twice in the same
state within a period. Without either mode the figure is a rotating rigid shape
and reads as a rendered object rather than a state being integrated.

φ₁₃ is also the only asymmetric term, which keeps the figure from resolving
into something with a mirror line — the reference sheet's surface has none
either.

**The loop has no seam.** Every energy is an integer multiple of the same unit,
so ψ(τ + 2π) = ψ(τ) exactly. The animation is a closed cycle, not a long
sequence crossfaded back to its start. Nothing to keep in sync by hand.

ψ vanishes on all four walls, so the mesh meets its frame flat on every edge,
the way the reference does.

Constants:

| symbol | value | note                                              |
| ------ | ----- | ------------------------------------------------- |
| a      | 0.40  | φ₁₁, the slow swell under everything              |
| b      | 1.00  | the degenerate pair, the figure's subject         |
| c      | 0.30  | φ₁₃, the fast asymmetric ripple                   |
| T      | 24 s  | one full τ ∈ [0, 2π)                              |

Panel: `clamp(220px, 24vw, 320px)` square, viewBox 300 × 300. The Bloch sphere
is `clamp(104px, 11vw, 148px)`, viewBox 140 × 140.

Heights are normalised by the maximum \|Re ψ\| over a full period, computed once
numerically in `quantum.ts` rather than guessed, so the surface fills its panel
and never overruns it.

**Drawing.** Two families of polylines, 21 lines each, 41 samples per line,
projected axonometrically:

```text
u = x − 0.5,  v = y − 0.5
sx = (u − v)·cos30°·S
sy = (u + v)·sin30°·S − z·H
```

No hidden-line removal: the reference mesh is transparent too, which is both
the correct look and much cheaper. Hairline stroke in `--hair`, matching the
node map's `.trail`.

Around it, per the sheet: crosshair axes that overrun the field on all four
sides, and square corner handles at the panel bounds with one filled.

## The Bloch sphere

```text
|ψ⟩ = cos(θ/2)|0⟩ + e^(iφ(t))·sin(θ/2)|1⟩       θ = 55°,  φ(t) = 2πt / 12 s
```

θ is fixed and φ precesses about z, so the tip traces a circle of constant
latitude — free precession, the simplest true motion a qubit has.

Drawn: silhouette circle, equator ellipse, the dotted precession circle at
z = cos θ, the vector from origin to tip with a dot at the tip, a dashed drop
line to the equatorial plane, and |0⟩ / |1⟩ caps on the z axis.

Its 12 s period is exactly half the surface's 24 s, so the band returns to its
opening state as one system rather than two animations that happen to share a
frame. Same discipline as the node map's Kepler periods.

## Copy

All facts below are from the NTNU catalogue: programme `MTFYMA`, cohort 2024,
specialization `MTFYMAKVANTE24`.

**Readout.**

- NTNU · Trondheim
- Fysikk og matematikk — Applied Physics and Mathematics
- Integrated MSc · 5 years · 2024–2029
- Year 03 / 05
- Spec · Kvanteteknologi / Quantum Technology

**Lead** (draft, first person, in the register of Fig. 03):

> Five years of physics and mathematics at NTNU, and from the third year the
> quantum technology track. It is the corner of engineering where the
> mathematics is not a description of the device, it is the device — a qubit is
> a two-state vector before it is anything you can point at, and the two
> figures in this band are not pictures of that, they are it, evaluated. The
> rest of this page is simulators. This is where the physics they simulate gets
> read.

**Course index**, the track's third year, in the manner of the node map's path
index — code, title, term:

| code    | title                            | term |
| ------- | -------------------------------- | ---- |
| FY2045  | Kvantemekanikk I                 | H    |
| TFY4220 | Faste stoffers fysikk            | H    |
| TFE4146 | Halvlederkomponenter             | H    |
| TFY4345 | Klassisk mekanikk                | H    |
| TFY4355 | Kvanteinformasjon og -beregninger| V    |
| TFE4169 | Nanoelektronikk                  | V    |
| TFE4181 | Videregående optikk og fotonikk  | V    |

Caption: `Fig. 05a · Re ψ(x,y,t) · 2D box · 04 modes · T 24s` and
`Fig. 05b · Bloch · θ 55° · T 12s`.

## Code

**`src/lib/quantum.ts`** — pure, no DOM, mirroring `lensing.ts`:

- `psiReal(x, y, tau)` — the scalar field above.
- `surfaceMesh(tau)` — both polyline families as flat coordinate arrays,
  already projected, ready to serialise.
- `blochVector(t)` — tip position and its equatorial projection.
- `PEAK` — the normalising maximum, computed at module load by sampling.

**`test/quantum.test.ts`** — periodicity (`psiReal(x, y, τ) === psiReal(x, y,
τ + 2π)`), boundary conditions (ψ = 0 on all four walls for every τ), mode
orthogonality, and that no projected point escapes the panel bounds over a
full period.

**`src/components/home/Studies.astro`** — the band. Renders the τ = 0 frame
server-side, so the figure is correct and still with JavaScript off.

**`src/scripts/surface.ts`** — a `requestAnimationFrame` loop rewriting the
`points` attribute on the existing polylines and the Bloch transforms. An
`IntersectionObserver` pauses it when the band is off-screen, and
`prefers-reduced-motion` means it never starts at all, leaving the server-
rendered frame — the same contract the masthead keeps when `kernel.css`
collapses its animations.

**Edits elsewhere:**

- `src/pages/index.astro` — mount `Studies` between `About` and `Contact`;
  meta description gains the specialization.
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
