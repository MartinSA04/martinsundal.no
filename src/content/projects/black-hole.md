---
index: 4
name: Interactive Black Hole Renderer
tagline: A C++ renderer that traces light around a Schwarzschild black hole instead of in straight lines.
summary: Gravitational lensing rendered by integrating null geodesics in curved spacetime, so the Einstein ring and photon sphere fall out of the physics rather than being drawn on.
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
  - label: Event horizon
    value: r = rs
  - label: Photon sphere
    value: r = 1.5 rs
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

## The idea

An ordinary renderer assumes light travels in straight lines. Close to a
black hole that assumption is simply wrong, and abandoning it is the entire
project.

Instead of casting a straight ray per pixel, the renderer integrates the path
light actually takes through curved spacetime, a null geodesic of the
Schwarzschild metric. Follow each ray until it either falls through the event
horizon, escapes to the sky, or hits the accretion disc, and shade the pixel
with whatever it found.

## What it produces

Everything recognisable about a black hole image appears without being drawn:
the Einstein ring, the disc bent up over the top of the hole and back under
the bottom, the photon sphere hairline at `r = 1.5 rs` where light can orbit.
None of it is drawn in as an effect. It is what the integration returns.

## The equation it all comes down to

In the Schwarzschild metric a photon's path obeys

```text
d²u/dφ² = -u + (3/2) rs u²      where u = 1/r
```

Drop the second term and you get a straight line. Keep it and you get every
bend in the image above.

The diagram under the render traces that equation for a fan of rays. Light
aimed within **b = 2.598 r<sub>s</sub>** spirals in and never comes back;
anything outside that escapes, however sharply it is bent.
