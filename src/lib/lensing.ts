/**
 * Real-time gravitational lensing around a Schwarzschild black hole.
 *
 * The GLSL lives here as exported strings rather than inline in the page, so
 * the physics can be asserted in a unit test without a GPU. The camera maths
 * is here for the same reason.
 *
 * Each pixel traces a null geodesic by integrating
 *
 *     d²u/dφ² = -u + (3/2) rs u²,     u = 1/r
 *
 * which is the standard orbit equation for light in the Schwarzschild metric.
 * The Newtonian term alone gives a straight line; the u² term is general
 * relativity, and it is what bends the disc up over the top of the hole.
 */

/** Weak-field deflection angle, 2rs/b. Used for the readouts on the page. */
export function deflection(impactParameter: number, rs: number): number {
  return (2 * rs) / impactParameter;
}

export function orbitCamera(
  azimuth: number,
  elevation: number,
  radius: number,
): { eye: [number, number, number] } {
  const cosE = Math.cos(elevation);
  return {
    eye: [
      radius * cosE * Math.sin(azimuth),
      radius * Math.sin(elevation),
      radius * cosE * Math.cos(azimuth),
    ],
  };
}

export const VERTEX_SHADER = `#version 300 es
in vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2  uRes;
uniform vec3  uEye;
uniform float uTime;
uniform vec3  uDisc;   // inner radius, outer radius, thickness
uniform vec3  uSig;    // accent colour, so the render matches the world

out vec4 outColor;

const float RS = 1.0;              // Schwarzschild radius, units of itself
const int   STEPS = 300;
const float PI = 3.14159265359;

// Cheap hash noise for the starfield and the disc's turbulence.
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float stars(vec3 dir) {
  vec2 uv = vec2(atan(dir.z, dir.x) / (2.0 * PI) + 0.5, acos(clamp(dir.y, -1.0, 1.0)) / PI);
  vec2 cell = floor(uv * 900.0);
  float h = hash(cell);
  float bright = smoothstep(0.9975, 1.0, h);
  float twinkle = 0.75 + 0.25 * sin(uTime * 1.4 + h * 40.0);
  return bright * twinkle * 1.6;
}

vec3 discColour(float r, float phi) {
  float t = clamp((r - uDisc.x) / max(uDisc.y - uDisc.x, 0.001), 0.0, 1.0);
  // Hotter and brighter towards the inner edge.
  vec3 hot = mix(vec3(1.0, 0.95, 0.85), uSig, 0.35);
  vec3 cool = uSig * 0.45;
  vec3 base = mix(hot, cool, t);
  float bands = 0.75 + 0.25 * sin(phi * 9.0 + r * 5.0 - uTime * 0.6);
  float falloff = 1.0 - t;
  return base * bands * (0.25 + 1.1 * falloff * falloff);
}

void main() {
  vec2 frag = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;

  // Camera basis looking at the origin.
  vec3 fwd = normalize(-uEye);
  vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, fwd);
  vec3 dir = normalize(frag.x * right + frag.y * up + 2.4 * fwd);

  // Work in the plane containing the camera and the ray: the orbit equation is
  // two-dimensional, so we only need coordinates inside that plane.
  vec3 normal = normalize(cross(uEye, dir));
  vec3 e1 = normalize(uEye);
  vec3 e2 = normalize(cross(normal, e1));

  float r = length(uEye);
  float u = 1.0 / r;
  // du/dphi from the initial direction.
  float du = -dot(dir, e1) / max(dot(dir, e2), 1e-4) * u;

  float phi = 0.0;
  float dphi = 0.016;

  vec3 colour = vec3(0.0);
  bool captured = false;
  bool hitDisc = false;

  float prevY = dot(e1 * (1.0 / max(u, 1e-6)), vec3(0.0, 1.0, 0.0));
  float prevR = r;

  for (int i = 0; i < STEPS; i++) {
    // Second-order integration of u'' = -u + 1.5 * RS * u * u.
    float ddu = -u + 1.5 * RS * u * u;
    du += ddu * dphi;
    u += du * dphi;
    phi += dphi;

    if (u <= 0.0) break;            // escaped to infinity
    float rr = 1.0 / u;
    if (rr <= RS * 1.001) { captured = true; break; }

    vec3 pos = (e1 * cos(phi) + e2 * sin(phi)) * rr;

    // Disc crossing: the ray passed through the equatorial plane. Interpolate
    // to the exact crossing rather than taking the sample after it, otherwise
    // the disc edge stair-steps at the integration step size.
    if (!hitDisc && prevY * pos.y < 0.0) {
      float t = prevY / (prevY - pos.y);
      float rHit = mix(prevR, rr, t);
      if (rHit > uDisc.x && rHit < uDisc.y) {
        float edge = smoothstep(0.0, 0.25, rHit - uDisc.x)
                   * (1.0 - smoothstep(uDisc.y - 0.8, uDisc.y, rHit));
        colour += discColour(rHit, phi) * edge;
        hitDisc = true;
      }
    }
    prevY = pos.y;
    prevR = rr;

    if (rr > 60.0) {
      vec3 escape = normalize(pos);
      colour += vec3(stars(escape));
      break;
    }
  }

  if (captured) {
    // The shadow. Nothing comes back out, so nothing is added.
    colour *= 0.0;
  }

  colour = pow(clamp(colour, 0.0, 1.0), vec3(0.85));
  outColor = vec4(colour, 1.0);
}
`;

