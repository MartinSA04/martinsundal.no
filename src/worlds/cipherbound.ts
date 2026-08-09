/**
 * The dialogue box and the sprite that walks the left margin.
 *
 * The dialogue is a real, if tiny, game system: createDialogue holds the state
 * and this file only draws it. Everything it says is also in the page's prose,
 * so nothing is hidden behind the interaction.
 */
import { createDialogue } from "../lib/dialogue.ts";

const SCRIPT = [
  "Every tile carries its own walkability, so the world is data. A new area is a new file, not new code.",
  "Battles are a state machine over turn phases. Moves, types and damage resolution never touch how any of it is drawn.",
  "Conversations can branch, and they can change world state. That is what separates an NPC from a signpost.",
  "Everything that matters can be saved and loaded, which quietly constrains every other system.",
  "It won Best Project in Procedural and Object-Oriented Programming, the C++ course it was built for. The sprite wandering the page is drawn from the game itself.",
];

const box = document.querySelector<HTMLElement>("[data-cb-dialogue]");

if (box) {
  const textEl = box.querySelector<HTMLElement>("[data-cb-text]")!;
  const nextEl = box.querySelector<HTMLButtonElement>("[data-cb-next]")!;
  const pipsEl = box.querySelector<HTMLElement>("[data-cb-pips]")!;
  const dialogue = createDialogue(SCRIPT);

  const pips = SCRIPT.map(() => {
    const pip = document.createElement("span");
    pip.className = "cb-pip";
    pipsEl.appendChild(pip);
    return pip;
  });

  function draw() {
    textEl.textContent = dialogue.current();
    pips.forEach((pip, i) =>
      pip.toggleAttribute("data-on", i <= dialogue.index()),
    );
    nextEl.hidden = dialogue.done();
    nextEl.setAttribute(
      "aria-label",
      `Next line, ${dialogue.index() + 2} of ${dialogue.total()}`,
    );
  }

  nextEl.addEventListener("click", () => {
    dialogue.advance();
    draw();
  });

  draw();
}

/* --- the sprite -----------------------------------------------------------
 *
 * It walks the page on its own, the way an NPC walks a town: pick a direction,
 * hold it for a while, stop and look around, pick another.
 *
 * The previous version was driven by scroll — it only animated while the wheel
 * was turning and otherwise sat at a fixed viewport position. That reads as a
 * decal being dragged down the page rather than as something walking, because
 * nothing about it was ever going anywhere.
 *
 * It is positioned in the page, not the viewport, and painted under the text
 * boxes, so it passes behind them and comes out the other side.
 * --------------------------------------------------------------------------- */

const sprite = document.querySelector<HTMLElement>("[data-cb-sprite]");
const field = sprite?.parentElement;

if (
  sprite &&
  field &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  const FRAME_PX = 48; // 32px source scaled 1.5x
  const FRAMES = 4;
  const STEP_MS = 130; // one walk frame
  const SPEED = 44; // px per second

  // Row order is the sheet's, not a preference: down, up, left, right.
  const HEADINGS = [
    { dx: 0, dy: 1, row: 0 },
    { dx: 0, dy: -1, row: 1 },
    { dx: -1, dy: 0, row: 2 },
    { dx: 1, dy: 0, row: 3 },
  ];

  let x = 0;
  let y = 0;
  let heading = HEADINGS[0]!;
  let walking = false;
  let untilNext = 0;
  let frame = 0;
  let frameClock = 0;

  const limits = () => ({
    maxX: Math.max(0, field.clientWidth - FRAME_PX),
    maxY: Math.max(0, field.clientHeight - FRAME_PX),
  });

  /** Decide what to do next: walk somewhere, or stand still for a moment. */
  function choose() {
    if (walking && Math.random() < 0.45) {
      walking = false;
      untilNext = 400 + Math.random() * 1400;
      frame = 0;
      return;
    }

    const { maxX, maxY } = limits();
    // Headings that would walk into an edge are dropped rather than clamped,
    // so it turns before it arrives instead of scuffing along the boundary.
    const room = HEADINGS.filter(
      (h) =>
        x + h.dx * FRAME_PX >= 0 &&
        x + h.dx * FRAME_PX <= maxX &&
        y + h.dy * FRAME_PX >= 0 &&
        y + h.dy * FRAME_PX <= maxY,
    );
    const pick = room.length ? room : HEADINGS;
    heading = pick[Math.floor(Math.random() * pick.length)]!;
    walking = true;
    untilNext = 700 + Math.random() * 2000;
  }

  function paint() {
    sprite!.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    sprite!.style.backgroundPosition = `-${frame * FRAME_PX}px -${heading.row * FRAME_PX}px`;
  }

  // The stylesheet hides the sprite below this width, where the reading column
  // fills the page and it would spend its whole life behind a text box. No
  // point running a frame loop for something nobody can see.
  const wide = window.matchMedia("(min-width: 72rem)");
  let running = false;

  let last = 0;
  function tick(now: number) {
    if (!wide.matches) {
      running = false;
      return;
    }
    const dt = last ? Math.min(now - last, 100) : 0;
    last = now;

    untilNext -= dt;
    if (untilNext <= 0) choose();

    if (walking) {
      const { maxX, maxY } = limits();
      x = Math.min(maxX, Math.max(0, x + heading.dx * SPEED * (dt / 1000)));
      y = Math.min(maxY, Math.max(0, y + heading.dy * SPEED * (dt / 1000)));

      frameClock += dt;
      if (frameClock >= STEP_MS) {
        frameClock -= STEP_MS;
        frame = (frame + 1) % FRAMES;
      }
    }

    paint();
    requestAnimationFrame(tick);
  }

  function start() {
    if (running || !wide.matches) return;
    running = true;
    last = 0;
    requestAnimationFrame(tick);
  }

  const { maxX, maxY } = limits();
  x = maxX * 0.08;
  y = maxY * 0.35;
  sprite.toggleAttribute("data-visible", true);
  choose();
  wide.addEventListener("change", start);
  start();
}
