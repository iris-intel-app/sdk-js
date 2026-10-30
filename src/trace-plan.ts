import { IrisError } from "./errors.js";
import type { TraceOptions, TraceTransferOptions } from "./client.js";
import type { TxParty, TxResult } from "./types.js";

/** Coins counted as the chain's native coin in a trace's `sol` (wrapped ones included). */
const NATIVE = new Set(["SOL", "WSOL", "ETH", "WETH", "BNB", "WBNB", "BTC", "TRX", "WTRX"]);
/** Coins counted as dollars in a trace's `usd`. */
const STABLE = new Set(["USDC", "USDT", "USDC.E", "USDBC", "PYUSD", "USD1", "DAI", "USDS", "FDUSD"]);
/** Party categories a trace goes through: exchanges, mixers and privacy pools, swap services. */
const THROUGH = /exchange|cex|mixer|privacy|swap|instant/i;

export interface TracePlan {
  wallet: string;
  options: Omit<TraceOptions, "signal" | "window" | "hops">;
}

/**
 * The `/trace` request for `wallet`'s transfer in a transaction read with `/tx`: the counterparty
 * (the one asked for, else a known exchange, mixer or swap service, else the largest), the
 * direction, the time and the amounts moved between the two.
 */
export function planTrace(summary: TxResult, wallet: string, opts: TraceTransferOptions = {}): TracePlan {
  const evm = wallet.trim().toLowerCase().startsWith("0x");
  const norm = (a: string) => (evm ? a.trim().toLowerCase() : a.trim());
  const me = norm(wallet);
  const wanted = opts.counterparty ? norm(opts.counterparty) : undefined;
  if (summary.time === null || summary.time === undefined) {
    throw unresolved("The transaction's time could not be read, so it can't be traced");
  }

  // Each counterparty the wallet moved value with, by direction.
  type Leg = { other: string; direction: "in" | "out"; sol: number; usd: number; value: number };
  const legs = new Map<string, Leg>();
  for (const t of summary.transfers) {
    const from = norm(t.from);
    const to = norm(t.to);
    let direction: "in" | "out";
    let other: string;
    if (from === me && to !== me) [direction, other] = ["out", to];
    else if (to === me && from !== me) [direction, other] = ["in", from];
    else continue;
    if (wanted && other !== wanted) continue;
    if (opts.direction && opts.direction !== direction) continue;
    const asset = t.asset.toUpperCase();
    const key = `${direction}:${other}`;
    const leg = legs.get(key) ?? { other, direction, sol: 0, usd: 0, value: 0 };
    if (NATIVE.has(asset)) leg.sol += t.amount;
    else if (STABLE.has(asset)) leg.usd += t.amount;
    leg.value += t.usd ?? (STABLE.has(asset) ? t.amount : 0);
    legs.set(key, leg);
  }

  const base = { signature: summary.hash, time: summary.time, chain: summary.chain as TraceOptions["chain"] };
  const candidates = [...legs.values()].filter((l) => l.sol > 0 || l.usd > 0);
  if (candidates.length === 0) {
    // A Bitcoin wallet through a CoinJoin: the CoinJoin's txid is the counterparty.
    if (summary.chain === "bitcoin") {
      const sent = summary.transfers.some((t) => norm(t.from) === me);
      return {
        wallet: me,
        options: {
          ...base,
          counterparty: wanted ?? summary.hash,
          direction: opts.direction ?? (sent ? "out" : "in"),
          sol: 0,
          usd: 0,
        },
      };
    }
    throw unresolved(
      wanted
        ? `The transaction moved no coin or stablecoin between ${wallet} and ${opts.counterparty}`
        : `The transaction moved no coin or stablecoin to or from ${wallet}`,
    );
  }

  const parties = new Map<string, TxParty>(summary.parties.map((p) => [norm(p.address), p]));
  const through = (l: Leg) => {
    const p = parties.get(l.other);
    return Boolean(p && THROUGH.test(`${p.category ?? ""} ${p.label ?? ""}`));
  };
  const size = (l: Leg) => l.value || l.sol + l.usd;
  candidates.sort((a, b) => Number(through(b)) - Number(through(a)) || size(b) - size(a));
  const pick = candidates[0]!;
  return {
    wallet: me,
    options: {
      ...base,
      counterparty: pick.other,
      direction: pick.direction,
      sol: round(pick.sol),
      usd: round(pick.usd),
    },
  };
}

function round(n: number): number {
  return Math.round(n * 1e9) / 1e9;
}

function unresolved(message: string): IrisError {
  return new IrisError(message, { status: 0, code: "unresolved" });
}
