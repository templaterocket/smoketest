// npm run validate — the pre-launch checks. Run after `npm run build`; `npm run deploy` runs it
// for you and stops on any error. Each check has a code (V01…V24) so a coding agent can act on it.
//   ✗ error: blocks the launch   ! warning: worth a look   ✓ passed
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { redirectDrift } from "../src/integrations/redirects-check.mjs";
import { loadModule, loadSiteConfig, root } from "./lib/config.mjs";

const results = [];
const pass = (code, title) => results.push({ code, level: "ok", title });
const fail = (code, title, details = []) => results.push({ code, level: "error", title, details });
const warn = (code, title, details = []) => results.push({ code, level: "warn", title, details });
const check = (code, title, problems, level = "error") => (problems.length === 0 ? pass(code, title) : (level === "error" ? fail : warn)(code, title, problems));

// V01 — the config parses and passes its own rules (E_CONFIG, E_CHECKOUT_IN_FAKE_DOOR).
let site;
try {
  site = await loadSiteConfig();
  pass("V01", "site.config.ts is valid");
} catch (error) {
  fail("V01", "site.config.ts is invalid", String(error.message ?? error).split("\n"));
  report();
}

// V02 — there is a build to check.
const dist = join(root, "dist");
if (!existsSync(join(dist, "index.html"))) {
  fail("V02", "No build found: run `npm run build` first");
  report();
}
pass("V02", "Build found in dist/");

const files = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : [path];
});
const all = files(dist);
const html = all.filter((f) => f.endsWith(".html")).map((path) => ({ path, rel: relative(dist, path), text: readFileSync(path, "utf8") }));
// Pages are folders (astro.config.mjs): pricing/index.html is /pricing/. 404.html stays a file.
const publicPages = html.filter((p) => !/^404\.html$|^thanks\/|^examples\//u.test(p.rel));
const visibleText = (text) => text.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gu, " ").replace(/<[^>]+>/gu, " ");

// V03 — leads go somewhere real. Until they do ("none", or a {{PLACEHOLDER}} in the provider's
// settings), the form sends nothing and tells visitors it isn't connected yet (src/lib/leads/send.ts).
const { leadsConnected } = await loadModule("src/lib/leads/send.ts");
const { provider } = site.leads;
check("V03", "Leads go to a real provider", leadsConnected(provider) ? [] : [provider.id === "none"
  ? "leads.provider is \"none\": the form sends nothing and tells visitors it isn't connected yet. Pick a provider in site.config.ts."
  : `leads.provider (${provider.id}) still has a {{PLACEHOLDER}}: the form sends nothing until you put in the real value.`]);

// V04 — the site's address is set. Until it is, the build leaves out every absolute URL
// (src/lib/url.ts): no canonical or og:url, an empty sitemap, no Sitemap line in robots.txt.
const { isPlaceholderUrl } = await loadModule("src/lib/url.ts");
const placeholderUrl = isPlaceholderUrl(site.product.url);
check("V04", "product.url is the real address", placeholderUrl ? [`product.url is ${site.product.url}: set your domain — until then pages have no canonical link or og:url, and the sitemap lists no pages.`] : []);

// V05 — placeholders left in the config.
const placeholders = [];
const walk = (value, path) => {
  if (typeof value === "string") for (const m of value.matchAll(/\{\{([A-Z_]+)\}\}/gu)) placeholders.push(`${path}: {{${m[1]}}}`);
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k);
};
walk(site, "");
check("V05", "No {{PLACEHOLDERS}} left in site.config.ts", placeholders);

// V06 — placeholders left on pages.
const pageTokens = html.flatMap((p) => [...new Set([...visibleText(p.text).matchAll(/\{\{([A-Z_]+)\}\}/gu)].map((m) => m[1]))].map((t) => `${p.rel}: {{${t}}}`));
check("V06", "No {{PLACEHOLDERS}} visible on pages", pageTokens);

