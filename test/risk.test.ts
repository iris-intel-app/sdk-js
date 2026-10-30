import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { riskSummary } from "../src/index.js";
import type { AnalyzeResult, InsidersResult, LaunchToolResult } from "../src/index.js";

const fixture = <T>(name: string): T =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8")) as T;

describe("riskSummary", () => {
  it("a launch-tool scan that found nothing names no tool, though the API names the one it checked", () => {
    const r = fixture<LaunchToolResult>("launch-tool-none");
    expect(r.tool_name).toBe("Proxima");
    expect(riskSummary(r)).toEqual({
      bundled: null,
      bundleHeldPct: null,
      devSold: null,
      devHeldPct: null,
      launchTool: null,
      riskScore: null,
      notes: ["No launch kit found (checked Proxima, BlockX)"],
    });
  });

  it("a launch-tool detection names the kit and its strong evidence", () => {
    const s = riskSummary(fixture<LaunchToolResult>("launch-tool-proxima"));
    expect(s.launchTool).toBe("Proxima");
    expect(s.devSold).toBe(true);
    expect(s.bundled).toBeNull();
    expect(s.riskScore).toBeNull();
    expect(s.notes).toContain("Proxima (confidence 99%)");
    expect(s.notes).toContain("1 fee of exactly 5% of a sell (0.0657 SOL on 1.3146 SOL received)");
    expect(s.notes.join(" ")).not.toContain("landing services");
  });

  it("a likely verdict counts too", () => {
    const r = { ...fixture<LaunchToolResult>("launch-tool-none"), verdict: "likely" as const, verdict_name: "Likely Proxima" };
    expect(riskSummary(r).launchTool).toBe("Proxima");
  });

  it("insiders: bundled insiders and what they hold", () => {
    const s = riskSummary(fixture<InsidersResult>("insiders"));
    expect(s).toMatchObject({ bundled: true, bundleHeldPct: 20, devSold: null, devHeldPct: null, launchTool: null, riskScore: null });
    expect(s.notes).toContain("2 wallets linked to the dev by money, holding 25.4% of the supply");
  });

  it("insiders without a bundled one can't rule a bundle out", () => {
    const r = fixture<InsidersResult>("insiders");
    r.insiders = r.insiders.filter((i) => !i.bundled);
    expect(riskSummary(r)).toMatchObject({ bundled: null, bundleHeldPct: null });
  });

  it("a token analysis: bundle, dev, kit and score", () => {
    const s = riskSummary(fixture<AnalyzeResult>("analyze-token"));
    expect(s).toMatchObject({
      bundled: true,
      bundleHeldPct: 31.25,
      devSold: true,
      devHeldPct: 3,
      launchTool: "Proxima",
      riskScore: 82,
    });
    expect(s.notes).toContain("A bundle holds 31% of the supply");
  });

  it("a token whose launch was read and had no bundle is not bundled", () => {
    const r = fixture<AnalyzeResult>("analyze-token");
    r.token!.bundle = null;
    r.token!.groups = [];
    r.token!.launch!.creator_sold = 0;
    r.token!.launch_tool!.verdict = "none";
    r.token!.holders = [{ address: r.token!.launch!.creator!, label: null, entity: null, amount: 1, share: 0.015, pool: false }];
    expect(riskSummary(r)).toMatchObject({ bundled: false, bundleHeldPct: 0, devSold: false, devHeldPct: 1.5, launchTool: null });
  });

  it("a token whose launch couldn't be read says nothing about a bundle", () => {
    const r = fixture<AnalyzeResult>("analyze-token");
    r.token!.bundle = null;
    r.token!.launch = null;
    r.token!.groups = [];
    expect(riskSummary(r)).toMatchObject({ bundled: null, bundleHeldPct: null, devSold: null, devHeldPct: null });
  });

  it("a wallet analysis gives only the score", () => {
    expect(riskSummary(fixture<AnalyzeResult>("analyze-wallet"))).toEqual({
      bundled: null,
      bundleHeldPct: null,
      devSold: null,
      devHeldPct: null,
      launchTool: null,
      riskScore: 10,
      notes: ["MEV_ARBITRAGE, risk LOW"],
    });
  });

  it("something else gives nulls", () => {
    expect(riskSummary({} as AnalyzeResult).notes).toEqual(["Not a result of analyze, insiders or launchTool"]);
  });
});
