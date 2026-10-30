import { IrisError } from "./errors.js";
import type {
  AnalyzeResult,
  Chain,
  ChainsResult,
  Credits,
  FollowResult,
  InsidersResult,
  KindResult,
  LaunchToolResult,
  RateLimit,
  StatusResult,
  TraceResult,
  TxResult,
  VictimsResult,
  XchainResult,
} from "./types.js";

export const DEFAULT_BASE_URL = "https://iriscan.app/api";
export const DEFAULT_TIMEOUT_MS = 120_000;
export const VERSION = "0.1.0";

export interface IrisOptions {
  /** `iris_live_…`. Defaults to the `IRIS_API_KEY` environment variable where there is one. */
  apiKey?: string;
  /** Default `https://iriscan.app/api`. */
  baseUrl?: string;
  /** Per request, default 120000 (the API stops work at 2 minutes). */
  timeoutMs?: number;
  /** A `fetch` to use instead of the global one. */
  fetch?: typeof fetch;
  /** Sent as `User-Agent` (server runtimes only; browsers set their own). */
  userAgent?: string;
  /** Retries of a 429 or 503 answer, waiting `Retry-After` (or 2 s, 4 s, 8 s...). Default 0. */
  maxRetries?: number;
  /** A retry that would wait longer than this is not made: the error is thrown. Default 60000. */
  maxRetryDelayMs?: number;
  /**
   * Passed to `fetch`. In a browser extension, `"include"` sends the site's `iris_device` cookie,
   * which gives a visitor without a key the website's free allowance.
   */
  credentials?: RequestCredentials;
}

/** Options every method takes. */
export interface RequestOptions {
  /** Cancels the call. */
  signal?: AbortSignal;
}

export interface AnalyzeOptions extends RequestOptions {
  /** Read from the address's form when left out (base58: solana, 0x: ethereum...). */
  chain?: Chain;
  /** Recent transactions to read, 1 to 10000. Default 1000; above 1000 costs 2 analyses. */
  depth?: number;
}

export interface InsidersOptions extends RequestOptions {
  /** "robinhood" or "bsc" for a 0x token; Solana otherwise. */
  chain?: Chain;
  /** Wallets to check besides the creator, 1 to 100. Default 50. */
  limit?: number;
  /** Funding hops to walk back from each wallet, 1 to 3. Default 2. */
  depth?: number;
}

export interface LaunchToolOptions extends RequestOptions {
  /** Narrow the tokens, sells, fee wallets and claims to this token. */
  mint?: string;
}

export interface FollowOptions extends RequestOptions {
  chain?: Chain;
  /** "native", or a token mint or contract. Left out: whatever value left first. */
  asset?: string;
  /** Follow what left the start wallet after this time (Unix seconds or a Date). */
  since?: number | Date;
  /** 1 to 50. Default 25. */
  maxHops?: number;
}

export interface TraceOptions extends RequestOptions {
  /** The mixer pool, exchange or swap-service wallet on the other side (on Bitcoin, the CoinJoin). */
  counterparty: string;
  /** The transfer's transaction. */
  signature: string;
  /** "out": the wallet deposited (traced forward). "in": it withdrew (traced back). */
  direction: "in" | "out";
  /** When the transfer happened (Unix seconds or a Date). */
  time: number | Date;
  /** Native coin moved (SOL, ETH, BNB, BTC, TRX), 0 if none. */
  sol: number;
  /** Stablecoins moved, in dollars, 0 if none. */
  usd: number;
  /** Seconds to search. */
  window?: number;
  chain?: Chain;
  /** 2: pair the outer legs of a route through two swap services (a weak lead). */
  hops?: number;
  /** "mixer" to force a Bitcoin counterparty to be read as a CoinJoin. */
  counterpartyKind?: string;
}

export interface TraceTransferOptions extends RequestOptions {
  /** Read from the wallet's address when left out (pass it for an EVM chain other than Ethereum). */
  chain?: Chain;
  /** Which party of the transaction to trace through, when it paid several. */
  counterparty?: string;
  direction?: "in" | "out";
}

