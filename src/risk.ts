import type { AnalyzeResult, InsidersResult, KitVerdict, LaunchToolResult, TokenStats } from "./types.js";

/**
 * A few facts about a token or a dev, in one shape whatever call they came from. Every field is
 * read from what the API returned; `null` means that call doesn't say (not "no").
 *
 * Percentages are 0 to 100 (the API's shares are 0 to 1).
 */
export interface RiskSummary {
  /** A launch bundle was found. From `analyze` (a token): `token.bundle`. From `insiders`: true when an insider bought in the launch block, else null. */
  bundled: boolean | null;
  /** Share of the supply the bundle holds now, 0 to 100. From `insiders`: what the bundled insiders hold (a floor). */
  bundleHeldPct: number | null;
  /** The creator sold some of the token (over the trades read). */
  devSold: boolean | null;
  /** Share of the supply the creator holds now, 0 to 100. */
  devHeldPct: number | null;
  /** The launch kit detected ("Proxima", "BlockX", "Launch kit"...), or null when none was found. */
  launchTool: string | null;
  /** Iris's risk score, 0 to 100 (`analyze` only). */
  riskScore: number | null;
  /** Short facts, ready to show. */
  notes: string[];
}

const KIT_NAMES: Record<Exclude<KitVerdict, "none">, string> = {
  proxima: "Proxima",
  blockx: "BlockX",
  launch_kit: "Launch kit",
  funded_like_kit: "Launch kit (funding only)",
};

/** A `RiskSummary` of what `analyze`, `insiders` or `launchTool` returned. */
export function riskSummary(result: AnalyzeResult | InsidersResult | LaunchToolResult): RiskSummary {
  const out: RiskSummary = {
    bundled: null,
    bundleHeldPct: null,
    devSold: null,
    devHeldPct: null,
    launchTool: null,
    riskScore: null,
    notes: [],
  };
  if (!result || typeof result !== "object") return out;
  if (isLaunchTool(result)) fromLaunchTool(result, out);
  else if (isInsiders(result)) fromInsiders(result, out);
  else if (isAnalyze(result)) fromAnalyze(result, out);
  else out.notes.push("Not a result of analyze, insiders or launchTool");
  return out;
}

function isLaunchTool(r: object): r is LaunchToolResult {
  return "verdict" in r && "tool_name" in r && "sells" in r;
}

function isInsiders(r: object): r is InsidersResult {
  return "insiders" in r && Array.isArray((r as InsidersResult).insiders) && "dev" in r;
}

function isAnalyze(r: object): r is AnalyzeResult {
  return "identity" in r && "risk" in r;
}

function fromLaunchTool(r: LaunchToolResult, out: RiskSummary): void {
  // The report names the kit it looked for even when it found nothing: only a verdict counts.
  if (r.verdict !== "none") {
    out.launchTool = r.tool_name;
    out.notes.push(`${r.verdict_name} (confidence ${pct(r.confidence)}%)`);
    for (const e of r.evidence ?? []) if (e.strength === "strong") out.notes.push(e.text);
  } else {
    out.notes.push(`No launch kit found (checked ${(r.checked ?? []).join(", ") || r.tool_name})`);
  }
  // Sells are the scanned wallet's: the dev's own sells of one token only when narrowed to it.
  if (r.mint && (r.sells?.seen ?? 0) > 0) out.devSold = true;
  if (!r.complete) out.notes.push("The scan was cut short: some history was not read");
  out.notes.push(...(r.notes ?? []));
}

function fromInsiders(r: InsidersResult, out: RiskSummary): void {
  const bundled = r.insiders.filter((i) => i.bundled);
  if (bundled.length > 0) {
    out.bundled = true;
    out.bundleHeldPct = pct(bundled.reduce((sum, i) => sum + (i.holds ?? 0), 0));
    out.notes.push(`${bundled.length} insider${bundled.length === 1 ? "" : "s"} bought in the launch block`);
  }
  const s = r.summary;
  if (s) {
    out.notes.push(
      `${s.insiders} wallet${s.insiders === 1 ? "" : "s"} linked to the dev by money, holding ${pct(s.held_share)}% of the supply`,
    );
  }
  if (!r.complete) out.notes.push(`The search was cut short: ${s?.checked ?? 0} of ${s?.candidates ?? 0} wallets checked`);
  out.notes.push(...(r.notes ?? []));
}

function fromAnalyze(r: AnalyzeResult, out: RiskSummary): void {
  out.riskScore = typeof r.risk?.score === "number" ? r.risk.score : null;
  const token = r.token;
  if (!token) {
    out.notes.push(`${r.identity?.type ?? "UNKNOWN"}, risk ${r.risk?.level ?? "unknown"}`);
    return;
  }
  fromToken(token, out);
  if (r.meta?.scope === "database") out.notes.push("Only labels were available: nothing was read on chain");
}

function fromToken(token: TokenStats, out: RiskSummary): void {
  // `bundle` is null when no bundle was found; that means "no" only when the launch was read.
  if (token.bundle && token.bundle.wallets > 0) {
    out.bundled = true;
    out.bundleHeldPct = pct(token.bundle.held_share);
    if (token.bundle.summary) out.notes.push(token.bundle.summary);
  } else if (token.launch) {
    out.bundled = false;
    out.bundleHeldPct = 0;
  }

  const creator = token.groups?.find((g) => g.key === "creator");
  const launch = token.launch;
  if (creator) {
    out.devHeldPct = pct(creator.held_share);
    out.devSold = creator.sold_share > 0 || (launch?.creator_sold ?? 0) > 0;
  } else if (launch) {
    out.devSold = launch.creator_sold > 0;
    const holder = launch.creator ? token.holders?.find((h) => h.address === launch.creator) : undefined;
    if (holder) out.devHeldPct = pct(holder.share);
  }

  const kit = token.launch_tool;
  if (kit && kit.verdict && kit.verdict !== "none") {
    out.launchTool = KIT_NAMES[kit.verdict] ?? kit.tool;
    if (kit.summary) out.notes.push(kit.summary);
  }
  for (const flag of token.flags ?? []) out.notes.push(flag.title);
}

/** A 0-to-1 share as a percentage, two decimals. */
function pct(share: number): number {
  return Math.round(share * 10000) / 100;
}
