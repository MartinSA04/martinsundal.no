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
  "It won Best Project in Procedural and Object-Oriented Programming, the C++ course it was built for. The sprite in the margin is drawn from the game itself.",
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

/* --- the sprite ----------------------------------------------------------- */

const sprite = document.querySelector<HTMLElement>("[data-cb-sprite]");

if (sprite && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const FRAME_PX = 48; // 32px source scaled 1.5x
  const FRAMES = 4;
  const ROW = { down: 0, up: 1, left: 2, right: 3 };

  let frame = 0;
  let lastY = window.scrollY;
  let moving = false;
  let idleTimer = 0;
  let row: number = ROW.down;

  const paint = () => {
    sprite.style.backgroundPosition = `-${frame * FRAME_PX}px -${row * FRAME_PX}px`;
  };

  window.setInterval(() => {
    if (!moving) return;
    frame = (frame + 1) % FRAMES;
    paint();
  }, 125);

  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      if (Math.abs(delta) < 2) return;

      // Walking down the page reads as walking downward.
      row = delta > 0 ? ROW.down : ROW.up;
      moving = true;
      sprite.toggleAttribute("data-visible", y > 200);

      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        moving = false;
        frame = 0;
        paint();
      }, 160);
    },
    { passive: true },
  );

  paint();
}