export interface ChainOption extends RequestOptions {
  chain?: Chain;
}

type Json = Record<string, unknown>;

/**
 * The Iris API client.
 *
 * ```ts
 * const iris = new Iris({ apiKey: process.env.IRIS_API_KEY });
 * const report = await iris.analyze("<mint>");
 * ```
 */
export class Iris {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly maxRetryDelayMs: number;
  /** What the account had left after the last paid call, from `x-iris-credits`. */
  lastCredits: Credits | null = null;
  /** The key's call limit after the last call, when the server sent it. */
  lastRateLimit: RateLimit | null = null;

  readonly #apiKey: string | undefined;
  readonly #fetch: typeof fetch;
  readonly #userAgent: string | undefined;
  readonly #credentials: RequestCredentials | undefined;

  constructor(options: IrisOptions = {}) {
    this.#apiKey = options.apiKey ?? envKey();
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = Math.max(0, options.maxRetries ?? 0);
    this.maxRetryDelayMs = options.maxRetryDelayMs ?? 60_000;
    const f = options.fetch ?? (globalThis.fetch as typeof fetch | undefined);
    if (!f) throw new Error("No fetch available: pass one in IrisOptions.fetch (Node 18+ has one built in)");
    // Bound, so a global fetch isn't called with the client as `this`.
    this.#fetch = options.fetch ?? f.bind(globalThis);
    this.#userAgent = options.userAgent ?? (isServer() ? `iris-sdk-js/${VERSION}` : undefined);
    this.#credentials = options.credentials;
  }

  /** Whether calls carry an API key. */
  get hasApiKey(): boolean {
    return Boolean(this.#apiKey);
  }

  /** Who an address is, how risky, the evidence, its money in and out. A mint gets a token report. 1 analysis (2 above 1,000 transactions). */
  analyze(address: string, opts: AnalyzeOptions = {}): Promise<AnalyzeResult> {
    return this.#post("/analyze", { address, chain: opts.chain, depth: opts.depth }, opts);
  }

  /** A token's insiders: the wallets its creator is linked to by money. 2 analyses or 2 credits. */
  insiders(mint: string, opts: InsidersOptions = {}): Promise<InsidersResult> {
    return this.#post("/insiders", { mint, chain: opts.chain, limit: opts.limit, depth: opts.depth }, opts);
  }

  /** Whether a Solana wallet (or a mint's creator) launched or traded with a launch kit (Proxima, BlockX). Free. */
  launchTool(walletOrMint: string, opts: LaunchToolOptions = {}): Promise<LaunchToolResult> {
    return this.#post("/launch-tool", { wallet: walletOrMint, mint: opts.mint }, opts);
  }

  /** The main stream of money out of a wallet, hop by hop, to where it ends. 2 analyses or 2 credits. */
  follow(address: string, opts: FollowOptions = {}): Promise<FollowResult> {
    const body = {
      address,
      chain: opts.chain,
      asset: opts.asset,
      since: opts.since === undefined ? undefined : unix(opts.since),
      max_hops: opts.maxHops,
    };
    return this.#post("/follow", body, opts);
  }

  /** One transfer followed through a mixer, an exchange or a swap service. 1 trace, or 3 credits. */
  trace(wallet: string, opts: TraceOptions): Promise<TraceResult> {
    const body = {
      wallet,
      counterparty: opts.counterparty,
      signature: opts.signature,
      direction: opts.direction,
      time: unix(opts.time),
      sol: opts.sol,
      usd: opts.usd,
      window: opts.window,
      chain: opts.chain,
      hops: opts.hops,
      counterparty_kind: opts.counterpartyKind,
    };
    return this.#post("/trace", body, opts);
  }

  /**
   * `trace` from just a wallet and a transaction: Iris reads the transaction and finds the
   * wallet's transfer to or from a mixer, exchange or swap service (or `opts.counterparty`).
   * Costs what `trace` costs; a bad wallet or transaction is refused before any charge.
   */
  traceTransfer(wallet: string, tx: string, opts: TraceTransferOptions = {}): Promise<TraceResult> {
    const body = { wallet, signature: tx, chain: opts.chain, counterparty: opts.counterparty, direction: opts.direction };
    return this.#post("/trace/transfer", body, opts);
  }

  /** One transaction explained: its transfers, parties, programs and bridge. Free (with a key). */
  tx(hash: string, opts: ChainOption = {}): Promise<TxResult> {
    return this.#post("/tx", { hash, chain: opts.chain }, opts);
  }

  /** A drainer's victims and what each lost (Solana). 3 analyses or 3 credits. */
  victims(drainer: string, opts: RequestOptions = {}): Promise<VictimsResult> {
    return this.#post("/victims", { address: drainer }, opts);
  }

  /** Whether an address is a token or something else. Free, no key needed. */
  kind(address: string, opts: ChainOption = {}): Promise<KindResult> {
    return this.#post("/kind", { address, chain: opts.chain }, opts);
  }

  /** Which EVM chains a 0x address has used, with its nonce and balance on each. Free. */
  chains(address: string, opts: RequestOptions = {}): Promise<ChainsResult> {
    return this.#post("/chains", { address }, opts);
  }

  /**
   * The bridge transfers a transaction started or finished, both ends of each. Free (with a key).
   * `chain` defaults to solana for a base58 signature and ethereum for a 0x hash.
   */
  async xchainResolve(tx: string, opts: ChainOption = {}): Promise<XchainResult> {
    const chain = opts.chain ?? guessTxChain(tx);
    return this.#post("/xchain/resolve", { chain, tx }, opts);
  }

  /** A wallet's bridge transfers, sent and received. Free (with a key). `chain` defaults from the address. */
  xchainWallet(address: string, opts: ChainOption = {}): Promise<XchainResult> {
    const chain = opts.chain ?? (address.trim().toLowerCase().startsWith("0x") ? "ethereum" : "solana");
    return this.#post("/xchain/wallet", { chain, address }, opts);
  }

  /** The health of the API and what it relies on. Free, public. */
  status(opts: RequestOptions = {}): Promise<StatusResult> {
    return this.#request("GET", "/status", undefined, opts);
  }

  #post<T>(path: string, body: Json, opts: RequestOptions): Promise<T> {
    return this.#request("POST", path, dropUndefined(body), opts);
  }

