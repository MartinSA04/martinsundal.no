/**
 * Drives the chat console on /projects/ntnu-api/.
 *
 * The shape is a chat window because that is where an MCP server is normally
 * used: something asks a question, a tool gets called, the answer comes back.
 * The composer is a sentence with blanks rather than a text field, because the
 * thing that would read a free sentence is a language model and there is none
 * here. Picking the question picks the tool; filling the blanks fills the
 * arguments. Nothing has to be inferred, so nothing is faked.
 *
 * Whatever is asked is really called. When the server cannot be reached, a
 * prompt still holding its default courses falls back to a captured response
 * from scripts/capture-mcp-snapshot.mjs, labelled as such; edited to your own
 * courses it reports the failure instead. Nothing here is fabricated.
 */
import { McpClient } from "../lib/mcp.ts";
import {
  PROMPTS,
  defaults,
  sentence,
  invalidSlots,
  studyYear,
  type Prompt,
} from "../lib/mcp-prompts.ts";
import {
  renderResult,
  escapeHtml,
  callBlock,
  clipWire,
} from "../lib/mcp-render.ts";

const SERVER = "https://ntnu-mcp.martinsundal.no/mcp";
const SNAPSHOT = "/mcp-snapshot.json";

interface Snapshot {
  capturedAt: string;
  questions: Record<
    string,
    { tool: string; args: unknown; request: string; response: string }
  >;
}

/** Snapshot keys are rendered sentences, lowercased and squeezed. */
const key = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Fetched on demand, not bundled: it is sixty kilobytes that almost every
 * visitor never needs, because almost every call succeeds.
 */
let snapshotOnce: Promise<Snapshot> | null = null;
const getSnapshot = () =>
  (snapshotOnce ??= fetch(SNAPSHOT).then((r) => r.json() as Promise<Snapshot>));

/** The tool's own text, dug back out of the captured JSON-RPC response. */
function snapshotText(response: string): string {
  const content =
    (JSON.parse(response)?.result?.content as { text?: string }[]) ?? [];
  return content
    .map((c) => c.text)
    .filter(Boolean)
    .join("\n");
}

