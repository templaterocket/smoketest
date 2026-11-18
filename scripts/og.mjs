// npm run og — draws public/og-default.png (1200×630), the social preview image, from the
// product name and description in site.config.ts, in the colours of the chosen preset
// (brand.preset, light) and the default fonts. The site's host goes at the bottom once
// product.url is the real address (not while it is example.com).
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadModule, loadSiteConfig, root } from "./lib/config.mjs";

const site = await loadSiteConfig();
const { Palette, hex, mix } = await loadModule("src/lib/palette.ts");
const { siteUrl } = await loadModule("src/lib/url.ts");
const palette = Palette.of(["tokens.css", "presets.css"].map((file) => readFileSync(join(root, "src", "styles", file), "utf8")), site.brand.preset, "light");
const accent = palette.color("--bg-accent");
const white = [255, 255, 255, 1];
const black = [0, 0, 0, 1];
// The accent panel of the site and the mockups: dark to light along the diagonal, a glow top right.
const frame = [mix(accent, black, 0.6), mix(accent, black, 0.9), mix(accent, white, 0.85)].map(hex);
const glow = hex(mix(palette.color("--color-highlight"), white, 0.6));
const escape = (value) => value.replace(/[&<>"']/gu, (c) => `&#${c.charCodeAt(0)};`);

/** Greedy word wrap by character count — enough for a title and a short description. */
function wrap(text, width, maxLines) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/u)) {
    if ((line + " " + word).trim().length > width && line) {
      lines.push(line);
      line = word;
    } else line = (line + " " + word).trim();
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/u, "…");
  }
  return lines;
}

const description = wrap(site.product.description, 34, 3);
const host = siteUrl?.host;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${frame[0]}"/><stop offset="0.52" stop-color="${frame[1]}"/><stop offset="1" stop-color="${frame[2]}"/></linearGradient>
    <radialGradient id="glow" cx="1200" cy="0" r="760" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${glow}" stop-opacity="0.6"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
    <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="1.2" fill="#FFFFFF" fill-opacity="0.16"/></pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect width="1200" height="630" fill="url(#dots)"/>
  <rect x="72" y="72" width="64" height="64" rx="18" fill="#FFFFFF" fill-opacity="0.16"/>
  <g fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"><path d="M88 116c7 0 7-8 16-8s9 8 16 8"/><path d="M88 99c7 0 7-8 16-8s9 8 16 8" opacity=".65"/></g>
  <text x="160" y="118" font-family="Manrope" font-weight="600" font-size="34" fill="#FFFFFF">${escape(site.product.name)}</text>
  ${description.map((line, i) => `<text x="72" y="${300 + i * 76}" font-family="Manrope" font-weight="600" font-size="60" letter-spacing="-1.6" fill="#FFFFFF">${escape(line)}</text>`).join("\n  ")}
  ${host ? `<text x="72" y="566" font-family="DM Sans" font-size="26" fill="#FFFFFF" fill-opacity="0.75">${escape(host)}</text>` : ""}
</svg>`;

const png = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  font: {
    loadSystemFonts: false,
    // TrueType: resvg reads neither woff2 nor variable weights. Manrope SemiBold is a static instance of
    // google/fonts Manrope[wght].ttf (fonttools varLib.instancer wght=600); DM Sans is the variable file. Both OFL.
    fontFiles: [join(root, "scripts/og-fonts/Manrope-SemiBold.ttf"), join(root, "scripts/og-fonts/DMSans.ttf")],
    defaultFontFamily: "DM Sans",
  },
}).render().asPng();
writeFileSync(join(root, "public/og-default.png"), png);
console.log(`public/og-default.png  1200×630  ${Math.round(png.length / 1024)} KB`);
