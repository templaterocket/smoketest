# AGENTS.md — working on a Smoketest site

Smoketest is an Astro 7 + Tailwind 4 template for testing demand for a SaaS idea before building
it: a landing page, a lead layer (waitlist, double opt-in, queue, referrals), fake-door pricing,
cookieless analytics and a legal pack. You are helping the owner set it up and change it.

## Where things live

| What | Where |
|---|---|
| Every setting: product, look (`brand`), homepage `layout`, CTAs, leads provider, pricing, hypothesis, analytics, SEO, legal details | `src/site.config.ts` (checked by `src/config/schema.ts`) |
| Homepage copy and the three layouts | `src/pages/index.astro` (section constants at the top; `layout` picks the sections) |
| Colour presets, light and dark | `src/styles/presets.css` (`brand.preset`) |
| Derived colours, type scale, radii | `src/styles/tokens.css` — Tailwind maps onto it (`src/styles/tailwind.css`) |
| Font pairs | `src/styles/fonts.css` (`brand.fonts`), files in `public/fonts/` |
| Visual polish, effects | `src/styles/craft.css`, `src/scripts/fx/` — see `DESIGN.md` |
| Legal drafts | `src/content/legal/*.md` with `{{TOKENS}}` filled from the config |
| Changelog | `src/content/changelog/*.md` (also `/rss.xml`) |
| The leads API (Cloudflare Worker + D1) | `worker/`, `wrangler.jsonc` |
| Product mockups | `design/mockups/*.svg`, drawn in the preset's colours (light and `-dark`) by `src/pages/images/[mockup].svg.ts` |
| Icons and the web manifest | `public/favicon.svg` → `npm run icons` renders the PNGs and `favicon.ico`; `/manifest.webmanifest` comes from `src/pages/manifest.webmanifest.ts` |
| Redirects | `redirects` in `astro.config.mjs`, copied into `public/_redirects` and `vercel.json` (the build warns when they differ) |
| Going live: address, icons, hosts, staging, Search Console | `README.md` → "Before you launch" |
| Skills for this project | `agent/skills/` (`npm run link-skills` links them for Claude Code and Cursor) |

## Commands

```bash
npm run dev            # site with hot reload (forms post to /api: run `npm run dev:api` alongside)
npm run dev:api        # build, migrate the local D1, start the Worker on :8787 (site + API)
npm run build          # static site into dist/
npm run validate       # pre-launch checks V01–V24; run after every change you make
npm run report         # what the test measured (add --remote for production)
npm run og             # redraw public/og-default.png from the config
npm run icons          # render favicon.ico, apple-touch-icon.png, icon-192/512.png from public/favicon.svg
npm run deploy         # build + validate + wrangler deploy
npx astro check        # types
```

Before you say a change is done: `npm run build` and `npm run validate` must pass (warnings are fine
to report; errors are not), and `npx astro check` must show 0 errors.

## Rules — these are product promises, not style preferences

1. **No invented proof.** Never add testimonials, customer logos, user counts, ratings or results the
   owner did not give you. The signup counter shows the real number from the database and hides
   itself below `leads.counter.threshold`; do not replace it with a number.
2. **The fake door is always disclosed and never takes money.** In `pricing.mode: "fake-door"` the
   dialog shown after "Choose plan" stays, and no plan gets a `checkoutUrl` (the config refuses it:
   `E_CHECKOUT_IN_FAKE_DOOR`). Real pre-orders go through `pricing.mode: "checkout"` or a
   `preorder` CTA linking to a hosted checkout — never a payment form on this site.
3. **No compliance claims.** Do not write "GDPR-compliant", "lawyer-approved" or similar anywhere.
   The legal pages are "starting-point drafts" (`validate` V11 searches the build).
4. **Never set `legal.reviewed: true`.** Only the owner does that, after a person has checked the
   drafts. While it is false, `validate` warns (V07); the pages themselves show no banner.
5. **Secrets only in the environment.** API keys go into `wrangler secret put` or `.dev.vars`, never
   into `site.config.ts`, the code or the build (V12). The config holds public identifiers only.
6. **No promises about outcomes.** Copy may describe what the template measures; it must not promise
   that an idea will be validated or a number of signups (V11 has a list).
7. **Privacy by default.** Nothing is stored in the visitor's browser unless the owner chose
   `leads.attribution` "session"/"persistent" or GA4 (which brings the consent banner), or the
   visitor uses the theme switch (`brand.themeToggle`), which keeps only their light/dark choice
   (`smoketest:theme`; the cookie policy lists it). Raw IPs are never stored. Keep it that way.

## How to change things

- **Switch a call to action**: edit `cta.primary` / `cta.secondary`. All kinds are shown at
  `/examples/cta`. Forms send to `leads.provider`.
- **Switch where leads go**: `leads.provider` — `cloudflare` (default, needs the Worker), or
  `web3forms`, `formspree`, `loops`, `supabase`, `google-sheets`, `webhook`, `embed` (Mailchimp, Kit,
  MailerLite, Brevo, Buttondown). The `README.md` has each one's setup. `embed` carries the email only,
  so it cannot be combined with `access` or `contact` CTAs (the config refuses it). With `none`, or
  a `{{PLACEHOLDER}}` left in the provider, the form sends nothing and tells visitors it isn't
  connected yet — never fake a successful signup.
- **Change the look**: `brand` in the config — `preset` (forma, ocean, forest, ember, rose,
  graphite), `theme` (light, dark, system), `themeToggle`, `fonts` (geometric, editorial,
  technical). For the owner's own colours, change the values of their preset in `presets.css` (both
  the light and the dark block), not names; `validate` V22 checks the contrast. Use the Tailwind
  theme classes (`bg-surface`, `text-ink`, `text-ink-secondary`, `border-line`, `bg-accent`,
  `font-display`, `text-h2`) in new components rather than raw colours, so they work in every
  preset and in dark.
- **Switch the homepage layout**: `layout` — `minimal` (hero with the form, FAQ), `product` (the
  full page), `story` (problem → solution → how it works → pricing → FAQ). Navbar and footer links
  follow it.
- **New section**: put it in `src/components/sections/`, read settings from `site` (the config), use
  the `Button` and `Cta` components so links and forms keep working.
- **Links**: pages end with a slash (`/pricing/`, `/legal/privacy/`, home is `/`); files and
  the API don't (`/rss.xml`, `/api/leads`). Absolute URLs come from `src/lib/url.ts` (`absolute`,
  `siteUrl`), which leaves them out while `product.url` is a placeholder — never build them from
  `product.url` directly.
- The site no longer comes from the website-toolkit builder: do not run `website-toolkit-builder
  apply` on it.
