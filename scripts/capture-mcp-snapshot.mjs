/**
 * Captures genuine responses from the live MCP server into
 * public/mcp-snapshot.json, used as the chat console's fallback when the
 * worker is cold or unreachable.
 *
 *   node scripts/capture-mcp-snapshot.mjs
 *
 * It captures each prompt with the courses it ships with, keyed by the sentence
 * the page renders for it, so a fallback is always the answer to the question
 * that was asked rather than a near-miss. A prompt edited to a visitor's own
 * courses has no snapshot and reports the failure instead.
 *
 * It lands in public/ rather than src/ so it stays out of the page's JavaScript
 * bundle: a hundred kilobytes of JSON that most visitors never need should not
 * be downloaded by all of them. The page fetches it only after a call fails.
 *
 * The file is real captured data and is never hand-written: the page labels it
 * as a snapshot, and a labelled snapshot of real responses is honest where
 * invented data would not be.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { McpClient } from "../src/lib/mcp.ts";
import {
  PROMPTS,
  defaults,
  sentence,
  studyYear,
} from "../src/lib/mcp-prompts.ts";

const URL = "https://ntnu-mcp.martinsundal.no/mcp";

const key = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

const client = new McpClient(URL);
await client.connect();
console.log("connected, session", client.sessionId);

const snapshot = {
  capturedAt: new Date().toISOString(),
  server: URL,
  questions: {},
};

const year = studyYear(new Date());

for (const prompt of PROMPTS) {
  const values = defaults(prompt);
  const question = sentence(prompt, values);
  const args = prompt.args(values, year, prompt);
  try {
    const res = await client.call(prompt.tool, args);
    // res.text is deliberately not stored: it is already inside res.response,
    // and the page pulls it back out rather than shipping it twice.
    snapshot.questions[key(question)] = {
      question,
      tool: prompt.tool,
      args,
      request: res.request,
      response: res.response,
    };
    console.log(
      `captured ${prompt.tool} (${res.text.length} chars) — ${question}`,
    );
  } catch (err) {
    console.error(`FAILED ${question}:`, err.message);
    process.exitCode = 1;
  }
}

mkdirSync("public", { recursive: true });
writeFileSync("public/mcp-snapshot.json", JSON.stringify(snapshot) + "\n");
console.log("wrote public/mcp-snapshot.json");
