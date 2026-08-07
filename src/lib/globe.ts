/**
 * Fig. 06's globe, as numbers.
 *
 * An orthographic projection of the Earth — the sphere seen from infinitely far
 * off, which is the same construction Fig. 05b draws the Bloch sphere with, and
 * the reason the two read as a pair. A graticule solid where it passes in front
 * and broken where it runs behind, a polar axis, and one marked point:
 *
 *     cos c = sin p0 sin p + cos p0 cos p cos(L - L0)      <- near side if >= 0
 *     x     = R cos p sin(L - L0)
 *     y     = R (cos p0 sin p - sin p0 cos p cos(L - L0))
 *
 * for a point at latitude p, longitude L, viewed from over (p0, L0).
 *
 * --- what turning costs ----------------------------------------------------
 *
 * Orthographic is not a rotation in the plane, so a turning globe cannot be
 * spun with a transform: every frame is a reprojection. What makes it cheap is
 * that almost none of the drawing actually moves.
 *
 * A circle of latitude is symmetric about the polar axis. Turning the globe
 * slides points along a parallel without changing the arc that gets drawn, so
 * every parallel is identical for every L0 — as is the limb, and as are both
 * poles, whose x is always the centre. Only the meridians move. That is 24
 * lines instead of 35, and it is why `parallelRuns` and `poles` take no
 * longitude argument at all: there is nothing for them to depend on.
 *
 * A meridian's visibility along its span is A sin p + B cos p, which is one
 * sinusoid in p and therefore has at most two zeros between the poles. So a
 * meridian never breaks into more than MERIDIAN_SLOTS runs, which is what lets
 * the component render a fixed number of paths and the script update them by
 * attribute — no DOM is built after the first frame.
 *
 * No DOM in here. Contact.astro renders L0 = START_LON from these functions on
 * the server, and src/scripts/globe.ts drives the rest from the same source, so
 * the figure is a correct plate with the script missing or blocked and correct
 * but still under prefers-reduced-motion.
 */

const RAD = Math.PI / 180;
const r1 = (v: number) => Math.round(v * 10) / 10;

/** Trondheim, and the datum Fig. 00 already prints as "Norway · 63.4°N". */
export const ORIGIN = { lat: 63.4305, lon: 10.3951 };

/** The drawing, in viewBox units. */
export const PANEL = 400;
export const VIEW = { lat0: 22, R: 155, cx: PANEL / 2, cy: PANEL / 2 };

/**
 * Seconds to a revolution, and the longitude it opens at.
 *
 * One turn is one day at 120 s — 3 degrees a second, 720x real time. Slow
 * enough to read as ambient rather than as a spinning globe, and stated on the
 * figure so the rate is a claim the drawing makes rather than a number picked
 * to look right.
 */
export const TURN = 120;
export const START_LON = 8;

/** Graticule spacing, and how finely each line is walked. */
export const MERIDIANS = 24;
export const MERIDIAN_STEP = 360 / MERIDIANS;
export const PARALLEL_STEP = 15;
const MERIDIAN_SAMPLE = 2.5;
const PARALLEL_SAMPLE = 2;

/** The most runs one meridian can break into. See the note above. */
export const MERIDIAN_SLOTS = 3;

/** Where the origin's callout sits, and where its leader leaves from. */
export const CALLOUT = { x: 56, y: 44 };

export interface Projected {
  x: number;
  y: number;
  /** True on the near side of the limb. */
  front: boolean;
}

export interface Run {
  front: boolean;
  /** An SVG path, already rounded to a tenth of a unit. */
  d: string;
}

export function project(lat: number, lon: number, lon0: number): Projected {
  const p = lat * RAD;
  const dl = (lon - lon0) * RAD;
  const p0 = VIEW.lat0 * RAD;
  const cosc =
    Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(dl);
  return {
    x: VIEW.cx + VIEW.R * Math.cos(p) * Math.sin(dl),
    y:
      VIEW.cy -
      VIEW.R *
        (Math.cos(p0) * Math.sin(p) -
          Math.sin(p0) * Math.cos(p) * Math.cos(dl)),
    front: cosc >= 0,
  };
}

