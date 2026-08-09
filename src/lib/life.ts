/**
 * Conway's Game of Life, ported from the original script.js.
 *
 * The simulation is kept pure and DOM-free so the hero's convergence can be
 * asserted in a unit test — requestAnimationFrame does not advance under
 * headless virtual time, so a screenshot can never prove it. The canvas and
 * rAF concerns live in createLifeScene at the bottom.
 *
 * Rules are standard B3/S23 on a bounded (non-wrapping) board.
 */

export interface Plan {
  width: number;
  height: number;
  cells: Uint8Array;
}

export function parsePlan(text: string): Plan {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let width = 0;
  let height = 0;
  const coords: [number, number][] = [];

  for (const line of lines) {
    if (line.startsWith("#")) {
      const m = line.match(/board_size\s*=\s*(\d+)\s*,\s*(\d+)/i);
      if (m) {
        width = Number.parseInt(m[1]!, 10);
        height = Number.parseInt(m[2]!, 10);
      }
      continue;
    }
    const m = line.match(/^(\d+)\s*,\s*(\d+)$/);
    if (!m) continue;
    coords.push([Number.parseInt(m[1]!, 10), Number.parseInt(m[2]!, 10)]);
  }

  if (!width || !height) {
    let maxX = 0;
    let maxY = 0;
    for (const [x, y] of coords) {
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    width = maxX + 1;
    height = maxY + 1;
  }

  const cells = new Uint8Array(width * height);
  for (const [x, y] of coords) {
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    cells[y * width + x] = 1;
  }

  return { width, height, cells };
}

/** One generation. Returns a new board; does not mutate the input. */
export function step(
  cells: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const next = new Uint8Array(cells.length);

  for (let y = 0; y < height; y++) {
    const row = y * width;
    const prevRow = y > 0 ? row - width : -1;
    const nextRow = y < height - 1 ? row + width : -1;

    for (let x = 0; x < width; x++) {
      const i = row + x;
      let n = 0;

      if (x > 0) {
        n += cells[i - 1]!;
        if (prevRow >= 0) n += cells[prevRow + x - 1]!;
        if (nextRow >= 0) n += cells[nextRow + x - 1]!;
      }
      if (x < width - 1) {
        n += cells[i + 1]!;
        if (prevRow >= 0) n += cells[prevRow + x + 1]!;
        if (nextRow >= 0) n += cells[nextRow + x + 1]!;
      }
      if (prevRow >= 0) n += cells[prevRow + x]!;
      if (nextRow >= 0) n += cells[nextRow + x]!;

      next[i] = n === 3 || (cells[i] === 1 && n === 2) ? 1 : 0;
    }
  }

  return next;
}

export function countLive(cells: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < cells.length; i++) n += cells[i]!;
  return n;
}

function sameBoard(a: Uint8Array, b: Uint8Array): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * True when one step of the board reproduces it exactly. The hero uses this
 * to stop stepping a 68,352-cell board forever once it has settled, and to
 * decide when its readout says STILL LIFE.
 */
export function isStillLife(
  cells: Uint8Array,
  width: number,
  height: number,
): boolean {
  return sameBoard(step(cells, width, height), cells);
}

/* --- the animated scene --------------------------------------------------- */

export interface LifeSceneOptions {
  canvas: HTMLCanvasElement;
  planSrc: string;
  /** Generations per second. */
  speed?: number;
  /** Restart from the seed after this many generations. */
  loopAfter?: number | null;
  restartOnExtinction?: boolean;
  pauseWhenOffscreen?: boolean;
  /** CSS custom property the cell colour is read from. */
  colorVar?: string;
  /**
   * Element the colour property is resolved against. Defaults to the document
   * root, which is right for a page that follows the site theme. A project
   * world pins its own palette to <body>, so its board must read from inside
   * that world or it gets the root theme's cell colour on the world's paper —
   * white on white in dark mode.
   */
  colorEl?: HTMLElement;
  /**
   * Generation to show when the visitor has asked for reduced motion, instead
   * of running the board. Normally the generation it settles at.
   */
  restGeneration?: number;
  /**
   * Called after every generation, and once more when the board settles.
   * `settled` is true from the first generation that reproduces itself.
   * `population` is the live cell count of the board currently on screen —
   * the hero plots it, so it must describe the drawn board rather than the
   * one about to be drawn.
   */
  onGeneration?: (
    generation: number,
    settled: boolean,
    population: number,
  ) => void;
}

export interface LifeScene {
  start(): Promise<void>;
  /** Resume a stopped scene. Does nothing under reduced motion. */
  play(): void;
  stop(): void;
  /** Render generation n, synchronously. Used by the scrubber. */
  renderGeneration(n: number): void;
  readonly generation: number;
  /** Live cells on the board currently painted. */
  readonly population: number;
}

function readColor(varName: string, el: HTMLElement): [number, number, number] {
  const raw = getComputedStyle(el).getPropertyValue(varName).trim();
  if (raw.startsWith("#")) {
    const hex = raw.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    return [
      Number.parseInt(full.slice(0, 2), 16),
      Number.parseInt(full.slice(2, 4), 16),
      Number.parseInt(full.slice(4, 6), 16),
    ];
  }
  const m = raw.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (m) {
    return [
      Number.parseInt(m[1]!, 10),
      Number.parseInt(m[2]!, 10),
      Number.parseInt(m[3]!, 10),
    ];
  }
  return [255, 255, 255];
}

