/**
 * Draws the geodesic diagram: a fan of light rays bending past the hole.
 *
 * Deliberately not a renderer — the C++ project is the renderer, and its
 * output is the image above this. This shows the method.
 *
 * Cost: one pass over ~24 rays at draw time, on a 2D canvas. A few
 * milliseconds, no GPU, nothing running afterwards.
 */
import { rayFan, criticalImpactParameter, type Ray } from "../lib/lensing.ts";

const canvas = document.querySelector<HTMLCanvasElement>("[data-bh-diagram]");

if (canvas) {
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const RS = 1;
    const B_CRIT = criticalImpactParameter(RS);
    const VIEW_X = 16; // half-width of the frame, in units of rs
    const VIEW_Y = 8; // the canvas is 2:1
    // One-sided fan; see rayFan's note on why the mirror is left off.
    const RAYS = 16;
    const MAX_B = 5.5;

    const read = (name: string, fallback: string) =>
      getComputedStyle(canvas).getPropertyValue(name).trim() || fallback;

    function draw() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(canvas!.clientWidth * dpr);
      const h = Math.floor(w / 2);
      if (!w) return;
      canvas!.width = w;
      canvas!.height = h;

      const ink = read("--ink", "#e8e8f0");
      const hair = read("--hair", "#2a2a3a");
      const sig = read("--sig", "#ff8c42");
      const muted = read("--muted", "#8a8a95");

      const scale = w / (VIEW_X * 2);
      const cx = w / 2;
      // The axis sits above centre: incoming rays occupy a narrow band above
      // it, and everything deflects downward, so the lower half needs the room.
      const cy = h * 0.38;
      // Mirrored in x: the integration runs from +x to -x, but a diagram reads
      // left to right, so light should arrive from the left.
      const px = (x: number) => cx - x * scale;
      const py = (y: number) => cy - y * scale;

      ctx!.clearRect(0, 0, w, h);
      ctx!.lineWidth = Math.max(1, dpr * 0.9);
      ctx!.lineJoin = "round";
      ctx!.lineCap = "round";

      const rays: Ray[] = rayFan(RAYS, MAX_B, {
        rs: RS,
        dphi: 0.01,
        maxRadius: VIEW_X * 1.05,
        mirror: false,
      });

      for (const ray of rays) {
        if (ray.points.length < 2) continue;
        ctx!.strokeStyle = ray.captured ? hair : sig;
        ctx!.globalAlpha = ray.captured ? 0.9 : 0.75;
        ctx!.beginPath();

        let started = false;
        for (const p of ray.points) {
          // Clip to the visible rectangle, and stop once the ray has left it.
          // Sharply bent rays exit through the bottom of the frame and, if
          // followed further, curve back in and cross everything else — which
          // is true of the trajectory but unreadable as a diagram.
          const inside = Math.abs(p[0]) <= VIEW_X && Math.abs(p[1]) <= VIEW_Y;
          if (!inside) {
            if (started) break;
            continue;
          }
          if (!started) {
            ctx!.moveTo(px(p[0]), py(p[1]));
            started = true;
          } else {
            ctx!.lineTo(px(p[0]), py(p[1]));
          }
        }
        ctx!.stroke();
      }
      ctx!.globalAlpha = 1;

      // Photon sphere, where light can orbit.
      ctx!.strokeStyle = muted;
      ctx!.globalAlpha = 0.7;
      ctx!.setLineDash([4 * dpr, 4 * dpr]);
      ctx!.beginPath();
      ctx!.arc(cx, cy, 1.5 * RS * scale, 0, Math.PI * 2);
      ctx!.stroke();
      ctx!.setLineDash([]);
      ctx!.globalAlpha = 1;

      // The horizon. Filled, because nothing comes back out of it.
      ctx!.fillStyle = "#000";
      ctx!.beginPath();
      ctx!.arc(cx, cy, RS * scale, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.strokeStyle = ink;
      ctx!.stroke();

      // Labels, kept clear of the busy middle band.
      const font = `${10 * dpr}px "IBM Plex Mono", ui-monospace, monospace`;
      ctx!.font = font;
      ctx!.fillStyle = muted;
      ctx!.textBaseline = "middle";

      const labelX = cx + 2.4 * RS * scale;
      ctx!.fillText(
        "r = 1.5 rs · photon sphere",
        labelX,
        cy - 1.9 * RS * scale,
      );

      ctx!.textAlign = "left";
      ctx!.fillText(
        `capture below b = ${B_CRIT.toFixed(2)} rs`,
        10 * dpr,
        h - 12 * dpr,
      );

      // Light arrives from the left in this mirrored view. The arrowhead is
      // drawn rather than typed: this is a diagram made of lines, so the mark
      // belongs to the diagram and not to whichever font resolves.
      ctx!.fillStyle = sig;
      ctx!.fillText("light in", 10 * dpr, 14 * dpr);
      const ax = 10 * dpr + ctx!.measureText("light in").width + 6 * dpr;
      const ay = 14 * dpr;
      ctx!.strokeStyle = sig;
      ctx!.lineWidth = dpr;
      ctx!.beginPath();
      ctx!.moveTo(ax, ay);
      ctx!.lineTo(ax + 9 * dpr, ay);
      ctx!.moveTo(ax + 5 * dpr, ay - 4 * dpr);
      ctx!.lineTo(ax + 9 * dpr, ay);
      ctx!.lineTo(ax + 5 * dpr, ay + 4 * dpr);
      ctx!.stroke();
    }

    draw();

    // Redraw on resize and on theme change; nothing runs in between.
    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(draw, 150);
    });
    new MutationObserver(draw).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  }
}