/**
 * Walk a line and break it wherever it crosses the limb.
 *
 * The boundary sample joins both runs, so the near half and the far half meet
 * on the limb instead of leaving a gap in the line there.
 */
function walk(
  sample: readonly (readonly [number, number])[],
  lon0: number,
): Run[] {
  const out: Run[] = [];
  let pts: string[] = [];
  let front: boolean | null = null;

  for (const [lat, lon] of sample) {
    const p = project(lat, lon, lon0);
    const at = `${r1(p.x)} ${r1(p.y)}`;
    if (front === null) {
      front = p.front;
      pts = [`M${at}`];
      continue;
    }
    if (p.front !== front) {
      pts.push(`L${at}`);
      out.push({ front, d: pts.join("") });
      pts = [`M${at}`];
      front = p.front;
    } else pts.push(`L${at}`);
  }
  if (front !== null && pts.length > 1) out.push({ front, d: pts.join("") });
  return out;
}

/** One meridian, by index. These are the only lines that move. */
export function meridianRuns(index: number, lon0: number): Run[] {
  const lon = index * MERIDIAN_STEP;
  const sample: [number, number][] = [];
  for (let lat = -90; lat <= 90; lat += MERIDIAN_SAMPLE)
    sample.push([lat, lon]);
  return walk(sample, lon0);
}

/**
 * Every parallel. Independent of longitude, so this is called once at build
 * time and the result is never recomputed — see the note at the top.
 */
export function parallelRuns(): { lat: number; runs: Run[] }[] {
  const out: { lat: number; runs: Run[] }[] = [];
  for (let lat = -90 + PARALLEL_STEP; lat < 90; lat += PARALLEL_STEP) {
    const sample: [number, number][] = [];
    for (let lon = -180; lon <= 180; lon += PARALLEL_SAMPLE)
      sample.push([lat, lon]);
    out.push({ lat, runs: walk(sample, START_LON) });
  }
  return out;
}

/** Both poles. Their x is always the centre, so this takes no longitude. */
export function poles(): { north: Projected; south: Projected } {
  return { north: project(90, 0, 0), south: project(-90, 0, 0) };
}

export function originAt(lon0: number): Projected {
  return project(ORIGIN.lat, ORIGIN.lon, lon0);
}

/**
 * The leader from the callout to the origin, arrowheaded on the point.
 *
 * It stops short at both ends, per the convention the rest of the sheet
 * follows, and it tracks the origin the whole way round — including the part
 * of every turn the origin spends on the far side, where the marker goes to a
 * hollow ring rather than disappearing.
 */
export function leader(p: Projected): { line: string; head: string } {
  const sx = CALLOUT.x + 34;
  const sy = CALLOUT.y + 6;
  const dx = p.x - sx;
  const dy = p.y - sy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const w = 1.7;
  /* Stop clear of the crosshair rather than on the point itself. */
  const tx = p.x - ux * 13;
  const ty = p.y - uy * 13;
  return {
    line: `M${r1(sx + ux * 9)} ${r1(sy + uy * 9)}L${r1(tx - ux * 5)} ${r1(ty - uy * 5)}`,
    head:
      `M${r1(tx)} ${r1(ty)}` +
      `L${r1(tx - ux * 5.6 - uy * w)} ${r1(ty - uy * 5.6 + ux * w)}` +
      `L${r1(tx - ux * 5.6 + uy * w)} ${r1(ty - uy * 5.6 - ux * w)}z`,
  };
}

/** The origin's crosshair, drawn only while it is on the near side. */
export function crosshair(p: Projected): string {
  return `M${r1(p.x - 11)} ${r1(p.y)}h22M${r1(p.x)} ${r1(p.y - 11)}v22`;
}

/**
 * Longitude at a given elapsed time.
 *
 * Decreasing, because the Earth turns east: a fixed observer watches the
 * sub-observer longitude run west, which is the same reason the subsolar point
 * sweeps westward across the ground. Features therefore cross the disc left to
 * right, which is what east looks like with north up.
 */
export function longitudeAt(seconds: number): number {
  return START_LON - (seconds * 360) / TURN;
}