export function createLifeScene(opts: LifeSceneOptions): LifeScene | null {
  const {
    canvas,
    planSrc,
    speed = 10,
    loopAfter = null,
    restartOnExtinction = false,
    pauseWhenOffscreen = false,
    colorVar = "--life-cell",
    colorEl = document.documentElement,
    restGeneration,
    onGeneration,
  } = opts;

  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return null;
  ctx.imageSmoothingEnabled = false;

  let plan: Plan | null = null;
  let board: Uint8Array | null = null;
  let image: ImageData | null = null;
  let generation = 0;
  let population = 0;
  let settled = false;
  let running = false;
  let wanted = false;
  let visible = !pauseWhenOffscreen;
  let raf = 0;
  let last = 0;
  let acc = 0;

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  function draw() {
    if (!plan || !board || !image) return;
    const data = image.data;
    data.fill(0);
    const [r, g, b] = readColor(colorVar, colorEl);
    // Counted here rather than with countLive(): this loop already visits
    // every one of the 68,352 cells, so the population is free, and it is
    // guaranteed to describe exactly the board being painted.
    let live = 0;
    for (let i = 0; i < board.length; i++) {
      if (board[i] !== 1) continue;
      live++;
      const o = i * 4;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
      data[o + 3] = 255;
    }
    population = live;
    ctx!.clearRect(0, 0, plan.width, plan.height);
    ctx!.putImageData(image, 0, 0);
  }

  /**
   * The rule has no inverse, so a board can only be reached by stepping to it.
   * Going forwards, the board already on screen is a legal starting point and
   * the common one — dragging the scrubber rightwards, or playing. Only a jump
   * backwards has to replay from the seed.
   *
   * Restarting from the seed every time is what makes a naive scrubber quietly
   * quadratic: on the 656×256 board each step costs about 0.9ms, so replaying
   * to generation 400 is a 350ms stall, once per frame if it is driving
   * playback.
   */
  function renderGeneration(n: number) {
    if (!plan) return;
    let cells = plan.cells;
    let from = 0;
    if (board && n >= generation) {
      cells = board;
      from = generation;
    }
    for (let i = from; i < n; i++) cells = step(cells, plan.width, plan.height);
    board = cells;
    generation = n;
    // Rewinding un-settles the board. Without this, a scrubber that goes back
    // to the seed and plays again reports a still life from generation one.
    settled = false;
    draw();
  }

  function frame(now: number) {
    if (!running || !plan || !board) return;
    if (!last) last = now;
    acc += now - last;
    last = now;

    const interval = 1000 / speed;
    let guard = 0;
    while (acc >= interval && guard < 8) {
      const next = step(board, plan.width, plan.height);

      // A still life will never change again, so keep painting it but stop
      // computing it. Only when nothing else wants the loop running.
      //
      // The generation is NOT advanced here. `next` reproduces `board`, so the
      // board already on screen is the first one that is a still life, and
      // that is the number the readout must show — 276, not 277.
      if (!loopAfter && !restartOnExtinction && sameBoard(next, board)) {
        settled = true;
        onGeneration?.(generation, true, population);
        stop();
        return;
      }

      board = next;
      generation++;
      acc -= interval;
      guard++;

      if (loopAfter && generation >= loopAfter) {
        board = plan.cells;
        generation = 0;
      } else if (restartOnExtinction && countLive(board) === 0) {
        board = plan.cells;
        generation = 0;
      }
    }

    draw();
    onGeneration?.(generation, settled, population);
    raf = requestAnimationFrame(frame);
  }

  /**
   * `wanted` is the caller's intent, `running` is whether a frame is queued.
   * They are separate because scrolling the board out of view suspends it: a
   * board that was paused on purpose has to stay paused when it scrolls back,
   * which a single flag cannot express.
   */
  function resume() {
    if (running || !wanted || !visible) return;
    running = true;
    last = 0;
    acc = 0;
    raf = requestAnimationFrame(frame);
  }

  function suspend() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function play() {
    wanted = true;
    resume();
  }

  function stop() {
    wanted = false;
    suspend();
  }

  async function start() {
    const res = await fetch(planSrc);
    plan = parsePlan(await res.text());
    canvas.width = plan.width;
    canvas.height = plan.height;
    image = ctx!.createImageData(plan.width, plan.height);
    board = plan.cells;

    // Under reduced motion, show the settled word rather than an empty board.
    // The observers below are still wired up and the scene stays playable —
    // reduced motion suppresses animation that starts on its own, not a run
    // the visitor asks for by pressing a button.
    if (reducedMotion) {
      renderGeneration(restGeneration ?? loopAfter ?? 0);
      settled = true;
      onGeneration?.(generation, true, population);
    } else {
      draw();
    }

    if (pauseWhenOffscreen) {
      new IntersectionObserver((entries) => {
        visible = entries[0]?.isIntersecting ?? false;
        if (visible) resume();
        else suspend();
      }).observe(canvas);
    }

    // Repaint on theme change so the cells follow --life-cell.
    new MutationObserver(() => draw()).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    if (!reducedMotion) play();
  }

  return {
    start,
    play,
    stop,
    renderGeneration,
    get generation() {
      return generation;
    },
    get population() {
      return population;
    },
  };
}