// V07 — the legal drafts are reviewed by a person (the pages show no banner; this is the reminder).
if (!site.legal.reviewed) warn("V07", "Legal pages are unreviewed drafts", ["legal.reviewed is false: have the drafts checked, then a person sets it to true (never the coding agent)."]);
else pass("V07", "Legal drafts marked as reviewed");

// V10 — a fake door cannot take money. (V08 and V09, the draft banner and the page notice, were retired.)
const pricingPages = html.filter((p) => p.text.includes("pricing-34__pane"));
if (site.pricing.mode === "fake-door") {
  const payment = /checkout\.stripe\.com|js\.stripe\.com|buy\.stripe\.com|paddle\.com|lemonsqueezy\.com\/checkout|polar\.sh\/checkout|name=["'](card|cardnumber|cvc|cvv|iban)["']/iu;
  check("V10", "No payment links or card fields near a fake door", pricingPages.filter((p) => payment.test(p.text)).map((p) => `${p.rel}: links to a checkout or asks for payment details (E_CHECKOUT_IN_FAKE_DOOR)`));
} else {
  pass("V10", "Payment checks apply to fake-door mode only");
}

// V11 — forbidden promises (claims a starting-point template cannot back).
const forbidden = [/GDPR[- ]compliant/iu, /CCPA[- ]compliant/iu, /lawyer[- ]approved/iu, /legally (bulletproof|binding guarantee)/iu, /guaranteed (results|signups|revenue)/iu, /validate[sd]? your idea in (an hour|60 minutes)/iu];
check("V11", "No forbidden claims on pages", html.flatMap((p) => forbidden.filter((re) => re.test(visibleText(p.text))).map((re) => `${p.rel}: matches ${re}`)));

// V12 — secrets never reach the build.
const secretValues = [];
for (const name of [".dev.vars", ".env", ".env.production"]) {
  const path = join(root, name);
  if (existsSync(path)) for (const line of readFileSync(path, "utf8").split("\n")) {
    const value = line.split("=").slice(1).join("=").trim().replace(/^["']|["']$/gu, "");
    if (value.length >= 12) secretValues.push(value);
  }
}
const secretPatterns = [/\bre_[A-Za-z0-9_]{20,}/u, /\bsk_(live|test)_[A-Za-z0-9]{16,}/u, /\bsb_secret_[A-Za-z0-9_-]{16,}/u, /\bAKIA[0-9A-Z]{16}\b/u];
const leaks = all.filter((f) => /\.(html|js|css|txt|xml|json)$/u.test(f)).flatMap((path) => {
  const text = readFileSync(path, "utf8");
  const rel = relative(dist, path);
  return [...secretPatterns.filter((re) => re.test(text)).map((re) => `${rel}: looks like a secret key (${re.source.slice(0, 18)}…)`), ...secretValues.filter((v) => text.includes(v)).map(() => `${rel}: contains a value from .dev.vars/.env`)];
});
check("V12", "No secret keys in the build", leaks);

// V13 — every public page has a title, a description and one h1.
check("V13", "Every page has a title, a description and one h1", publicPages.flatMap((p) => {
  const issues = [];
  if (!/<title>[^<]{3,}<\/title>/u.test(p.text)) issues.push(`${p.rel}: no <title>`);
  if (!/<meta name="description" content="[^"]{20,}"/u.test(p.text)) issues.push(`${p.rel}: no meta description`);
  const h1 = (p.text.match(/<h1[\s>]/gu) ?? []).length;
  if (h1 !== 1) issues.push(`${p.rel}: ${h1} h1 elements`);
  return issues;
}));

// V14 — internal links lead somewhere, in the one URL style: a page link ends with a slash and
// finds <path>/index.html; a file link (it has an extension: /rss.xml, /favicon.ico) finds the file.
const isFile = (path) => existsSync(path) && statSync(path).isFile();
const broken = new Set();
for (const p of html) for (const m of p.text.matchAll(/href="(\/[^"]*)"/gu)) {
  const href = m[1];
  if (href.startsWith("/api/") || href.startsWith("//")) continue;
  const path = decodeURIComponent(href.split(/[?#]/u)[0]);
  if (/\.[a-z0-9]+$/iu.test(path)) {
    if (!isFile(join(dist, path))) broken.add(`${p.rel} → ${href}: no such file`);
  } else if (!path.endsWith("/")) {
    broken.add(`${p.rel} → ${href}: ${isFile(join(dist, path, "index.html")) ? `write it with the trailing slash (${path}/)` : "no such page"}`);
  } else if (!isFile(join(dist, path, "index.html"))) broken.add(`${p.rel} → ${href}: no such page`);
}
check("V14", "Internal links resolve and end with a slash", [...broken]);

// V15 — placeholder links.
check("V15", "No placeholder links (href=\"#\")", html.filter((p) => /href="#"/u.test(p.text)).map((p) => `${p.rel}: has href="#"`));

// V16 — images are described.
check("V16", "Images have alt text", html.flatMap((p) => [
  ...[...p.text.matchAll(/<img\b(?![^>]*\balt=)[^>]*>/gu)].map(() => `${p.rel}: <img> without alt`),
  ...[...p.text.matchAll(/<[a-z]+\b[^>]*role="img"(?![^>]*aria-label=)[^>]*>/gu)].map(() => `${p.rel}: role="img" without aria-label`),
]));

// V17 — social preview image.
const og = join(root, "public", site.seo.ogImage.replace(/^\//u, ""));
check("V17", "Social preview image exists", existsSync(og) ? [] : [`${site.seo.ogImage} is missing: run \`npm run og\``]);

// V18 — crawl and discovery files. With the real address the sitemap lists the pages and
// robots.txt points at it; with the placeholder both stay empty on purpose, and V04 reports it.
const discovery = ["sitemap.xml", "robots.txt", "llms.txt"].filter((f) => !existsSync(join(dist, f))).map((f) => `dist/${f} is missing`);
if (discovery.length === 0 && !placeholderUrl) {
  if (!readFileSync(join(dist, "sitemap.xml"), "utf8").includes("<loc>")) discovery.push("dist/sitemap.xml lists no pages: run `npm run build` again after setting product.url");
  if (!/^Sitemap: https?:\/\//mu.test(readFileSync(join(dist, "robots.txt"), "utf8"))) discovery.push("dist/robots.txt has no Sitemap line: run `npm run build` again after setting product.url");
}
check("V18", placeholderUrl ? "sitemap.xml, robots.txt and llms.txt are built (pages listed once product.url is set: V04)" : "sitemap.xml lists the pages, robots.txt points at it, llms.txt is built", discovery);

// V19 — a cookie banner exactly when analytics needs one.
const banner = html.some((p) => p.text.includes('aria-label="Cookie consent"'));
const needsBanner = site.analytics.provider.id === "ga4";
check("V19", "Cookie banner matches the analytics choice", needsBanner && !banner ? ["GA4 is on but no consent banner was built"] : !needsBanner && banner ? ["A consent banner is built though no analytics needs cookies"] : []);

// V20 — the Worker can be deployed.
if (site.leads.provider.id === "cloudflare") {
  const wrangler = readFileSync(join(root, "wrangler.jsonc"), "utf8");
  const issues = [];
  if (/"database_id":\s*"0{8}-0{4}-0{4}-0{4}-0{12}"/u.test(wrangler)) issues.push("wrangler.jsonc: database_id is the placeholder — run `npx wrangler d1 create smoketest-leads` and paste the id");
  if (/onboarding@resend\.dev/u.test(wrangler)) issues.push("wrangler.jsonc: EMAIL_FROM is Resend's test sender — use an address on your verified domain");
  if (site.leads.doubleOptIn) issues.push("Double opt-in needs the RESEND_API_KEY secret in production: `npx wrangler secret put RESEND_API_KEY`");
  issues.push("Set IP_HASH_SALT once: `npx wrangler secret put IP_HASH_SALT`");
  if (site.legal.hosting !== "cloudflare") issues.push(`legal.hosting is "${site.legal.hosting}", but the cloudflare provider needs the Worker: deploy to Cloudflare, or pick a provider that needs no Worker`);
  check("V20", "Worker ready to deploy", issues, "warn");
} else pass("V20", `Leads provider "${site.leads.provider.id}" needs no Worker`);

// V21 — the hypothesis is written down, so the report has something to compare with.
check("V21", "Hypothesis is written down", site.hypothesis.statement ? [] : ["hypothesis.statement is empty: say what result would mean the idea is worth building"], "warn");

// V22 — text stays readable in the chosen preset (src/styles/presets.css): every text colour on
// the surfaces it sits on reaches 4.5:1, in each theme a visitor can see.
const { brand } = site;
const themes = brand.themeToggle || brand.theme === "system" ? ["light", "dark"] : [brand.theme];
try {
  const { Palette, contrastProblems } = await loadModule("src/lib/palette.ts");
  const css = ["tokens.css", "presets.css"].map((file) => readFileSync(join(root, "src", "styles", file), "utf8"));
  check("V22", `Text is readable in the "${brand.preset}" preset (contrast ≥ 4.5:1, ${themes.join(" and ")})`, themes.flatMap((theme) => contrastProblems(Palette.of(css, brand.preset, theme)).map((problem) => `${theme}: ${problem} — adjust the "${brand.preset}" block in src/styles/presets.css`)));
} catch (error) {
  fail("V22", "The colour tokens could not be read", [String(error.message ?? error)]);
}

// V23 — the icon set every page links to (Base.astro), rendered by `npm run icons` from
// public/favicon.svg, and the web manifest (src/pages/manifest.webmanifest.ts).
const pngSize = (path) => {
  const data = readFileSync(path);
  return data.subarray(1, 4).toString() === "PNG" ? `${data.readUInt32BE(16)}x${data.readUInt32BE(20)}` : "not a PNG";
};
const icons = [];
for (const [file, size] of [["favicon.ico"], ["favicon.svg"], ["apple-touch-icon.png", "180x180"], ["icon-192.png", "192x192"], ["icon-512.png", "512x512"]]) {
  const path = join(dist, file);
  if (!existsSync(path)) icons.push(`${file} is missing: put your icon in public/favicon.svg and run \`npm run icons\``);
  else if (size && pngSize(path) !== size) icons.push(`${file} is ${pngSize(path)}, not ${size}: run \`npm run icons\``);
  else if (file === "favicon.ico" && readFileSync(path).readUInt32BE(0) !== 0x00000100) icons.push("favicon.ico is not an icon file: run `npm run icons`");
}
try {
  const manifest = JSON.parse(readFileSync(join(dist, "manifest.webmanifest"), "utf8"));
  if (!manifest.name || !(manifest.icons ?? []).length) icons.push("manifest.webmanifest has no name or no icons");
} catch {
  icons.push("dist/manifest.webmanifest is missing or not JSON");
}
check("V23", "Icons and web manifest are built", icons);

// V24 — redirects: every rule in astro.config.mjs is also in public/_redirects (Cloudflare,
// Netlify) and vercel.json (Vercel), as /old and /old/. The build warns about the same drift.
try {
  const { default: astro } = await import(pathToFileURL(join(root, "astro.config.mjs")).href);
  check("V24", `Redirect files match astro.config.mjs (${Object.keys(astro.redirects ?? {}).length} redirect(s))`, redirectDrift(astro.redirects, root), "warn");
} catch (error) {
  warn("V24", "astro.config.mjs could not be read for its redirects", [String(error.message ?? error)]);
}

report();

function report() {
  const icon = { ok: "✓", warn: "!", error: "✗" };
  for (const r of results) {
    console.log(`${icon[r.level]} ${r.code}  ${r.title}`);
    for (const d of r.details ?? []) console.log(`        ${d}`);
  }
  const errors = results.filter((r) => r.level === "error").length;
  const warnings = results.filter((r) => r.level === "warn").length;
  console.log(`\n${errors} error(s), ${warnings} warning(s), ${results.filter((r) => r.level === "ok").length} passed`);
  process.exit(errors > 0 ? 1 : 0);
}
