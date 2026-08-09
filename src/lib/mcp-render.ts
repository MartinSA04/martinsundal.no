/**
 * Turns a tool result into the two things a chat turn shows: one sentence of
 * summary, and the result laid out so it can be read without reading JSON.
 *
 * The sentence is a template with numbers from the response substituted into
 * it. That is the whole of the "language model" on this page, and the page
 * says so. No branch here invents a fact the server did not send: when a
 * result has no renderer, the tool's own text is printed verbatim.
 */

export interface Rendered {
  /** One line above the result, in the voice of a chat reply. */
  say: string;
  /** The result itself, as HTML. */
  html: string;
}

export const escapeHtml = (s: string): string =>
  s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );

/** Long responses are cut in the wire view; the summary above stays honest. */
export const clipWire = (s: string): string =>
  s.length > 6000
    ? s.slice(0, 6000) + `\n\n… ${s.length - 6000} more characters`
    : s;

/**
 * The tool call, as the chip a chat client discloses a tool use with: closed
 * it is one line, open it is the request and the response as they went over
 * the wire. Built here rather than in the driver because the console's opening
 * exchange is rendered at build time from a capture, and the two have to be
 * the same object.
 */
export const callBlock = (
  tool: string,
  args: unknown,
  timing: string,
  wire: string,
): string =>
  `<details class="call"><summary>` +
  `<code class="call-tool">${escapeHtml(tool)}</code>` +
  `<span class="call-args">${escapeHtml(JSON.stringify(args))}</span>` +
  `<span class="call-ms">${escapeHtml(timing)}</span>` +
  `</summary><pre class="call-wire">${escapeHtml(wire)}</pre></details>`;

const plural = (n: number, one: string, many = one + "s") =>
  `${n} ${n === 1 ? one : many}`;

