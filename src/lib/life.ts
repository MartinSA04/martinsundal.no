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
}

export interface LifeScene {
  start(): Promise<void>;
  stop(): void;
  /** Render generation n from the seed, synchronously. Used by the scrubber. */
  renderGeneration(n: number): void;
  readonly generation: number;
}

function readColor(varName: string): [number, number, number] {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
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
  } = opts;

  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return null;
  ctx.imageSmoothingEnabled = false;

  let plan: Plan | null = null;
  let board: Uint8Array | null = null;
  let image: ImageData | null = null;
  let generation = 0;
  let running = false;
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
    const [r, g, b] = readColor(colorVar);
    for (let i = 0; i < board.length; i++) {
      if (board[i] !== 1) continue;
      const o = i * 4;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
      data[o + 3] = 255;
    }
    ctx!.clearRect(0, 0, plan.width, plan.height);
    ctx!.putImageData(image, 0, 0);
  }

  function renderGeneration(n: number) {
    if (!plan) return;
    let cells = plan.cells;
    for (let i = 0; i < n; i++) cells = step(cells, plan.width, plan.height);
    board = cells;
    generation = n;
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
      board = step(board, plan.width, plan.height);
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
    raf = requestAnimationFrame(frame);
  }

  function play() {
    if (running || !visible || reducedMotion) return;
    running = true;
    last = 0;
    acc = 0;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  async function start() {
    const res = await fetch(planSrc);
    plan = parsePlan(await res.text());
    canvas.width = plan.width;
    canvas.height = plan.height;
    image = ctx!.createImageData(plan.width, plan.height);
    board = plan.cells;

    // Under reduced motion, show the settled word rather than an empty board.
    if (reducedMotion) {
      renderGeneration(loopAfter ?? 277);
      return;
    }

    draw();

    if (pauseWhenOffscreen) {
      new IntersectionObserver((entries) => {
        visible = entries[0]?.isIntersecting ?? false;
        if (visible) play();
        else stop();
      }).observe(canvas);
    }

    // Repaint on theme change so the cells follow --life-cell.
    new MutationObserver(() => draw()).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    play();
  }

  return {
    start,
    stop,
    renderGeneration,
    get generation() {
      return generation;
    },
  };
}
