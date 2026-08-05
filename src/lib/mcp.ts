/**
 * A Streamable-HTTP MCP client, written by hand.
 *
 * No SDK and no dependencies — partly because the page it runs on documents an
 * MCP server, and implementing the protocol in eighty lines is the clearest
 * possible argument that it is simple.
 *
 * Handshake, verified against ntnu-mcp.martinsundal.no on 2026-08-05:
 *   POST initialize            -> read the mcp-session-id response header
 *   POST notifications/initialized
 *   POST tools/call            -> send that session id back on every request
 *
 * Responses come back as text/event-stream even for single replies, so every
 * body goes through parseSseFrames.
 */

export const PROTOCOL_VERSION = "2025-06-18";

export interface Tool {
  name: string;
  description: string;
  inputSchema: object;
}

export interface CallResult {
  /** Pretty-printed JSON-RPC request, for the wire pane. */
  request: string;
  /** Pretty-printed JSON-RPC response, for the wire pane. */
  response: string;
  /** Concatenated text content, which is what the tools actually return. */
  text: string;
  /** Parsed text content when it is JSON, which for this server it always is. */
  data: unknown;
}

/**
 * Extracts JSON payloads from an SSE body. Accepts a bare JSON body too, since
 * a spec-compliant server may answer with application/json instead.
 */
export function parseSseFrames(chunk: string): unknown[] {
  const trimmed = chunk.trim();
  if (!trimmed) return [];

  if (!/^(event|data|id|retry|:)/m.test(trimmed)) {
    try {
      return [JSON.parse(trimmed)];
    } catch {
      return [];
    }
  }

  const out: unknown[] = [];
  for (const block of trimmed.split(/\n\n+/)) {
    const payload = block
      .split(/\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("");
    if (!payload) continue;
    try {
      out.push(JSON.parse(payload));
    } catch {
      // A frame we cannot parse is skipped rather than killing the batch.
    }
  }
  return out;
}

interface JsonRpcResponse {
  id?: number;
  result?: unknown;
  error?: { code: number; message: string };
}

export class McpClient {
  readonly url: string;
  #fetch: typeof fetch;
  #session: string | null = null;
  #id = 0;

  constructor(url: string, fetchImpl: typeof fetch = globalThis.fetch) {
    this.url = url;
    // Bound to globalThis on purpose. Calling `this.#fetch(...)` would set the
    // receiver to this client, and the browser's fetch rejects any receiver
    // that is not a Window with "Illegal invocation". Node's fetch does not
    // care, so this only shows up in a real browser.
    this.#fetch = fetchImpl.bind(globalThis);
  }

  get sessionId(): string | null {
    return this.#session;
  }

  async #post(body: object, expectReply: boolean): Promise<JsonRpcResponse | null> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "mcp-protocol-version": PROTOCOL_VERSION,
    };
    if (this.#session) headers["mcp-session-id"] = this.#session;

    const res = await this.#fetch(this.url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`MCP request failed: ${res.status} ${res.statusText}`);
    }

    const session = res.headers.get("mcp-session-id");
    if (session) this.#session = session;

    if (!expectReply) return null;

    const frames = parseSseFrames(await res.text()) as JsonRpcResponse[];
    const reply = frames.find((f) => f.result !== undefined || f.error !== undefined);
    if (!reply) throw new Error("MCP response contained no result");
    if (reply.error) throw new Error(reply.error.message);
    return reply;
  }

  async connect(): Promise<void> {
    await this.#post(
      {
        jsonrpc: "2.0",
        id: ++this.#id,
        method: "initialize",
        params: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: "martinsundal.no", version: "1.0.0" },
        },
      },
      true,
    );

    // Notification: no id, no reply expected.
    await this.#post({ jsonrpc: "2.0", method: "notifications/initialized" }, false);
  }

  async listTools(): Promise<Tool[]> {
    const reply = await this.#post(
      { jsonrpc: "2.0", id: ++this.#id, method: "tools/list" },
      true,
    );
    return ((reply?.result as { tools?: Tool[] })?.tools ?? []) as Tool[];
  }

  async call(name: string, args: Record<string, unknown> = {}): Promise<CallResult> {
    const request = {
      jsonrpc: "2.0",
      id: ++this.#id,
      method: "tools/call",
      params: { name, arguments: args },
    };

    const reply = await this.#post(request, true);
    const content = (reply?.result as { content?: { type: string; text?: string }[] })
      ?.content;
    const text = (content ?? [])
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text)
      .join("\n");

    let data: unknown = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    return {
      request: JSON.stringify(request, null, 2),
      response: JSON.stringify(reply, null, 2),
      text,
      data,
    };
  }
}
