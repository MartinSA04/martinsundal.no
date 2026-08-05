import test from "node:test";
import assert from "node:assert/strict";
import { parseSseFrames, McpClient } from "../src/lib/mcp.ts";

test("parses a single SSE frame", () => {
  const frames = parseSseFrames(
    'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"ok":true}}\n\n',
  );
  assert.equal(frames.length, 1);
  assert.deepEqual((frames[0] as any).result, { ok: true });
});

test("parses several frames in one chunk", () => {
  const chunk =
    'event: message\ndata: {"id":1}\n\nevent: message\ndata: {"id":2}\n\n';
  assert.deepEqual(
    parseSseFrames(chunk).map((f: any) => f.id),
    [1, 2],
  );
});

test("ignores keep-alive comments and blank lines", () => {
  assert.equal(parseSseFrames(": keep-alive\n\n\n").length, 0);
});

test("tolerates a data payload split across lines", () => {
  const frames = parseSseFrames('event: message\ndata: {"a":\ndata: 1}\n\n');
  assert.deepEqual(frames[0], { a: 1 });
});

test("tolerates a plain JSON body with no SSE framing", () => {
  const frames = parseSseFrames(
    '{"jsonrpc":"2.0","id":1,"result":{"ok":true}}',
  );
  assert.equal(frames.length, 1);
  assert.deepEqual((frames[0] as any).result, { ok: true });
});

test("skips unparseable data rather than throwing", () => {
  const frames = parseSseFrames('data: not json\n\ndata: {"id":2}\n\n');
  assert.deepEqual(
    frames.map((f: any) => f.id),
    [2],
  );
});

test("client sends the session id on calls after connecting", async () => {
  const seen: (string | null)[] = [];
  const fetchStub = (async (_url: string, init: RequestInit) => {
    const headers = new Headers(init.headers);
    seen.push(headers.get("mcp-session-id"));
    const body = JSON.parse(String(init.body));
    if (body.method === "initialize") {
      return new Response(
        'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-06-18"}}\n\n',
        {
          headers: {
            "mcp-session-id": "sess-123",
            "content-type": "text/event-stream",
          },
        },
      );
    }
    return new Response(
      'event: message\ndata: {"jsonrpc":"2.0","id":2,"result":{"content":[]}}\n\n',
      { headers: { "content-type": "text/event-stream" } },
    );
  }) as unknown as typeof fetch;

  const c = new McpClient("https://example.test/mcp", fetchStub);
  await c.connect();
  assert.equal(c.sessionId, "sess-123");
  await c.call("search_courses", { year: 2026, query: "fysikk" });
  assert.equal(seen.at(-1), "sess-123");
});

test("a JSON-RPC error rejects rather than resolving with junk", async () => {
  const fetchStub = (async () =>
    new Response(
      'event: message\ndata: {"jsonrpc":"2.0","id":1,"error":{"code":-32602,"message":"bad params"}}\n\n',
      { headers: { "content-type": "text/event-stream" } },
    )) as unknown as typeof fetch;

  const c = new McpClient("https://example.test/mcp", fetchStub);
  await assert.rejects(() => c.connect(), /bad params/);
});

test("an HTTP failure rejects with the status", async () => {
  const fetchStub = (async () =>
    new Response("nope", {
      status: 503,
      statusText: "Service Unavailable",
    })) as unknown as typeof fetch;
  const c = new McpClient("https://example.test/mcp", fetchStub);
  await assert.rejects(() => c.connect(), /503/);
});

test("calls fetch with a global receiver, not the client", async () => {
  // Chrome's fetch throws "Illegal invocation" if the receiver is anything
  // other than a Window, which is exactly what `this.#fetch(...)` would give
  // it. Node's fetch does not care, so this stub reproduces the browser check.
  const strictFetch = function (this: unknown) {
    if (this !== globalThis && this !== undefined) {
      throw new TypeError("Illegal invocation");
    }
    return Promise.resolve(
      new Response('data: {"jsonrpc":"2.0","id":1,"result":{}}\n\n', {
        headers: { "mcp-session-id": "s", "content-type": "text/event-stream" },
      }),
    );
  } as unknown as typeof fetch;

  const c = new McpClient("https://example.test/mcp", strictFetch);
  await c.connect();
  assert.equal(c.sessionId, "s");
});

test("records the wire traffic for display", async () => {
  const fetchStub = (async (_u: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    if (body.method === "initialize") {
      return new Response(
        'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{}}\n\n',
        {
          headers: {
            "mcp-session-id": "s",
            "content-type": "text/event-stream",
          },
        },
      );
    }
    return new Response(
      'event: message\ndata: {"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"hi"}]}}\n\n',
      { headers: { "content-type": "text/event-stream" } },
    );
  }) as unknown as typeof fetch;

  const c = new McpClient("https://example.test/mcp", fetchStub);
  await c.connect();
  const res = await c.call("search_courses", { year: 2026 });
  assert.match(res.request, /"method": "tools\/call"/);
  assert.match(res.response, /"content"/);
  assert.equal(res.text, "hi");
});