  async #request<T>(method: "GET" | "POST", path: string, body: Json | undefined, opts: RequestOptions): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.#once<T>(method, path, body, opts);
      } catch (e) {
        if (!(e instanceof IrisError) || attempt >= this.maxRetries) throw e;
        if (e.status !== 429 && e.status !== 503) throw e;
        const delay = e.retryAfter !== undefined ? e.retryAfter * 1000 : 2000 * 2 ** attempt;
        if (delay > this.maxRetryDelayMs) throw e;
        await sleep(delay, opts.signal);
      }
    }
  }

  async #once<T>(method: string, path: string, body: Json | undefined, opts: RequestOptions): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (this.#apiKey) headers.Authorization = `Bearer ${this.#apiKey}`;
    if (this.#userAgent) headers["User-Agent"] = this.#userAgent;

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);
    const onAbort = () => controller.abort();
    if (opts.signal?.aborted) controller.abort();
    opts.signal?.addEventListener("abort", onAbort, { once: true });

    let response: Response;
    let text: string;
    try {
      const init: RequestInit = { method, headers, signal: controller.signal };
      if (body !== undefined) init.body = JSON.stringify(body);
      if (this.#credentials) init.credentials = this.#credentials;
      response = await this.#fetch(`${this.baseUrl}${path}`, init);
      text = await response.text();
    } catch (cause) {
      if (timedOut) {
        throw new IrisError(`Iris did not answer within ${this.timeoutMs} ms`, { status: 0, code: "client_timeout", cause });
      }
      if (opts.signal?.aborted) throw new IrisError("The call was aborted", { status: 0, code: "aborted", cause });
      const reason = cause instanceof Error ? cause.message : String(cause);
      throw new IrisError(`Could not reach Iris: ${reason}`, { status: 0, code: "network_error", cause });
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onAbort);
    }

    this.#readHeaders(response.headers);
    const parsed = parseJson(text);
    if (!response.ok) throw errorFrom(response, parsed, text);
    if (parsed === undefined) {
      throw new IrisError("Iris answered with something that is not JSON", {
        status: response.status,
        code: "invalid_response",
        body: text,
      });
    }
    return parsed as T;
  }

  #readHeaders(headers: Headers): void {
    const credits = headers.get("x-iris-credits");
    if (credits) {
      const parsed = parseJson(credits);
      if (parsed && typeof parsed === "object") this.lastCredits = parsed as Credits;
    }
    const limit = Number(headers.get("x-ratelimit-limit"));
    const remaining = Number(headers.get("x-ratelimit-remaining"));
    const reset = Number(headers.get("x-ratelimit-reset"));
    if (headers.has("x-ratelimit-limit") && [limit, remaining, reset].every(Number.isFinite)) {
      this.lastRateLimit = { limit, remaining, reset };
    }
  }
}

