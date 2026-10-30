// Was this wallet (or this token's dev) using a launch kit such as Proxima or BlockX?
//   IRIS_API_KEY=iris_live_… node examples/check-launch-tool.mjs <wallet or mint>
// Free (10 a minute; 20 a day on the free tier).
import { Iris, IrisError, riskSummary } from "@iriscan/sdk";

const target = process.argv[2] ?? "2zy2NEyvzXfPkdFesbisZViTyz6oCWERFEvSD9PfoRg1";
const iris = new Iris();

try {
  const scan = await iris.launchTool(target);
  // The API always names the kit it checked: only the verdict says whether one was found.
  if (scan.verdict === "none") {
    console.log(`${scan.wallet}: no launch kit found (checked ${scan.checked.join(", ")})`);
  } else {
    console.log(`${scan.wallet}: ${scan.verdict_name}, confidence ${Math.round(scan.confidence * 100)}%`);
    for (const e of scan.evidence) console.log(`- [${e.strength}] ${e.text}`);
    console.log(`fee wallets: ${scan.fee_wallets.map((f) => f.address).join(", ") || "none"}`);
  }
  console.log("summary:", riskSummary(scan));
} catch (e) {
  if (e instanceof IrisError && e.status === 401) {
    console.error("This route needs an API key: get one at https://iriscan.app/account");
    process.exit(2);
  }
  if (e instanceof IrisError && e.status === 429) {
    console.error(`Rate limited (${e.code}); try again in ${e.retryAfter ?? "a few"} seconds`);
    process.exit(2);
  }
  throw e;
}
