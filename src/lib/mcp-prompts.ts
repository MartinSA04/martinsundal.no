/**
 * The questions the console can ask, as sentences with blanks in them.
 *
 * Each prompt is bound to exactly one of the server's tools, so nothing on the
 * page has to guess what a visitor meant — the guessing is the part a language
 * model would normally do, and there is no model here. What is left to choose
 * is the courses, which is the part that is actually yours.
 *
 * A prompt renders twice: as the fill-in-the-blank line in the composer, and
 * as a plain sentence in the transcript once it has been asked.
 */

export interface Slot {
  id: string;
  /** `code` is validated and upper-cased; `text` is a free catalog query. */
  kind: "code" | "text";
  /** What it starts filled in with, so the console is usable on first sight. */
  value: string;
  /** An empty optional slot is dropped from the call instead of blocking it. */
  optional?: boolean;
}

export interface Prompt {
  id: string;
  /** Short name for the chip that selects this prompt. */
  label: string;
  tool: string;
  /** The sentence, in order: literal strings and the slots between them. */
  parts: (string | { slot: string })[];
  slots: Slot[];
  args(
    values: Record<string, string>,
    year: number,
    self: Prompt,
  ): Record<string, unknown>;
}

/** Two to six letters, four to six digits, sometimes a letter after that. */
export const CODE_PATTERN = /^[A-ZÆØÅ]{2,6}\d{4,6}[A-Z]?$/;

/**
 * NTNU's study year is named for the autumn it opens, so the spring half of a
 * study year runs in the following calendar year. August flips it over.
 */
export function studyYear(now: Date): number {
  const y = now.getFullYear();
  return now.getMonth() >= 7 ? y : y - 1;
}

const code = (id: string, value: string, optional = false): Slot => ({
  id,
  kind: "code",
  value,
  optional,
});

/** Non-empty slot values, in slot order, upper-cased for the code slots. */
const filled = (p: Prompt, v: Record<string, string>): string[] =>
  p.slots
    .map((s) => (v[s.id] ?? "").trim().toUpperCase())
    .filter((x) => x !== "");

export const PROMPTS: Prompt[] = [
  {
    id: "conflicts",
    label: "clashes",
    tool: "check_timetable_conflicts",
    parts: [
      "do ",
      { slot: "a" },
      ", ",
      { slot: "b" },
      " and ",
      { slot: "c" },
      " clash?",
    ],
    slots: [
      code("a", "TFY4205"),
      code("b", "FY2045"),
      code("c", "TMA4130", true),
    ],
    args: (v, year, self) => ({ course_codes: filled(self, v), year }),
  },
  {
    id: "compare",
    label: "compare",
    tool: "compare_courses",
    parts: ["compare ", { slot: "a" }, " and ", { slot: "b" }],
    slots: [code("a", "TFY4205"), code("b", "FY2045")],
    args: (v, year, self) => ({ course_codes: filled(self, v), year }),
  },
  {
    id: "grades",
    label: "grades",
    tool: "get_grade_distribution",
    parts: ["how many fail ", { slot: "a" }, "?"],
    slots: [code("a", "TDT4100")],
    args: (v) => ({ course_code: v.a.trim().toUpperCase() }),
  },
  {
    id: "exam",
    label: "exam",
    tool: "get_exam_info",
    parts: ["when is the ", { slot: "a" }, " exam?"],
    slots: [code("a", "TFY4205")],
    args: (v, year, self) => ({ course_codes: filled(self, v), year }),
  },
  {
    id: "course",
    label: "course",
    tool: "get_course_info",
    parts: ["tell me about ", { slot: "a" }],
    slots: [code("a", "TDT4102")],
    args: (v, year) => ({ course_code: v.a.trim().toUpperCase(), year }),
  },
  {
    id: "search",
    label: "search",
    tool: "search_courses",
    parts: ["find courses about ", { slot: "a" }],
    slots: [{ id: "a", kind: "text", value: "kvantemekanikk" }],
    args: (v, year) => ({ query: v.a.trim(), year }),
  },
];

/** The slot values a prompt starts with. */
export const defaults = (p: Prompt): Record<string, string> =>
  Object.fromEntries(p.slots.map((s) => [s.id, s.value]));

/** The prompt as one line of plain text, for the transcript. */
export function sentence(p: Prompt, values: Record<string, string>): string {
  const out: string[] = [];
  for (const part of p.parts) {
    if (typeof part === "string") {
      out.push(part);
      continue;
    }
    const value = clean(p, part.slot, values);
    // An emptied optional slot takes the separator that introduced it with it,
    // so "A, B and " does not survive as a sentence.
    if (!value) out.pop();
    else out.push(value);
  }
  return out
    .join("")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const clean = (p: Prompt, id: string, values: Record<string, string>) => {
  const slot = p.slots.find((s) => s.id === id)!;
  const raw = (values[id] ?? "").trim();
  return slot.kind === "code" ? raw.toUpperCase() : raw;
};

/** Which slots are not yet fit to send, so the button can say so. */
export function invalidSlots(
  p: Prompt,
  values: Record<string, string>,
): string[] {
  const bad: string[] = [];
  for (const slot of p.slots) {
    const raw = (values[slot.id] ?? "").trim();
    if (!raw) {
      if (!slot.optional) bad.push(slot.id);
      continue;
    }
    if (slot.kind === "code" && !CODE_PATTERN.test(raw.toUpperCase())) {
      bad.push(slot.id);
    }
  }
  // The server rejects a clash check on fewer than two courses.
  if (p.tool === "check_timetable_conflicts" && filled(p, values).length < 2) {
    bad.push(p.slots[1].id);
  }
  return [...new Set(bad)];
}