export interface Renderer {
  start(): void;
  stop(): void;
  /** Draw exactly one frame. Used under prefers-reduced-motion. */
  drawOnce(): void;
}

export function createRenderer(canvas: HTMLCanvasElement): Renderer | null {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  };

  const vs = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vs || !fs) return null;

  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  const loc = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, "uRes");
  const uEye = gl.getUniformLocation(prog, "uEye");
  const uTime = gl.getUniformLocation(prog, "uTime");
  const uDisc = gl.getUniformLocation(prog, "uDisc");
  const uSig = gl.getUniformLocation(prog, "uSig");

  let azimuth = 0.6;
  let elevation = 0.22;
  let raf = 0;
  let running = false;
  const started = performance.now();

  const sig = getComputedStyle(canvas).getPropertyValue("--sig").trim() || "#ff8c42";
  const rgb = (() => {
    const m = sig.match(/^#([0-9a-f]{6})$/i);
    if (!m) return [1, 0.55, 0.26];
    const n = parseInt(m[1]!, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  })();

  function resize() {
    // Deliberately below devicePixelRatio. This shader costs 300 integration
    // steps per pixel, so rendering at 2x is several times the work for an
    // image that is mostly soft gradients — and on a machine without a GPU it
    // is the difference between smooth and unusable.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl!.viewport(0, 0, canvas.width, canvas.height);
  }

  function drawOnce() {
    resize();
    const { eye } = orbitCamera(azimuth, elevation, 30);
    gl!.uniform2f(uRes, canvas.width, canvas.height);
    gl!.uniform3f(uEye, eye[0], eye[1], eye[2]);
    gl!.uniform1f(uTime, (performance.now() - started) / 1000);
    gl!.uniform3f(uDisc, 3.0, 9.0, 0.15);
    gl!.uniform3f(uSig, rgb[0]!, rgb[1]!, rgb[2]!);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  function frame() {
    if (!running) return;
    azimuth += 0.0016;
    drawOnce();
    raf = requestAnimationFrame(frame);
  }

  // Drag to orbit.
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const onDown = (x: number, y: number) => {
    dragging = true;
    lastX = x;
    lastY = y;
  };
  const onMove = (x: number, y: number) => {
    if (!dragging) return;
    azimuth -= (x - lastX) * 0.006;
    elevation = Math.max(-1.2, Math.min(1.2, elevation + (y - lastY) * 0.004));
    lastX = x;
    lastY = y;
    if (!running) drawOnce();
  };

  canvas.addEventListener("pointerdown", (e) => {
    onDown(e.clientX, e.clientY);
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => onMove(e.clientX, e.clientY));
  canvas.addEventListener("pointerup", () => (dragging = false));
  canvas.addEventListener("pointercancel", () => (dragging = false));

  // Keyboard orbit, so the centerpiece is not mouse-only.
  canvas.addEventListener("keydown", (e) => {
    const step = 0.12;
    if (e.key === "ArrowLeft") azimuth -= step;
    else if (e.key === "ArrowRight") azimuth += step;
    else if (e.key === "ArrowUp") elevation = Math.min(1.2, elevation + step);
    else if (e.key === "ArrowDown") elevation = Math.max(-1.2, elevation - step);
    else return;
    e.preventDefault();
    if (!running) drawOnce();
  });

  window.addEventListener("resize", () => {
    if (!running) drawOnce();
  });

  return {
    start() {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
    drawOnce,
  };
}
