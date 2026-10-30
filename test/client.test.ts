import { afterEach, describe, expect, it } from "vitest";
import { Iris, IrisError } from "../src/index.js";
import { json, mockFetch } from "./helpers.js";

const BASE = "https://iriscan.app/api";
const KEY = "iris_live_test_0000";
const SOL = "2zy2NEyvzXfPkdFesbisZViTyz6oCWERFEvSD9PfoRg1";
const MINT = "Bo9jh3wsmcC2AjakLWzNmKJ3SgtZmXEcSaW7L2FAvUsU";
const SIG = "5".repeat(88);

function client(...replies: Parameters<typeof mockFetch>) {
  const mock = mockFetch(...replies);
  const iris = new Iris({ apiKey: KEY, fetch: mock.fetch });
  return { iris, calls: mock.calls };
}

describe("requests", () => {
  it("analyze posts the address, chain and depth with the key", async () => {
    const { iris, calls } = client(json({ address: SOL, risk: { score: 10 } }));
    const res = await iris.analyze(SOL, { chain: "solana", depth: 5000 });
    expect(res.address).toBe(SOL);
    expect(calls[0]).toMatchObject({
      url: `${BASE}/analyze`,
      method: "POST",
      body: { address: SOL, chain: "solana", depth: 5000 },
    });
    expect(calls[0]!.headers.authorization).toBe(`Bearer ${KEY}`);
    expect(calls[0]!.headers["content-type"]).toBe("application/json");
    expect(calls[0]!.headers["user-agent"]).toMatch(/^iris-sdk-js\//);
  });

  it("leaves out options that were not given", async () => {
    const { iris, calls } = client(json({}));
    await iris.analyze(SOL);
    expect(calls[0]!.body).toEqual({ address: SOL });
  });

  it("insiders", async () => {
    const { iris, calls } = client(json({ mint: MINT, insiders: [] }));
    await iris.insiders(MINT, { limit: 20, depth: 3, chain: "solana" });
    expect(calls[0]).toMatchObject({ url: `${BASE}/insiders`, body: { mint: MINT, limit: 20, depth: 3, chain: "solana" } });
  });

  it("launchTool sends the wallet (or mint) and the narrowing mint", async () => {
    const { iris, calls } = client(json({ verdict: "none" }));
    await iris.launchTool(SOL, { mint: MINT });
    expect(calls[0]).toMatchObject({ url: `${BASE}/launch-tool`, body: { wallet: SOL, mint: MINT } });
  });

  it("follow maps maxHops and a Date since", async () => {
    const { iris, calls } = client(json({ hops: [] }));
    await iris.follow(SOL, { asset: "native", since: new Date("2026-01-01T00:00:00Z"), maxHops: 10, chain: "solana" });
    expect(calls[0]).toMatchObject({
      url: `${BASE}/follow`,
      body: { address: SOL, asset: "native", since: 1767225600, max_hops: 10, chain: "solana" },
    });
  });

  it("trace sends the whole transfer", async () => {
    const { iris, calls } = client(json({ candidates: [] }));
    await iris.trace(SOL, {
      counterparty: MINT,
      signature: SIG,
      direction: "out",
      time: 1767225600,
      sol: 254.0226,
      usd: 0,
      window: 3600,
      hops: 2,
      counterpartyKind: "mixer",
    });
    expect(calls[0]).toMatchObject({
      url: `${BASE}/trace`,
      body: {
        wallet: SOL,
        counterparty: MINT,
        signature: SIG,
        direction: "out",
        time: 1767225600,
        sol: 254.0226,
        usd: 0,
        window: 3600,
        hops: 2,
        counterparty_kind: "mixer",
      },
    });
  });

  it("tx", async () => {
    const { iris, calls } = client(json({ hash: SIG }));
    await iris.tx(SIG, { chain: "solana" });
    expect(calls[0]).toMatchObject({ url: `${BASE}/tx`, body: { hash: SIG, chain: "solana" } });
  });

  it("victims", async () => {
    const { iris, calls } = client(json({ victims: 3 }));
    expect((await iris.victims(SOL)).victims).toBe(3);
    expect(calls[0]).toMatchObject({ url: `${BASE}/victims`, body: { address: SOL } });
  });

  it("kind", async () => {
    const { iris, calls } = client(json({ kind: "token" }));
    expect((await iris.kind(MINT)).kind).toBe("token");
    expect(calls[0]).toMatchObject({ url: `${BASE}/kind`, body: { address: MINT } });
  });

  it("chains", async () => {
    const addr = "0x" + "ab".repeat(20);
    const { iris, calls } = client(json({ address: addr, chains: [] }));
    await iris.chains(addr);
    expect(calls[0]).toMatchObject({ url: `${BASE}/chains`, body: { address: addr } });
  });

  it("xchainResolve guesses the chain from the hash, or takes it", async () => {
    const hash = "0x" + "a".repeat(64);
    const { iris, calls } = client(json({ links: [], warnings: [] }), json({ links: [], warnings: [] }));
    await iris.xchainResolve(hash);
    await iris.xchainResolve("b".repeat(64), { chain: "bitcoin" });
    expect(calls[0]).toMatchObject({ url: `${BASE}/xchain/resolve`, body: { chain: "ethereum", tx: hash } });
    expect(calls[1]!.body).toEqual({ chain: "bitcoin", tx: "b".repeat(64) });
  });

  it("xchainResolve asks for a chain when the hash can't tell", async () => {
    const { iris, calls } = client();
    await expect(iris.xchainResolve("c".repeat(64))).rejects.toMatchObject({ code: "unresolved", status: 0 });
    expect(calls).toHaveLength(0);
  });

  it("xchainWallet", async () => {
    const { iris, calls } = client(json({ links: [] }), json({ links: [] }));
    await iris.xchainWallet(SOL);
    await iris.xchainWallet("0x" + "cd".repeat(20), { chain: "base" });
    expect(calls[0]).toMatchObject({ url: `${BASE}/xchain/wallet`, body: { chain: "solana", address: SOL } });
    expect(calls[1]!.body).toMatchObject({ chain: "base" });
  });

  it("status is a GET without a body", async () => {
    const { iris, calls } = client(json({ status: "operational" }));
    expect((await iris.status()).status).toBe("operational");
    expect(calls[0]).toMatchObject({ url: `${BASE}/status`, method: "GET", body: undefined });
    expect(calls[0]!.headers["content-type"]).toBeUndefined();
  });

  it("traceTransfer reads the transaction, then traces the transfer to the exchange", async () => {
    const exchange = "ExchangeHotWa11et1111111111111111111111111";
    const other = "SomeoneE1se11111111111111111111111111111111";
    const summary = {
      chain: "solana",
      hash: SIG,
      time: 1767225600,
      transfers: [
        { from: SOL, to: other, amount: 50, asset: "SOL", mint: null, usd: 7500 },
        { from: SOL, to: exchange, amount: 10, asset: "SOL", mint: null, usd: 1500 },
        { from: SOL, to: exchange, amount: 200, asset: "USDC", mint: "EPj", usd: 200 },
      ],
      parties: [
        { address: exchange, chain: "solana", kind: "wallet", label: "Binance deposit", category: "exchange", entity: "Binance", role: "receiver", analyzable: false },
        { address: other, chain: "solana", kind: "wallet", label: null, category: null, entity: null, role: "receiver", analyzable: true },
      ],
    };
    const { iris, calls } = client(json(summary), json({ candidates: [] }));
    await iris.traceTransfer(SOL, SIG, { window: 3600 });
    expect(calls[0]).toMatchObject({ url: `${BASE}/tx`, body: { hash: SIG } });
    expect(calls[1]).toMatchObject({
      url: `${BASE}/trace`,
      body: { wallet: SOL, counterparty: exchange, signature: SIG, direction: "out", time: 1767225600, sol: 10, usd: 200, chain: "solana", window: 3600 },
    });
  });

  it("traceTransfer fails cleanly when the wallet moved nothing", async () => {
    const { iris } = client(json({ chain: "solana", hash: SIG, time: 1, transfers: [], parties: [] }));
    await expect(iris.traceTransfer(SOL, SIG)).rejects.toMatchObject({ code: "unresolved", status: 0 });
  });
});

describe("auth", () => {
  const saved = process.env.IRIS_API_KEY;
  afterEach(() => {
    if (saved === undefined) delete process.env.IRIS_API_KEY;
    else process.env.IRIS_API_KEY = saved;
  });

  it("sends no Authorization without a key", async () => {
    delete process.env.IRIS_API_KEY;
    const mock = mockFetch(json({ kind: "other" }));
    const iris = new Iris({ fetch: mock.fetch });
    expect(iris.hasApiKey).toBe(false);
    await iris.kind(SOL);
    expect(mock.calls[0]!.headers.authorization).toBeUndefined();
  });

  it("reads IRIS_API_KEY from the environment", async () => {
    process.env.IRIS_API_KEY = KEY;
    const mock = mockFetch(json({}));
    await new Iris({ fetch: mock.fetch }).status();
    expect(mock.calls[0]!.headers.authorization).toBe(`Bearer ${KEY}`);
  });

  it("passes credentials and a custom base URL and user agent", async () => {
    const mock = mockFetch(json({}));
    const iris = new Iris({ fetch: mock.fetch, baseUrl: "http://localhost:3000/api/", credentials: "include", userAgent: "guard/1" });
    await iris.status();
    expect(mock.calls[0]).toMatchObject({ url: "http://localhost:3000/api/status", credentials: "include" });
    expect(mock.calls[0]!.headers["user-agent"]).toBe("guard/1");
  });
});

describe("errors", () => {
  async function failure(reply: Response, iris?: Iris): Promise<IrisError> {
    const c = iris ?? client(reply).iris;
    try {
      await c.analyze(SOL);
    } catch (e) {
      expect(e).toBeInstanceOf(IrisError);
      expect(e).toBeInstanceOf(Error);
      return e as IrisError;
    }
    throw new Error("expected a failure");
  }

  it("a 400 carries the API's message", async () => {
    const e = await failure(json({ error: "Not a valid Solana address" }, 400));
    expect(e).toMatchObject({ status: 400, message: "Not a valid Solana address", code: undefined, retryAfter: undefined });
    expect(e.body).toEqual({ error: "Not a valid Solana address" });
    expect(e.retryable).toBe(false);
  });

  it("401 login and invalid_key", async () => {
    expect(await failure(json({ error: "Log in", code: "login" }, 401))).toMatchObject({ status: 401, code: "login" });
    expect(await failure(json({ error: "bad", code: "invalid_key" }, 401))).toMatchObject({ code: "invalid_key" });
  });

  it("402 no_credits", async () => {
    expect(await failure(json({ error: "No analyses left", code: "no_credits" }, 402))).toMatchObject({ status: 402, code: "no_credits" });
  });

  it("429 takes Retry-After from the header", async () => {
    const e = await failure(json({ error: "slow down", code: "quota_exceeded" }, 429, { "retry-after": "240" }));
    expect(e).toMatchObject({ status: 429, code: "quota_exceeded", retryAfter: 240 });
    expect(e.retryable).toBe(true);
  });

  it("429 without the header falls back to the body's reset_at", async () => {
    const reset = new Date(Date.now() + 90_000).toISOString();
    const e = await failure(json({ error: "used up", code: "daily_limit", reset_at: reset }, 429));
    expect(e.code).toBe("daily_limit");
    expect(e.retryAfter).toBeGreaterThanOrEqual(88);
    expect(e.retryAfter).toBeLessThanOrEqual(91);
  });

  it("503 busy without a header waits 10 s", async () => {
    expect(await failure(json({ error: "busy", code: "busy" }, 503))).toMatchObject({ status: 503, code: "busy", retryAfter: 10 });
  });

  it("504 timeout", async () => {
    expect(await failure(json({ error: "too long", code: "timeout" }, 504))).toMatchObject({ status: 504, code: "timeout", retryAfter: undefined });
  });

  it("a non-JSON error page still makes an IrisError", async () => {
    const e = await failure(new Response("<html>Bad gateway</html>", { status: 502, statusText: "Bad Gateway" }));
    expect(e).toMatchObject({ status: 502, message: "Iris answered 502 Bad Gateway", body: "<html>Bad gateway</html>" });
  });

  it("a 200 that is not JSON is invalid_response", async () => {
    const e = await failure(new Response("hello", { status: 200 }));
    expect(e).toMatchObject({ status: 200, code: "invalid_response" });
  });

  it("network failures are status 0", async () => {
    const mock = mockFetch(new TypeError("fetch failed"));
    const e = await failure(new Response(), new Iris({ fetch: mock.fetch }));
    expect(e).toMatchObject({ status: 0, code: "network_error" });
    expect(e.message).toContain("fetch failed");
  });

  it("times out", async () => {
    const mock = mockFetch(() => new Promise<Response>(() => {}));
    const e = await failure(new Response(), new Iris({ fetch: mock.fetch, timeoutMs: 20 }));
    expect(e).toMatchObject({ status: 0, code: "client_timeout" });
  });

  it("can be aborted", async () => {
    const mock = mockFetch(() => new Promise<Response>(() => {}));
    const iris = new Iris({ fetch: mock.fetch });
    const controller = new AbortController();
    const pending = iris.status({ signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "aborted" });
  });
});

describe("retries", () => {
  it("are off by default", async () => {
    const mock = mockFetch(json({ code: "busy" }, 503, { "retry-after": "0" }), json({ ok: 1 }));
    await expect(new Iris({ fetch: mock.fetch }).status()).rejects.toMatchObject({ status: 503 });
    expect(mock.calls).toHaveLength(1);
  });

  it("retry 429 and 503 up to maxRetries", async () => {
    const mock = mockFetch(
      json({ code: "busy" }, 503, { "retry-after": "0" }),
      json({ code: "rate_limited" }, 429, { "retry-after": "0" }),
      json({ status: "operational" }),
    );
    const res = await new Iris({ fetch: mock.fetch, maxRetries: 2 }).status();
    expect(res.status).toBe("operational");
    expect(mock.calls).toHaveLength(3);
  });

  it("give up after maxRetries", async () => {
    const mock = mockFetch(json({ code: "busy" }, 503, { "retry-after": "0" }), json({ code: "busy" }, 503, { "retry-after": "0" }));
    await expect(new Iris({ fetch: mock.fetch, maxRetries: 1 }).status()).rejects.toMatchObject({ status: 503 });
    expect(mock.calls).toHaveLength(2);
  });

  it("don't wait longer than maxRetryDelayMs", async () => {
    const mock = mockFetch(json({ code: "daily_limit" }, 429, { "retry-after": "3600" }));
    await expect(new Iris({ fetch: mock.fetch, maxRetries: 3 }).status()).rejects.toMatchObject({ retryAfter: 3600 });
    expect(mock.calls).toHaveLength(1);
  });

  it("never retry other errors", async () => {
    const mock = mockFetch(json({ error: "bad" }, 400), json({}));
    await expect(new Iris({ fetch: mock.fetch, maxRetries: 3 }).status()).rejects.toMatchObject({ status: 400 });
    expect(mock.calls).toHaveLength(1);
  });
});

describe("headers", () => {
  it("keeps the credits and rate limit the server sent", async () => {
    const credits = { plan: "api_pro", analyses_left: 9412, traces_left: 488, pack_credits: 0 };
    const { iris } = client(
      json({}, 200, {
        "x-iris-credits": JSON.stringify(credits),
        "x-ratelimit-limit": "500",
        "x-ratelimit-remaining": "499",
        "x-ratelimit-reset": "1793360989",
      }),
    );
    await iris.analyze(SOL);
    expect(iris.lastCredits).toEqual(credits);
    expect(iris.lastRateLimit).toEqual({ limit: 500, remaining: 499, reset: 1793360989 });
  });
});
