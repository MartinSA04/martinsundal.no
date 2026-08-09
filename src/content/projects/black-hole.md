---
index: 4
name: Interactive Black Hole Renderer
tagline: A C++ ray tracer for Schwarzschild spacetime. One photon geodesic per pixel, integrated until it hits the disc, crosses the horizon, or escapes.
summary: Gravitational lensing rendered by integrating photon geodesics with an adaptive Dormand-Prince step, sampled through a quadtree so the work lands on the parts of the frame that change.
world:
  sub: "#04040a"
  ink: "#e8e8f0"
  hair: "#2a2a3a"
  sig: "#ff8c42"
spec:
  - label: Language
    value: C++
  - label: Metric
    value: Schwarzschild
  - label: Method
    value: Null geodesic integration
  - label: Integrator
    value: Dormand-Prince 5(4)
  - label: Event horizon
    value: r = rs
  - label: Photon sphere
    value: r = 1.5 rs
  - label: Shadow
    value: b = 2.598 rs
tags:
  - C++
  - Physics simulation
  - Rendering
links:
  - label: Black-Hole-Simulator on GitHub
    href: https://github.com/MartinSA04/Black-Hole-Simulator
    primary: true
repo: https://github.com/MartinSA04/Black-Hole-Simulator
languages:
  - C++
image:
  src: /render.png
  alt: Gravitational lensing around a Schwarzschild black hole, rendered in C++
  width: 1634
  height: 1080
datePublished: "2025-03-20"
dateModified: "2026-07-28"
---

## Why it exists

Black holes are cool, and this one started as a wallpaper for a phone. Nothing
already out there was quite right, so the first version got written in
JavaScript, in high school, where a single frame took thirty minutes. What is
on this page is that program rebuilt in C++, done because rebuilding it was
fun.

## Rays that bend

An ordinary ray tracer asks what a straight line hits. Here there are no
straight lines to cast. The camera fixes a photon's position and wavevector,
and from there every pixel is an initial value problem: integrate the geodesic
equation forward and see where the ray ends up.

The state is four Schwarzschild coordinates and four wavevector components.
`BlackHole::deriv` writes the Christoffel terms out longhand, so one derivative
costs a couple of dozen multiplications and the integrator can afford to call
it constantly.

## Where the step gets small

The integrator is Dormand–Prince 5(4). Six derivative evaluations build the
fifth-order step, which is the answer. A seventh, taken at the far end of it,
builds an embedded fourth-order step, and the distance between the two is the
error estimate. Dormand–Prince is first-same-as-last, so that seventh
evaluation is exactly the one the following step opens with.

The estimate is a max-norm over the position and wavevector components,
divided by the size of the result so the tolerance means something relative.
Under tolerance the step is kept and the next is scaled by
`0.8·(tol/err)^0.2`, held between four fifths and five times. Over tolerance
the step is discarded and retried shorter, down to a fifth.

None of that knows anything about black holes. But a ray grazing the photon
sphere turns hard, its error estimate climbs, and the controller keeps
shortening the step until it can follow the curve. The same ray crossing empty
space takes strides. Nobody told it to spend its time near the hole; that falls
out of the error estimate on its own.

## Where the pixels get spent

The same trick, one dimension up. Rays are the expensive thing and most of a
frame is flat, so the renderer tries not to cast where the answer is already
determined by its neighbours.

Each 64×64 tile splits recursively into quadrants, eight levels deep. Before a
quad splits it gets probed at four corners, four quarter-points, and every
other pixel along its edges. If those all agree on colour to within `1e-3` and
agree on what became of the ray, the quad is filled flat and its interior is
never traced. At depth eight it stops arguing and traces every pixel.

Tiles come off an atomic counter, one worker per hardware thread. The tiles
full of empty sky finish almost instantly and their threads move on to the
ones near the disc edge, which is where the frame is actually difficult.

## What is actually in the picture

The black shape is not the event horizon. It is the shadow, and it is wider:
light aimed within b = 2.598 r<sub>s</sub> of the centre spirals in and never
reaches the camera, so the silhouette is set by that critical impact
parameter. The horizon itself sits at r<sub>s</sub>, well inside it.

Hugging that silhouette is a bright hairline a pixel or two wide, and it is
the best thing in the render. That is the photon ring: disc light that came in
close enough to loop the hole once or more before escaping toward the camera.
The photon sphere it grazes sits at r = 1.5 r<sub>s</sub>, but its image lands
out on the shadow's edge at 2.598 r<sub>s</sub>, because that is the impact
parameter such a ray leaves with. The two radii in the apparatus below are one
feature measured in two places.

The disc lies flat in the equatorial plane, running from r<sub>s</sub> + 2 out
over a width of 4. It appears three times: directly, as the arc lensed up
across the top, and as the band bent under the bottom. Light that wraps
further than that lands in the photon ring, where the higher-order images
stack too tightly to tell apart.

The stripes are real. `createAccretionDisk` builds the disc from concentric
rings, with a fill fraction for the gaps and a colour ramp running red at the
inner edge out to yellow. Ray-disc intersection is skipped entirely unless the
step crossed the equatorial plane, which is a cheap test that rejects almost
every step.

The sky is one flat colour, `#16161d`. There is no star field behind the hole,
so everything lit in the frame is the disc, seen either directly or after
being wrapped around.

## Reduced far enough to read

The renderer integrates the full geodesic equation. Restricted to the orbital
plane and rewritten in u = 1/r, those four coupled equations collapse into one:

<figure class="bh-eq">
<math display="block"><mfrac><mrow><msup><mi>d</mi><mn>2</mn></msup><mi>u</mi></mrow><mrow><mi>d</mi><msup><mi>φ</mi><mn>2</mn></msup></mrow></mfrac><mo>=</mo><mrow><mo>−</mo><mi>u</mi></mrow><mo>+</mo><mfrac><mn>3</mn><mn>2</mn></mfrac><msub><mi>r</mi><mi>s</mi></msub><msup><mi>u</mi><mn>2</mn></msup></math>
<figcaption>Eq. 1</figcaption>
</figure>

Delete the u<sup>2</sup> term and what is left describes a straight line in polar
coordinates. It is negligible while the ray is far out and takes over the
moment it is not, which accounts for every bend in the render above.

The diagram at the top of the page integrates Eq. 1 directly, in TypeScript,
for a fan of rays. Light aimed inside the critical parameter spirals in and
does not return. Anything outside it leaves, however sharply it was bent on
the way.