/** The error for a non-2xx answer: the API's `error` and `code`, and when to retry. */
function errorFrom(response: Response, parsed: unknown, text: string): IrisError {
  const json = parsed && typeof parsed === "object" ? (parsed as Json) : undefined;
  const message =
    typeof json?.error === "string" && json.error
      ? json.error
      : `Iris answered ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
  const code = typeof json?.code === "string" ? json.code : undefined;
  const retryAfter = retryAfterOf(response, json, code);
  return new IrisError(message, {
    status: response.status,
    ...(code !== undefined && { code }),
    ...(retryAfter !== undefined && { retryAfter }),
    body: parsed ?? text,
  });
}

/**
 * Seconds to wait: the `Retry-After` header, else the body's `reset_at` (some routes reach the
 * client without the header), else 10 for `busy`.
 */
function retryAfterOf(response: Response, json: Json | undefined, code: string | undefined): number | undefined {
  if (response.status !== 429 && response.status !== 503) return undefined;
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, seconds);
    const date = Date.parse(header);
    if (!Number.isNaN(date)) return Math.max(0, Math.ceil((date - Date.now()) / 1000));
  }
  if (typeof json?.reset_at === "string") {
    const reset = Date.parse(json.reset_at);
    if (!Number.isNaN(reset)) return Math.max(0, Math.ceil((reset - Date.now()) / 1000));
  }
  if (code === "busy") return 10;
  return undefined;
}

function parseJson(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function dropUndefined(body: Json): Json {
  return Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined && v !== null));
}

function unix(time: number | Date): number {
  return time instanceof Date ? Math.floor(time.getTime() / 1000) : time;
}

function guessTxChain(tx: string): Chain {
  const t = tx.trim();
  if (/^0x[0-9a-fA-F]{64}$/.test(t)) return "ethereum";
  // A Solana signature is 64 bytes: 86 to 88 base58 characters (fewer only with leading zeros).
  if (!/^[0-9a-fA-F]{64}$/.test(t) && /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(t)) return "solana";
  throw new IrisError("Pass opts.chain: a 64-hex-digit hash could be Bitcoin, Tron, Noble or dYdX", {
    status: 0,
    code: "unresolved",
  });
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new IrisError("The call was aborted", { status: 0, code: "aborted" }));
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new IrisError("The call was aborted", { status: 0, code: "aborted" }));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function envKey(): string | undefined {
  const g = globalThis as { process?: { env?: Record<string, string | undefined> } };
  try {
    return g.process?.env?.IRIS_API_KEY || undefined;
  } catch {
    return undefined;
  }
}

function isServer(): boolean {
  const g = globalThis as { process?: { versions?: { node?: string } }; Deno?: unknown; Bun?: unknown };
  return Boolean(g.process?.versions?.node || g.Deno || g.Bun);
}
