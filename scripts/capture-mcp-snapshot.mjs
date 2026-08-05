/**
 * Captures genuine responses from the live MCP server into
 * src/data/mcp-snapshot.json, used as the console's fallback when the worker
 * is cold or unreachable.
 *
 *   node scripts/capture-mcp-snapshot.mjs
 *
 * The file is real captured data. It is never hand-written: the page labels it
 * as a snapshot, and a labelled snapshot of real responses is honest where
 * invented data would not be.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { McpClient } from "../src/lib/mcp.ts";

const URL = "https://ntnu-mcp.martinsundal.no/mcp";

const PRESETS = [
  {
    id: "search",
    tool: "search_courses",
    args: { year: 2026, query: "kvantemekanikk" },
  },
  {
    id: "compare",
    tool: "compare_courses",
    args: { course_codes: ["TFY4205", "FY2045"], year: 2026 },
  },
  {
    id: "conflicts",
    tool: "check_timetable_conflicts",
    args: { course_codes: ["TFY4205", "FY2045", "TMA4130"], year: 2026 },
  },
  {
    id: "grades",
    tool: "get_grade_distribution",
    args: { course_code: "TDT4100" },
  },
];

const client = new McpClient(URL);
await client.connect();
console.log("connected, session", client.sessionId);

const snapshot = {
  capturedAt: new Date().toISOString(),
  server: URL,
  presets: {},
};

for (const preset of PRESETS) {
  try {
    const res = await client.call(preset.tool, preset.args);
    snapshot.presets[preset.id] = {
      tool: preset.tool,
      args: preset.args,
      request: res.request,
      response: res.response,
      text: res.text,
    };
    console.log(`captured ${preset.id} (${res.text.length} chars)`);
  } catch (err) {
    console.error(`FAILED ${preset.id}:`, err.message);
    process.exitCode = 1;
  }
}

mkdirSync("src/data", { recursive: true });
writeFileSync(
  "src/data/mcp-snapshot.json",
  JSON.stringify(snapshot, null, 2) + "\n",
);
console.log("wrote src/data/mcp-snapshot.json");
