// Calls the real API, free endpoints only. Skipped unless IRIS_LIVE=1.
// With IRIS_API_KEY set, /launch-tool and /tx must answer; without one, they must refuse cleanly
// with a 401 (they need a key, or the website's visitor cookie).
import { describe, expect, it } from "vitest";
import { Iris, IrisError } from "../src/index.js";

const live = process.env.IRIS_LIVE === "1";
const WALLET = "2zy2NEyvzXfPkdFesbisZViTyz6oCWERFEvSD9PfoRg1";
// The first Ethereum transaction that moved ETH (block 46147).
const ETH_TX = "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060";

describe.skipIf(!live)("live (free endpoints)", () => {
  const iris = new Iris({ baseUrl: process.env.IRIS_BASE_URL, maxRetries: 1 });

  it("status", async () => {
    const s = await iris.status();
    expect(["operational", "degraded", "outage", "unknown"]).toContain(s.status);
    expect(Array.isArray(s.components)).toBe(true);
  });

  it("kind", async () => {
    const k = await iris.kind(WALLET);
    expect(["token", "other"]).toContain(k.kind);
  });

  it("launch-tool", async () => {
    if (iris.hasApiKey) {
      const r = await iris.launchTool(WALLET);
      expect(r.wallet).toBe(WALLET);
      expect(["tool", "likely", "none"]).toContain(r.verdict);
    } else {
      const e = await iris.launchTool(WALLET).catch((e: unknown) => e);
      expect(e).toBeInstanceOf(IrisError);
      expect(e).toMatchObject({ status: 401, code: "login" });
    }
  }, 150_000);

  it("tx", async () => {
    if (iris.hasApiKey) {
      const t = await iris.tx(ETH_TX, { chain: "ethereum" });
      expect(t.hash.toLowerCase()).toBe(ETH_TX);
      expect(t.chain).toBe("ethereum");
    } else {
      const e = await iris.tx(ETH_TX, { chain: "ethereum" }).catch((e: unknown) => e);
      expect(e).toBeInstanceOf(IrisError);
      expect(e).toMatchObject({ status: 401, code: "login" });
    }
  }, 90_000);
});
