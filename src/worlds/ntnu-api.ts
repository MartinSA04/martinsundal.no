/**
 * Drives the live MCP console on /projects/ntnu-api/.
 *
 * Talks to the real server. When it cannot, it renders a snapshot of genuine
 * responses captured by scripts/capture-mcp-snapshot.mjs and says so on the
 * page. It never fabricates data.
 */
import { McpClient } from "../lib/mcp.ts";
import snapshot from "../data/mcp-snapshot.json";

const SERVER = "https://ntnu-mcp.martinsundal.no/mcp";

interface Preset {
  id: string;
  label: string;
  tool: string;
  args: Record<string, unknown>;
}

const PRESETS: Preset[] = [
  {
    id: "search",
    label: "search_courses",
    tool: "search_courses",
    args: { year: 2026, query: "kvantemekanikk" },
  },
  {
    id: "compare",
    label: "compare_courses",
    tool: "compare_courses",
    args: { course_codes: ["TFY4205", "FY2045"], year: 2026 },
  },
  {
    id: "conflicts",
    label: "check_timetable_conflicts",
    tool: "check_timetable_conflicts",
    args: { course_codes: ["TFY4205", "FY2045", "TMA4130"], year: 2026 },
  },
  {
    id: "grades",
    label: "get_grade_distribution",
    tool: "get_grade_distribution",
    args: { course_code: "TDT4100" },
  },
];

const el = <T extends Element>(sel: string) => document.querySelector<T>(sel);

const root = el<HTMLElement>("[data-mcp]");
if (root) {
  const wire = el<HTMLElement>("[data-mcp-wire]")!;
  const result = el<HTMLElement>("[data-mcp-result]")!;
  const fallback = el<HTMLElement>("[data-mcp-fallback]")!;
  const dot = el<HTMLElement>("[data-mcp-dot]")!;
  const status = el<HTMLElement>("[data-mcp-status]")!;
  const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-mcp-preset]")];

  let client: McpClient | null = null;

  const setBusy = (busy: boolean) => {
    buttons.forEach((b) => (b.disabled = busy));
  };

  const escapeHtml = (s: string) =>
    s.replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
    );

  function renderResult(preset: Preset, data: unknown, text: string) {
    // Course list
    const courses = (data as { courses?: { code: string; name: string }[] })?.courses;
    if (Array.isArray(courses) && courses.length) {
      const found = (data as { num_found?: number }).num_found ?? courses.length;
      result.innerHTML =
        `<p class="micro-label">${found} matches · showing ${Math.min(courses.length, 12)}</p>` +
        `<div class="mcp-rows">` +
        courses
          .slice(0, 12)
          .map(
            (c) =>
              `<div class="mcp-row"><code>${escapeHtml(c.code)}</code><span>${escapeHtml(c.name)}</span></div>`,
          )
          .join("") +
        `</div>`;
      return;
    }

    // Grade distribution. The server returns one entry per year/semester, each
    // with a grades map; show the most recent sitting that actually had
    // candidates, since old summer re-sits are tiny and unrepresentative.
    const dists = (
      data as {
        course_code?: string;
        distributions?: {
          year: number;
          semester: string;
          candidates: number;
          grades: Record<string, { count: number; percent: number }>;
        }[];
      }
    )?.distributions;

    if (Array.isArray(dists) && dists.length) {
      const latest = dists
        .filter((d) => d.candidates > 0)
        .sort((a, b) => b.year - a.year || b.candidates - a.candidates)[0];

      if (latest) {
        const grades = Object.entries(latest.grades);
        const max = Math.max(...grades.map(([, g]) => g.count), 1);
        result.innerHTML =
          `<p class="micro-label">${escapeHtml(String((data as any).course_code ?? ""))} · ${latest.semester} ${latest.year} · ${latest.candidates} candidates</p>` +
          `<div class="mcp-bars">` +
          grades
            .map(
              ([grade, g]) =>
                `<div class="mcp-barrow"><code>${escapeHtml(grade)}</code>` +
                `<div class="mcp-bar-track"><div class="mcp-bar-fill" style="width:${(g.count / max) * 100}%"></div></div>` +
                `<span>${g.count}</span></div>`,
            )
            .join("") +
          `</div>`;
        return;
      }
    }

    // Anything else: show the tool's own text, which is already readable JSON.
    result.innerHTML = `<pre>${escapeHtml(text.slice(0, 4000))}</pre>`;
  }

  function useSnapshot(preset: Preset, reason: string) {
    const snap = (snapshot.presets as Record<string, any>)[preset.id];
    dot.dataset.state = "error";
    status.textContent = "snapshot";
    fallback.hidden = false;
    const when = new Date(snapshot.capturedAt).toISOString().slice(0, 10);
    fallback.innerHTML =
      `<strong>Showing a snapshot.</strong> The live server did not answer (${escapeHtml(reason)}). ` +
      `These are real responses captured from it on ${when}, not invented data.`;

    if (!snap) {
      wire.textContent = "";
      result.innerHTML = `<pre>No snapshot for this preset.</pre>`;
      return;
    }
    wire.textContent = `${snap.request}\n\n${snap.response}`;
    let data: unknown = null;
    try {
      data = JSON.parse(snap.text);
    } catch {
      data = null;
    }
    renderResult(preset, data, snap.text);
  }

  async function run(preset: Preset, button: HTMLButtonElement) {
    setBusy(true);
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    fallback.hidden = true;
    dot.dataset.state = "";
    status.textContent = "connecting";
    wire.textContent = "";
    result.innerHTML = `<p class="micro-label">Running ${preset.tool}…</p>`;

    try {
      if (!client) {
        client = new McpClient(SERVER);
        await client.connect();
      }
      const res = await client.call(preset.tool, preset.args);
      dot.dataset.state = "live";
      status.textContent = `live · session ${client.sessionId?.slice(0, 8) ?? "?"}…`;
      wire.textContent = `${res.request}\n\n${res.response}`;
      renderResult(preset, res.data, res.text);
    } catch (err) {
      client = null;
      useSnapshot(preset, err instanceof Error ? err.message : "unknown error");
    } finally {
      setBusy(false);
    }
  }

  buttons.forEach((button) => {
    const preset = PRESETS.find((p) => p.id === button.dataset.mcpPreset);
    if (!preset) return;
    button.addEventListener("click", () => void run(preset, button));
  });
}