const root = document.querySelector<HTMLElement>("[data-mcp]");
if (root) {
  const log = root.querySelector<HTMLElement>("[data-mcp-log]")!;
  const form = root.querySelector<HTMLFormElement>("[data-mcp-form]")!;
  const line = root.querySelector<HTMLElement>("[data-mcp-line]")!;
  const send = root.querySelector<HTMLButtonElement>("[data-mcp-send]")!;
  const dot = root.querySelector<HTMLElement>("[data-mcp-dot]")!;
  const status = root.querySelector<HTMLElement>("[data-mcp-status]")!;
  const chips = [
    ...root.querySelectorAll<HTMLButtonElement>("[data-mcp-chip]"),
  ];
  /** The same picker, for screens six chips will not fit across. */
  const picker = root.querySelector<HTMLSelectElement>("[data-mcp-select]")!;

  let client: McpClient | null = null;
  let busy = false;
  let prompt: Prompt = PROMPTS[0];
  let values = defaults(prompt);

  // ---- composer ----------------------------------------------------------

  /** A blank in the sentence: sized to its content so the line stays a line. */
  function slotInput(id: string): HTMLInputElement {
    const slot = prompt.slots.find((s) => s.id === id)!;
    const el = document.createElement("input");
    el.type = "text";
    el.className = "slot";
    el.dataset.slot = id;
    el.value = values[id] ?? "";
    el.autocomplete = "off";
    el.spellcheck = false;
    el.setAttribute(
      "aria-label",
      slot.kind === "code" ? "Course code" : "Search term",
    );
    if (slot.kind === "code") {
      el.placeholder = slot.optional ? "optional" : "CODE";
    } else {
      el.placeholder = "a word";
    }
    el.addEventListener("input", () => {
      values[id] = el.value;
      size(el);
      validate();
    });
    return el;
  }

  /**
   * A hidden twin of a blank, living in the composer line so that it inherits
   * exactly the type the blanks are set in. Text measured in it is text as the
   * blank will render it.
   */
  const ruler = document.createElement("span");
  ruler.className = "slot-ruler";
  ruler.setAttribute("aria-hidden", "true");

  /**
   * Widen a blank to exactly what it holds.
   *
   * The twin is only an exact measure because the blanks carry no `list`
   * attribute. Chromium reserves seventeen pixels inside an `input[list]` for
   * its datalist arrow, keeps reserving them whether or not the arrow is
   * painted, and reports them in `scrollWidth` only once the field already has
   * a width — which is why an earlier version of this had to measure the
   * element against itself, twice.
   */
  const size = (el: HTMLInputElement) => {
    // An empty field measures its placeholder, which is not upper-cased the
    // way a filled one is.
    const empty = el.value === "";
    ruler.style.textTransform = empty ? "none" : "uppercase";
    ruler.textContent = empty ? el.placeholder : el.value;
    // Two pixels of slack, so the caret has somewhere to sit past the last
    // character rather than on top of it.
    el.style.width = `${Math.ceil(ruler.getBoundingClientRect().width) + 2}px`;
  };

  function draw() {
    const nodes = prompt.parts.map((part) => {
      if (typeof part === "string") {
        const span = document.createElement("span");
        span.textContent = part;
        return span;
      }
      return slotInput(part.slot);
    });
    line.replaceChildren(...nodes, ruler);
    for (const el of line.querySelectorAll<HTMLInputElement>("input.slot")) {
      size(el);
    }
    validate();
  }

  function validate() {
    const bad = new Set(invalidSlots(prompt, values));
    for (const el of line.querySelectorAll<HTMLInputElement>("input.slot")) {
      el.dataset.invalid = String(bad.has(el.dataset.slot!));
    }
    send.disabled = busy || bad.size > 0;
  }

  const setBusy = (on: boolean) => {
    busy = on;
    root.dataset.busy = String(on);
    for (const el of line.querySelectorAll<HTMLInputElement>("input.slot")) {
      el.disabled = on;
    }
    chips.forEach((c) => (c.disabled = on));
    picker.disabled = on;
    validate();
  };

  function select(p: Prompt) {
    prompt = p;
    values = defaults(p);
    chips.forEach((c) =>
      c.setAttribute("aria-pressed", String(c.dataset.mcpChip === p.id)),
    );
    picker.value = p.id;
    draw();
  }

  // ---- transcript --------------------------------------------------------

  /** Your turn: contained, and set against the edge you write from. */
  function youTurn(text: string): void {
    const el = document.createElement("p");
    el.className = "turn turn-you";
    el.textContent = text;
    log.append(el);
    el.scrollIntoView({ block: "nearest" });
  }

  /** The server's turn: attributed once, then bare. Returns its body. */
  function botTurn(body: string): HTMLElement {
    const el = document.createElement("article");
    el.className = "turn turn-bot";
    el.innerHTML =
      `<p class="turn-from"><span class="turn-mark" aria-hidden="true"></span>ntnu-mcp</p>` +
      `<div class="turn-body">${body}</div>`;
    log.append(el);
    el.scrollIntoView({ block: "nearest" });
    return el;
  }

  /** What a catalog search searched for, quoted back in its summary line. */
  const term = (args: unknown) =>
    String((args as { query?: string }).query ?? "");

  async function ask() {
    if (busy || invalidSlots(prompt, values).length) return;
    setBusy(true);

    const asked = prompt;
    const question = sentence(asked, values);
    const args = asked.args(values, studyYear(new Date()), asked);

    youTurn(question);
    const reply = botTurn(
      `<p class="turn-wait">calling <code>${escapeHtml(asked.tool)}</code>…</p>`,
    );
    const body = reply.querySelector<HTMLElement>(".turn-body")!;

    dot.dataset.state = "";
    status.textContent = client ? "calling" : "connecting";
    const started = performance.now();

    try {
      if (!client) {
        client = new McpClient(SERVER);
        await client.connect();
      }
      const res = await client.call(asked.tool, args);
      const ms = Math.round(performance.now() - started);
      const out = renderResult(asked.tool, res.data, res.text, term(args));

      dot.dataset.state = "live";
      status.textContent = `live · session ${client.sessionId?.slice(0, 8) ?? "?"}`;
      body.innerHTML =
        callBlock(
          asked.tool,
          args,
          `${ms} ms`,
          `${res.request}\n\n${clipWire(res.response)}`,
        ) +
        `<p class="turn-say">${out.say}</p>` +
        out.html;
    } catch (err) {
      const why = err instanceof Error ? err.message : "unknown error";
      client = null;
      dot.dataset.state = "error";
      const snapshot = await getSnapshot().catch(() => null);
      const snap = snapshot?.questions[key(question)];

      if (snapshot && snap) {
        status.textContent = "snapshot";
        const text = snapshotText(snap.response);
        const out = renderResult(
          snap.tool,
          JSON.parse(text),
          text,
          term(snap.args),
        );
        body.innerHTML =
          callBlock(
            snap.tool,
            snap.args,
            "captured",
            `${snap.request}\n\n${clipWire(snap.response)}`,
          ) +
          `<p class="turn-note">Server unreachable (${escapeHtml(why)}). This is its own answer to the same question, captured ${escapeHtml(snapshot.capturedAt.slice(0, 10))}.</p>` +
          `<p class="turn-say">${out.say}</p>` +
          out.html;
      } else {
        status.textContent = "unreachable";
        body.innerHTML =
          `<p class="turn-note">Server unreachable (${escapeHtml(why)}). ` +
          `Only the unedited prompts have a captured answer to fall back on, and making one up for this would defeat the page. ` +
          `The worker sleeps when idle, so asking again usually wakes it.</p>`;
      }
    } finally {
      setBusy(false);
      reply.scrollIntoView({ block: "nearest" });
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void ask();
  });

  chips.forEach((chip) => {
    const p = PROMPTS.find((x) => x.id === chip.dataset.mcpChip);
    if (p) chip.addEventListener("click", () => select(p));
  });

  picker.addEventListener("change", () => {
    const p = PROMPTS.find((x) => x.id === picker.value);
    if (p) select(p);
  });

  // The composer ships as static text and is replaced here, so it never sits
  // there as a dead form for someone without JavaScript.
  select(PROMPTS[0]);
  status.textContent = "idle";

  // A blank is measured from its rendered text, and Plex Mono loads with
  // `font-display: swap` — so the first measurement is of the fallback face,
  // which is wider. Left alone, every blank keeps that width and its underline
  // runs on past the code sitting in it.
  void document.fonts?.ready.then(() => {
    for (const el of line.querySelectorAll<HTMLInputElement>("input.slot")) {
      size(el);
    }
  });
}
