# Iris SDK for TypeScript and JavaScript

**Rug checks, insider maps and fund traces from your own code.** The official client for the [Iris](https://iriscan.app) API: analyze any wallet or token, find the wallets a token's dev is linked to, catch launch kits like Proxima and BlockX, and follow stolen funds through mixers, exchanges and bridges.

```bash
npm install @iriscan/sdk
```

Zero dependencies. Uses the global `fetch`: Node 18+, Deno, Bun, browsers and browser extensions. ESM and CommonJS, fully typed.

## Quickstart

```ts
import { Iris, riskSummary } from "@iriscan/sdk";

const iris = new Iris({ apiKey: process.env.IRIS_API_KEY });

const report = await iris.analyze("<token mint>");          // 1 analysis
console.log(report.risk.level, report.risk.score);           // "HIGH" 82

const scan = await iris.launchTool("<dev wallet or mint>");  // free
if (scan.verdict !== "none") console.log(`Made with ${scan.tool_name}`);

console.log(riskSummary(report)); // { bundled, bundleHeldPct, devSold, devHeldPct, launchTool, riskScore, notes }
```

## Get an API key

Create one in [your account](https://iriscan.app/account) (Account, then API). The client reads `IRIS_API_KEY` from the environment when you don't pass `apiKey`. Keep the key on a server: it spends your account's credits.

The free tier gives 10 API calls a day. Plans and credit packs: [iriscan.app/pricing](https://iriscan.app/pricing).

## Endpoints

| Method | Route | What it returns | Cost |
| --- | --- | --- | --- |
| `analyze(address, { chain, depth })` | `POST /analyze` | Identity, risk score, labels, behaviors, flows; a full token report for a mint (launch, bundle, holders, dev, launch kit) | 1 analysis, 2 above 1,000 transactions (a wallet of 25 transactions or fewer is free) |
| `insiders(mint, { chain, limit, depth })` | `POST /insiders` | The wallets the token's creator is linked to by money, with the payments that link them | 2 analyses, or 2 credits |
| `launchTool(walletOrMint, { mint })` | `POST /launch-tool` | Whether a wallet (or a mint's creator) used Proxima or BlockX, with fee wallets, claims and the funding tree | Free: 10 a minute, 20 a day on the free tier |
| `follow(address, { chain, asset, since, maxHops })` | `POST /follow` | The main stream of money out of a wallet, hop by hop, to an exchange, bridge, mixer or rest | 2 analyses, or 2 credits |
| `trace(wallet, { counterparty, signature, direction, time, sol, usd, ... })` | `POST /trace` | The likely wallets on the other side of a mixer, exchange or swap service | 1 trace, or 3 credits |
| `traceTransfer(wallet, tx, { chain, counterparty, direction })` | `POST /tx`, then `POST /trace` | `trace` from just a wallet and a transaction: the transfer is read for you | As `trace` |
| `tx(hash, { chain })` | `POST /tx` | One transaction explained: transfers, parties, programs, bridge | Free: 60 a minute, 100 a day on the free tier |
| `victims(drainer)` | `POST /victims` | Every wallet a drainer took funds from, and what each lost | 3 analyses, or 3 credits |
| `kind(address, { chain })` | `POST /kind` | `"token"` or `"other"` | Free, no key needed |
| `chains(address)` | `POST /chains` | Which EVM chains a 0x address used, with its nonce and balance | Free: 20 a minute, 50 a day on the free tier |
| `xchainResolve(tx, { chain })` | `POST /xchain/resolve` | The bridge transfers a transaction started or finished, both ends | Free: 30 a minute (shared with `xchainWallet`) |
| `xchainWallet(address, { chain })` | `POST /xchain/wallet` | A wallet's bridge transfers, sent and received | Free, as above |
| `status()` | `GET /status` | The health of the API and its dependencies | Free, public |

Every call made with a key also counts toward the key's call limit (10 a day on the free tier, a number per 10 minutes on a plan). A call that fails is never charged.

Chains: `solana`, `ethereum`, `base`, `arbitrum`, `robinhood`, `bsc`, `dydx`, `noble`, `bitcoin`, `tron`. Leave `chain` out and Iris reads it from the address. Each route accepts the chains in its [docs](https://iriscan.app/developers).

Every method also takes `{ signal }` to cancel it.

## The risk summary

`riskSummary(result)` reduces an `analyze`, `insiders` or `launchTool` result to one shape:

```ts
{
  bundled: boolean | null;       // a launch bundle was found
  bundleHeldPct: number | null;  // 0 to 100: what the bundle holds now
  devSold: boolean | null;       // the creator sold some
  devHeldPct: number | null;     // 0 to 100: what the creator holds now
  launchTool: string | null;     // "Proxima", "BlockX", "Launch kit"... only when one was detected
  riskScore: number | null;      // 0 to 100, from analyze
  notes: string[];               // short facts, ready to show
}
```

Every field comes from what the API returned. `null` means "this call doesn't say", never "no". A launch-tool scan always names the kit it checked (`tool_name`), so `launchTool` is set only when `verdict` is not `"none"`.

## Errors

Every failure throws an `IrisError`:

```ts
import { Iris, IrisError } from "@iriscan/sdk";

try {
  await iris.insiders(mint);
} catch (e) {
  if (e instanceof IrisError) {
    e.status;     // 400, 401, 402, 429, 503, 504... or 0 when no answer came back
    e.code;       // "login", "invalid_key", "no_credits", "quota_exceeded", "daily_limit", "rate_limited", "busy", "timeout"...
    e.retryAfter; // seconds, on 429 and 503 when known
    e.body;       // the API's JSON body
    e.message;    // the API's message, ready to show
  }
}
```

| Status | Code | Means |
| --- | --- | --- |
| 400 | | The request is wrong: fix it, don't retry |
| 401 | `login`, `invalid_key` | No key, or a revoked one |
| 402 | `no_credits` | Nothing left on the plan or in packs |
| 429 | `quota_exceeded`, `daily_limit`, `rate_limited` | Over a limit: wait `retryAfter` |
| 503 | `busy`, `unavailable` | At capacity, or a feature is off |
| 504 | `timeout` | The work took over 2 minutes |
| 0 | `network_error`, `client_timeout`, `aborted`, `unresolved` | Raised by the client |

Retries are off by default. `new Iris({ maxRetries: 2 })` retries a 429 or 503 after its `Retry-After` (or 2 s, 4 s, 8 s), unless the wait is longer than `maxRetryDelayMs` (60 s by default): a daily limit is thrown at once.

After a paid call, `iris.lastCredits` holds what the account has left.

## Options

```ts
new Iris({
  apiKey: "iris_live_…",                // default: process.env.IRIS_API_KEY
  baseUrl: "https://iriscan.app/api",   // default
  timeoutMs: 120_000,                   // default
  maxRetries: 0,                        // default
  maxRetryDelayMs: 60_000,              // default
  fetch,                                // a custom fetch
  userAgent: "my-bot/1.0",              // server runtimes only
  credentials: "include",               // passed to fetch
});
```

Without a key, `status` and `kind` work as they are. The website's visitors also get a free allowance on `analyze`, `launchTool` and `chains`, tied to the `iris_device` cookie that iriscan.app sets: a browser extension with access to iriscan.app can use it by passing `credentials: "include"`. A server without a key gets `401` on those routes.

## Examples

- [`examples/check-token.mjs`](examples/check-token.mjs): analyze a token and print its risk summary.
- [`examples/check-launch-tool.mjs`](examples/check-launch-tool.mjs): check a dev wallet for Proxima or BlockX.

## Development

```bash
npm install
npm test             # unit tests, mocked HTTP
npm run typecheck
npm run build        # dist/: ESM, CJS and .d.ts
IRIS_LIVE=1 npm test # adds a smoke test of the free endpoints against iriscan.app
```

## Links

- API docs: [iriscan.app/developers](https://iriscan.app/developers)
- Pricing: [iriscan.app/pricing](https://iriscan.app/pricing)
- API keys: [iriscan.app/account](https://iriscan.app/account)
- Status: [iriscan.app/status](https://iriscan.app/status)

## License

MIT