/** A dl of label/value pairs, skipping anything the server left empty. */
const facts = (rows: [string, unknown][]): string =>
  `<dl class="mcp-facts">` +
  rows
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(
      ([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd>`,
    )
    .join("") +
  `</dl>`;

const SEARCH_LIMIT = 12;

function search(d: any, query: string): Rendered {
  const courses = d.courses ?? [];
  const shown = courses.slice(0, SEARCH_LIMIT);
  const found = d.num_found ?? courses.length;
  // The year is not in this response, only in the request; the call block
  // above the sentence already shows which one was searched.
  return {
    say: `${plural(found, "course")} match “${query}”. First ${shown.length}:`,
    html:
      `<ul class="mcp-rows">` +
      shown
        .map((c: any) => {
          const exam = (c.exams ?? []).find((e: any) => e.date)?.date;
          return (
            `<li class="mcp-row"><code>${escapeHtml(c.code)}</code>` +
            `<span>${escapeHtml(c.name)}</span>` +
            `<time>${exam ? escapeHtml(exam) : ""}</time></li>`
          );
        })
        .join("") +
      `</ul>`,
  };
}

function compare(d: any): Rendered {
  const cs = d.courses ?? [];
  return {
    say: `${plural(cs.length, "course")}, side by side for ${d.year}:`,
    html:
      `<div class="mcp-scroll"><table class="mcp-table"><thead><tr>` +
      `<th scope="col">Course</th><th scope="col">Exam</th>` +
      `<th scope="col">Hrs/wk</th><th scope="col">Last sitting</th>` +
      `</tr></thead><tbody>` +
      cs
        .map((c: any) => {
          const exam = (c.exam_dates ?? []).find((e: any) => e.date)?.date;
          const g = c.latest_grades;
          const fail = g?.grades?.F?.percent;
          const sitting = g
            ? `${g.semester} ${g.year} · ${plural(g.candidates, "candidate")}` +
              (fail === undefined ? "" : ` · ${fail}% F`)
            : "no record";
          return (
            `<tr><th scope="row"><code>${escapeHtml(c.code)}</code>` +
            `<span>${escapeHtml(c.name)}</span></th>` +
            `<td>${exam ? escapeHtml(exam) : "—"}</td>` +
            `<td>${c.weekly_teaching_hours ?? "—"}</td>` +
            `<td>${escapeHtml(sitting)}</td></tr>`
          );
        })
        .join("") +
      `</tbody></table></div>`,
  };
}

function conflicts(d: any): Rendered {
  const clashes = d.timetable_conflicts ?? [];
  const exams = d.exam_conflicts ?? [];
  const checked = (d.courses_checked ?? []).length;

  if (!clashes.length && !exams.length) {
    return {
      say: `Nothing clashes across those ${checked} courses in ${d.year}.`,
      html: "",
    };
  }

  const unavoidable = clashes.filter(
    (c: any) => c.a?.kind === "lecture" && c.b?.kind === "lecture",
  ).length;

  const say =
    `${plural(clashes.length, "timetable clash", "timetable clashes")} and ` +
    `${plural(exams.length, "exam collision")} across ${checked} courses. ` +
    (unavoidable
      ? `${unavoidable} of them ${unavoidable === 1 ? "is" : "are"} lecture ` +
        `against lecture, which no change of group will fix.`
      : `None are lecture against lecture, so an alternative group may cover them.`);

  return {
    say,
    html:
      `<ul class="mcp-clashes">` +
      exams
        .map(
          (e: any) =>
            `<li class="mcp-clash" data-hard="true"><span class="mcp-when">Exam · ${escapeHtml(String(e.date ?? "date unset"))}</span>` +
            `<span class="mcp-what">${escapeHtml((e.courses ?? []).join(" / "))}</span></li>`,
        )
        .join("") +
      clashes
        .map((c: any) => {
          const hard = c.a?.kind === "lecture" && c.b?.kind === "lecture";
          return (
            `<li class="mcp-clash" data-hard="${hard}">` +
            `<span class="mcp-when">${escapeHtml(c.day)} ${escapeHtml(c.overlap)}` +
            `<small>wk ${escapeHtml(String(c.weeks ?? ""))}</small></span>` +
            `<span class="mcp-what">` +
            `<code>${escapeHtml(c.a.course)}</code> ${escapeHtml(c.a.activity)}` +
            ` <em>against</em> ` +
            `<code>${escapeHtml(c.b.course)}</code> ${escapeHtml(c.b.activity)}` +
            `</span></li>`
          );
        })
        .join("") +
      `</ul>`,
  };
}

function grades(d: any): Rendered {
  // One entry per year and semester. Show the largest recent sitting: old
  // summer re-sits have a handful of candidates and read as noise.
  const dists = (d.distributions ?? []).filter((x: any) => x.candidates > 0);
  const latest = [...dists].sort(
    (a: any, b: any) => b.year - a.year || b.candidates - a.candidates,
  )[0];
  if (!latest) return { say: "No grade records for that course.", html: "" };

  const entries = Object.entries(latest.grades) as [string, any][];
  const max = Math.max(...entries.map(([, g]) => g.count), 1);
  const fail = latest.grades.F;

  return {
    say:
      `${escapeHtml(d.course_code)}, ${latest.semester.toLowerCase()} ${latest.year}, ` +
      `${plural(latest.candidates, "candidate")}` +
      (fail ? `, of whom ${fail.percent}% got an F.` : "."),
    html:
      `<ul class="mcp-bars">` +
      entries
        .map(
          ([grade, g]) =>
            `<li class="mcp-barrow"><code>${escapeHtml(grade)}</code>` +
            `<span class="mcp-bar-track"><span class="mcp-bar-fill" style="width:${(g.count / max) * 100}%"></span></span>` +
            `<span class="mcp-bar-num">${g.count}</span></li>`,
        )
        .join("") +
      `</ul>`,
  };
}

function examInfo(d: any): Rendered {
  const cs = d.courses ?? [];
  const sittings = cs.flatMap((c: any) => c.exams ?? []);
  return {
    say:
      `${plural(sittings.length, "sitting")} across ` +
      `${plural(cs.length, "course")} in ${d.year}:`,
    html: cs
      .map(
        (c: any) =>
          `<div class="mcp-block"><p class="mcp-block-head"><code>${escapeHtml(c.course_code)}</code> ${escapeHtml(c.course_name ?? "")}</p>` +
          (c.exams ?? [])
            .map((e: any) =>
              facts([
                [e.occasion ?? "Exam", e.season],
                ["Date", e.date ?? "not published"],
                ["Starts", e.start_time],
                ["Duration", e.duration],
                ["Aids", e.aids && `${e.aids} — ${e.aids_meaning ?? ""}`],
                ["Room", (e.rooms ?? []).join(", ") || "published days before"],
              ]),
            )
            .join("") +
          `</div>`,
      )
      .join(""),
  };
}

function courseInfo(d: any): Rendered {
  return {
    say: `${escapeHtml(d.course_code)} ${escapeHtml(d.course_name ?? "")}, study year ${d.study_year}:`,
    html:
      facts([
        ["Credits", d.credits && `${d.credits} sp`],
        ["Level", d.level],
        ["Campus", d.campus],
        ["Taught in", d.language_of_instruction],
        ["Teaching starts", d.teaching_start],
        ["Assessment", d.assessment],
        ["Grading", d.grading],
        ["Mandatory", (d.mandatory_activities ?? []).join(", ")],
        ["Department", d.department],
      ]) +
      ((d.notices ?? []).length
        ? `<p class="mcp-notice">${escapeHtml(d.notices.join(" "))}</p>`
        : ""),
  };
}

/**
 * @param query the catalog search term, quoted back in that tool's summary
 *   line. Empty for every other tool.
 */
export function renderResult(
  tool: string,
  data: unknown,
  text: string,
  query = "",
): Rendered {
  const d = data as any;
  try {
    if (d && typeof d === "object") {
      if (tool === "search_courses" && Array.isArray(d.courses))
        return search(d, query);
      if (tool === "compare_courses" && Array.isArray(d.courses))
        return compare(d);
      if (tool === "check_timetable_conflicts" && d.courses_checked)
        return conflicts(d);
      if (tool === "get_grade_distribution" && Array.isArray(d.distributions))
        return grades(d);
      if (tool === "get_exam_info" && Array.isArray(d.courses))
        return examInfo(d);
      if (tool === "get_course_info" && d.course_code) return courseInfo(d);
    }
  } catch {
    // A shape that has drifted falls through to the raw text below rather than
    // taking the page down. What the server said is still shown.
  }
  return {
    say: `${tool} answered:`,
    html: `<pre class="mcp-raw">${escapeHtml(text.slice(0, 4000))}</pre>`,
  };
}
