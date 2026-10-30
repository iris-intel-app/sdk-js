export interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  credentials?: RequestCredentials;
}

type Reply = Response | Error | (() => Response | Promise<Response>);

/** A `fetch` that records each request and answers from a queue. */
export function mockFetch(...replies: Reply[]) {
  const calls: Call[] = [];
  const queue = [...replies];
  const fn = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers: Record<string, string> = {};
    new Headers(init.headers).forEach((v, k) => (headers[k] = v));
    calls.push({
      url: String(input),
      method: init.method ?? "GET",
      headers,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
      ...(init.credentials && { credentials: init.credentials }),
    });
    const next = queue.shift();
    if (!next) throw new Error("mockFetch: no reply queued");
    if (next instanceof Error) throw next;
    if (typeof next === "function") {
      // Honour aborts, like a real fetch.
      return await new Promise<Response>((resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        Promise.resolve(next()).then(resolve, reject);
      });
    }
    return next;
  }) as typeof fetch;
  return { fetch: fn, calls };
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}
