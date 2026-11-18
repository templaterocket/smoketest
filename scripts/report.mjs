// npm run report — what the demand test measured, next to the hypothesis in site.config.ts.
//   npm run report                                  local database (wrangler dev)
//   npm run report -- --remote                      the deployed database
//   npm run report -- --remote --pricing-visitors 840
// --pricing-visitors is the number of unique /pricing/ visitors from your analytics; with it the
// report computes the intent rate (plan clicks / visitors) and compares it with the target.
// The report states numbers and targets. It does not say whether the idea is good — you decide.
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { loadSiteConfig, root } from "./lib/config.mjs";

const args = process.argv.slice(2);
const remote = args.includes("--remote");
const visitorsArg = args[args.indexOf("--pricing-visitors") + 1];
const visitors = args.includes("--pricing-visitors") ? Number(visitorsArg) : null;
if (visitors !== null && !(visitors > 0)) {
  console.error("--pricing-visitors needs a positive number (unique /pricing/ visitors from your analytics)");
  process.exit(1);
}

const site = await loadSiteConfig();
if (site.leads.provider.id !== "cloudflare") {
  console.log(`leads.provider is "${site.leads.provider.id}": signups live in that service, so read them there.\nThis report reads the template's own D1 database (provider "cloudflare").`);
  process.exit(0);
}

function query(sql) {
  const wrangler = join(root, "node_modules", ".bin", "wrangler");
  const out = execFileSync(wrangler, ["d1", "execute", "smoketest-leads", remote ? "--remote" : "--local", "--json", "--command", sql], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return JSON.parse(out)[0].results;
}

const pct = (n) => `${(n * 100).toFixed(1)}%`;
const row = (label, value, note = "") => console.log(`  ${label.padEnd(28)} ${String(value).padStart(8)}  ${note}`);

const byStatus = Object.fromEntries(query("SELECT status, COUNT(*) AS n FROM leads WHERE cta != 'contact' GROUP BY status").map((r) => [r.status, r.n]));
const confirmed = byStatus.confirmed ?? 0;
const pending = byStatus.pending ?? 0;
const unsubscribed = byStatus.unsubscribed ?? 0;
const byCta = query("SELECT cta, COUNT(*) AS n FROM leads WHERE status = 'confirmed' AND cta != 'contact' GROUP BY cta ORDER BY n DESC");
const sources = query("SELECT COALESCE(json_extract(utm, '$.utm_source'), CASE WHEN referred_by IS NOT NULL THEN '(referral)' ELSE '(direct)' END) AS source, COUNT(*) AS n FROM leads WHERE status = 'confirmed' AND cta != 'contact' GROUP BY source ORDER BY n DESC LIMIT 10");
const referred = query("SELECT COUNT(*) AS n FROM leads WHERE status = 'confirmed' AND referred_by IS NOT NULL")[0].n;
const intents = query("SELECT plan, COUNT(*) AS n FROM intents GROUP BY plan ORDER BY n DESC");
const intentTotal = intents.reduce((sum, r) => sum + r.n, 0);
const messages = query("SELECT COUNT(*) AS n FROM leads WHERE cta = 'contact'")[0].n;
const week = query("SELECT COUNT(*) AS n FROM leads WHERE status = 'confirmed' AND cta != 'contact' AND confirmed_at > datetime('now', '-7 days')")[0].n;

console.log(`\n${site.product.name} — demand report (${remote ? "remote" : "local"} database)\n`);
if (site.hypothesis.statement) console.log(`Hypothesis: ${site.hypothesis.statement}\n`);

console.log("Signups");
row("Confirmed", confirmed, `target ${site.hypothesis.signupTarget}: ${confirmed >= site.hypothesis.signupTarget ? "reached" : `${site.hypothesis.signupTarget - confirmed} to go`}`);
row("Confirmed in the last 7 days", week);
row("Waiting for confirmation", pending, confirmed + pending > 0 ? `${pct(confirmed / (confirmed + pending))} of signups confirmed` : "");
row("Unsubscribed", unsubscribed);
row("Joined through a referral", referred, confirmed > 0 ? pct(referred / confirmed) : "");
for (const r of byCta) row(`  via ${r.cta}`, r.n);
if (messages) row("Contact messages", messages);

console.log("\nWhere confirmed signups came from");
if (sources.length === 0) console.log("  (none yet)");
for (const r of sources) row(r.source, r.n, confirmed > 0 ? pct(r.n / confirmed) : "");

console.log(`\nPricing (${site.pricing.mode})`);
if (intents.length === 0) console.log("  No plan clicks yet.");
for (const r of intents) row(`Chose ${r.plan}`, r.n, intentTotal ? pct(r.n / intentTotal) : "");
if (visitors) {
  const rate = intentTotal / visitors;
  row("Intent rate", pct(rate), `${intentTotal} clicks / ${visitors} visitors; target ${pct(site.hypothesis.intentRateTarget)}: ${rate >= site.hypothesis.intentRateTarget ? "at or above" : "below"} target`);
} else if (site.pricing.mode === "fake-door") {
  console.log(`  Add --pricing-visitors N (unique /pricing/ visitors from analytics) to compare with the ${pct(site.hypothesis.intentRateTarget)} target.`);
}
console.log("\nThese are counts of interest, not a verdict. Small numbers swing a lot: read them with the traffic behind them.\n");
