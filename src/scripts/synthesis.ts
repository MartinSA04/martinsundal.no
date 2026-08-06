/**
 * The Game of Life plate: a two-glider synthesis of a block, played forward
 * when its specimen is hovered and rewound on the way out.
 *
 * This does not simulate anything. Every generation is computed at build time
 * in ProjectFigure.astro by the same lib/life.ts the hero runs on and baked
 * into the figure as cell indices; all that happens here is choosing which one
 * is on screen and drawing it as a single path.
 *
 * Reversing is a rewind of the recorded frames rather than a reverse
 * simulation, because Life does not run backwards — several boards can lead to
 * the same next board, so there is no generation before a still life to find.
 * Leaving mid-flight therefore turns the playhead around wherever it had got
 * to instead of snapping it to either end.
 */

/** Milliseconds a single generation is held. */
const MS_PER_GEN = 46;

function initSynthesis(): void {
  const svg = document.querySelector<SVGSVGElement>("[data-synth]");
  const cells = svg?.querySelector<SVGPathElement>("[data-synth-cells]");
  if (!svg || !cells) return;

  const frames = (svg.dataset.frames ?? "")
    .split(";")
    .map((f) => (f ? f.split(",").map(Number) : []));
  if (frames.length < 2) return;

  const width = Number(svg.dataset.w);
  const pitch = Number(svg.dataset.pitch);
  const size = Number(svg.dataset.cell);
  if (!width || !pitch || !size) return;

  const inset = (pitch - size) / 2;
  const readout = svg.querySelector<SVGTextElement>("[data-synth-gen]");
  // The whole specimen is the target, so the figure answers to the same hover
  // as the heading and the index numeral beside it.
  const host = svg.closest<HTMLElement>(".spec") ?? svg;
  const last = frames.length - 1;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");

  const paint = (gen: number) => {
    const frame = frames[gen];
    if (!frame) return;
    let d = "";
    for (const n of frame) {
      const x = (n % width) * pitch + inset;
      const y = Math.floor(n / width) * pitch + inset;
      d += `M${x} ${y}h${size}v${size}h-${size}z`;
    }
    cells.setAttribute("d", d);
    if (readout) readout.textContent = `Gen ${String(gen).padStart(2, "0")}`;
  };

  let current = 0;
  let target = 0;
  let raf = 0;
  let previous = 0;

  const tick = (now: number) => {
    const dt = previous ? now - previous : MS_PER_GEN;
    previous = now;

    const distance = target - current;
    const stride = (dt / MS_PER_GEN) * Math.sign(distance);
    if (Math.abs(stride) >= Math.abs(distance)) {
      current = target;
      raf = 0;
      previous = 0;
      paint(current);
      return;
    }
    current += stride;
    paint(Math.round(current));
    raf = requestAnimationFrame(tick);
  };

  const play = (to: number) => {
    target = to;
    if (still.matches) {
      // No stepping: land on the generation asked for and stay there.
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      current = to;
      paint(to);
      return;
    }
    if (current === target) return;
    if (!raf) {
      previous = 0;
      raf = requestAnimationFrame(tick);
    }
  };

  host.addEventListener("pointerenter", () => play(last));
  host.addEventListener("pointerleave", () => play(0));
  host.addEventListener("focusin", () => play(last));
  host.addEventListener("focusout", () => play(0));
}

initSynthesis();
