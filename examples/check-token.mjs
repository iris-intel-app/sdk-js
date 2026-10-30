// Analyze a token and print what matters before buying it.
//   IRIS_API_KEY=iris_live_… node examples/check-token.mjs <mint>
// Costs 1 analysis. Run `npm run build` first when running it from this repo.
import { Iris, IrisError, riskSummary } from "@iriscan/sdk";

const mint = process.argv[2];
if (!mint) {
  console.error("usage: node examples/check-token.mjs <mint>");
  process.exit(1);
}

const iris = new Iris({ maxRetries: 2 }); // reads IRIS_API_KEY

try {
  const report = await iris.analyze(mint);
  const token = report.token;
  console.log(`${token?.name ?? report.address} (${token?.symbol ?? "?"}): ${report.identity.type}, risk ${report.risk.level} (${report.risk.score}/100)`);

  const s = riskSummary(report);
  console.log(`bundled: ${s.bundled}  bundle holds: ${s.bundleHeldPct ?? "?"}%`);
  console.log(`dev sold: ${s.devSold}  dev holds: ${s.devHeldPct ?? "?"}%`);
  console.log(`launch kit: ${s.launchTool ?? "none found"}`);
  for (const note of s.notes) console.log(`- ${note}`);
} catch (e) {
  if (e instanceof IrisError) {
    console.error(`Iris refused (${e.status}${e.code ? ` ${e.code}` : ""}): ${e.message}`);
    process.exit(2);
  }
  throw e;
}
