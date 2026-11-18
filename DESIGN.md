# DESIGN.md — how the Smoketest look is built

## The look in the config

`brand` in `src/site.config.ts` picks a colour `preset` (forma, ocean, forest, ember, rose,
graphite), a `theme` (light, dark, system), the navbar's light/dark switch (`themeToggle`) and a
font pair (`fonts`: geometric, editorial, technical). `src/layouts/Base.astro` writes them on
`<html data-preset data-theme data-fonts>`; an inline script in `<head>` settles `data-theme`
(saved choice, else the config, else the device) before the first paint. Everything below keys on
those three attributes, so components never need to know which preset or theme is active.

## Layers, in load order (`src/layouts/Base.astro`)

1. **`tokens.css`** — every colour role, type size, radius and spacing step, as CSS variables:
   primitives (`--color-*`), roles (`--bg-*`, `--text-*`, `--icon-*`, `--line-*`), `--radius-*`,
   `--space-*`, `--font-*-size|line-height` (mobile first; tablet ≥768px, desktop ≥1280px). Colour
   roles not set by the preset are derived here with `color-mix()` (the accent and ink alpha scales,
   lines, icons, tertiary text), plus the theme-wide dark settings (`color-scheme`, line strength,
   `--text-danger`). Keep the names.
2. **`presets.css`** — the colour values: per preset, a light and a dark block of eleven values
   (accent, highlight, ink, five surfaces, three text colours). Rebrand here; `npm run validate`
   (V22) checks text contrast ≥ 4.5:1 in each theme. `src/lib/palette.ts` reads these files as
   data for the mockups, the `theme-color` meta and V22.
3. **`fonts.css` / `base.css`** — the three font pairs (`--font-family-display | body | mono`,
   `--font-display-tracking`, `--font-body-features`), self-hosted from `public/fonts`; the reset,
   `[hidden]` always hides. Only the chosen pair is preloaded.
4. **`tailwind.css`** — Tailwind 4 theme mapped onto the tokens, without Tailwind's preflight:
   `bg-surface | surface-secondary | surface-tertiary | surface-reverse | accent | accent-soft`,
   `text-ink | ink-secondary | ink-tertiary | ink-reverse | ink-accent | danger`, `border-line |
   line-soft | line-strong | line-accent`, `font-sans | display | mono` (the pair's fonts),
   `text-h1…h4 | xl | lg | md | sm | xs`, `rounded-sm | md | lg | xl`.
5. **`craft.css`** — the polish, after the Forma and Nodity references: display headings with tight
   tracking, the button family (gradient primary, outline secondary, link), section bands (dark stats
   panel, tinted feature band with grid marks, accent CTA panel), pricing cards, FAQ, the navbar logo
   and footer wordmark (`product.name`, shown in lowercase), long-form text (`.legal-prose`), scroll reveal. Its gradients, glows and shadows mix the
   preset's accent, highlight and ink (`--craft-*` at the top), so they follow any preset and the
   dark theme; dark-only tweaks use `:root[data-theme="dark"] body.craft`. Every rule starts with
   `body.craft`; Astro's scoped styles use `:where()` (see `astro.config.mjs`), so these always win.

## Dark theme

Each preset's dark block keeps the same roles: `--bg-main` is the dark page, `--text-*` light,
`--text-accent` a lighter accent that reads on dark. Two roles keep their meaning in both themes:
`--bg-reverse` is the contrast panel (dark, white text on it), and `--text-reverse` is white (on
the accent and on that panel). Use roles, not raw colours, and a new section works in dark too.

## Sections and layouts

`src/components/library/` are sections that started in the layout library and are now owned by the
site (edit them freely). `src/components/sections/` are the template's own (Hero, Pricing, CtaPanel);
they keep the library class names so `craft.css` styles them the same way. `src/pages/index.astro`
arranges them for `layout` (`minimal`, `product`, `story`); `src/lib/layout.ts` lists the anchors
each layout has, so the navbar, footer and in-page links only point at sections that exist.

## Effects (`src/scripts/fx/`)

- `ascii-engine.js` — the ASCII canvas engine from the Nodity site (vendored, minified).
- `fx.js` — the pointer trail behind transparent sections (glyphs gather around a hovered button),
  ASCII waves inside the stats and CTA panels, tilt on mockups, scramble-in labels and numbers,
  scroll reveal and the button's pointer light. The ASCII colours are read from the tokens and
  change with the theme switch. All of it is off for `prefers-reduced-motion`, and the pointer
  trail is off on touch screens.

## Mockups

The product images (`/images/hero-product.svg`, `how-it-works.svg`, `fake-door.svg`, each with a
`-dark` variant) are drawn at build time by `src/pages/images/[mockup].svg.ts` from
`design/mockups/*.svg`. The sources name their colours by role (`var(--m-surface)`,
`var(--m-accent)`…, with Forma light values in a `<style id="palette">` block so they still preview
as files); the endpoint swaps in values worked out from the configured preset and theme, and embeds
the fonts so the SVGs render even as CSS backgrounds. White on accent, the terminal and the greens
stay literal. Edit the sources; the next build or `npm run dev` picks them up.

## Rules of thumb

- Colours and sizes come from tokens or the Tailwind theme, never raw hex in components.
- Check new work in light and dark, and in a second preset, before calling it done.
- Animate `transform` and `opacity` only; 150–250 ms for UI, ease-out to enter.
- Every interactive element has hover, active and `:focus-visible` states; hit targets ≥ 44 px.
- Check 375 px, 768 px and 1280 px+ before calling a visual change done.
