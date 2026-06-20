/**
 * SSE-over-fetch helper.
 *
 * EventSource only supports GET and cannot send multipart bodies or auth
 * headers, so we POST with `fetch` and parse the `text/event-stream` body from
 * the `ReadableStream` ourselves. Each `data: {...}` line is parsed as JSON and
 * handed to `onEvent`.
 */

const API_BASE = "http://localhost:8000";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("scope_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type SSEvent = {
  stage: string;
  status: "running" | "done" | "error";
  message?: string;
  result?: unknown;
  ad_creatives?: string[];
  flags?: Record<string, boolean>;
};

/**
 * POST `body` to `path` and invoke `onEvent` for every streamed SSE message.
 * `body` may be a `FormData` (multipart upload) or a plain object (JSON).
 */
export async function streamPost(
  path: string,
  body: FormData | Record<string, unknown>,
  onEvent: (event: SSEvent) => void,
): Promise<void> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      ...(isForm ? {} : { "Content-Type": "application/json" }),
    },
    body: isForm ? (body as FormData) : JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `Stream error ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // SSE frames are separated by a blank line ("\n\n").
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of frame.split("\n")) {
        const trimmed = line.startsWith("data:") ? line.slice(5).trim() : "";
        if (!trimmed) continue;
        try {
          onEvent(JSON.parse(trimmed) as SSEvent);
        } catch {
          /* ignore malformed frame */
        }
      }
    }
  }
}
