# Changelog

All notable changes to Smoketest are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/).

## [1.1.0] — 2026-11-25

- The sample content is now a made-up product, Paylark (polite reminders for unpaid invoices), instead
  of Smoketest describing itself: homepage copy in all three layouts, plans and hypothesis in
  `site.config.ts`, the two changelog entries, and the hero and "How it works" mockups, redrawn as
  Paylark's own screens. Replace it with your product, or let `/validate-setup` do it.
- The pill above the hero heading is a `pill` prop of the hero in `src/pages/index.astro` (it was
  text in `craft.css`); leave it out for none.
- Placeholder addresses use example.com: the email field reads `you@example.com`, and the sender
  examples in `wrangler.jsonc` and the `launch` skill use example.com.
- The skills live in `.claude/skills/`, where Claude Code and Cursor load them without a setup step;
  `npm run link-skills` is gone. Their descriptions say what each one does in the third person, and
  `validate-setup` counts its 13 questions correctly.
- The README links the live demo.
- Pages carry a `generator` meta tag naming the Astro version.
- Comments about the tool the homepage was first generated with are gone, and `design/history/`
  stays out of releases.

## [1.0.1] — 2026-11-18

- Fake-door pricing: the dialog no longer says "Your click was counted" when nothing stored the
  click. It adds that line only once the included Worker has recorded it (`/api/intent`); with a
  browser form service the dialog says only that no payment was taken.

## [1.0.0] — 2026-11-18

First public release, free under the MIT licence.

- A landing page that measures demand for a SaaS idea: calls to action from a waitlist to a demo
  booking, pre-order, contact or a link; three homepage layouts; ten pages including pricing,
  changelog, legal drafts and a data-request page.
- One settings file (`src/site.config.ts`): product, brand (six colour presets, light and dark,
  three font pairs), layout, calls to action, leads, pricing test, analytics, SEO and legal details.
- Leads: browser form services (Web3Forms, a webhook, Formspree, Loops, Supabase, Google Sheets,
  Mailchimp-style forms) or the included Cloudflare Worker with D1 for double opt-in, a real queue,
  referrals, a signup counter and data requests. The form never fakes success: until a provider is
  connected it sends nothing and says so.
- Fake-door pricing that always discloses itself, or plans linked to a hosted checkout.
- Cookieless analytics (Plausible, Umami, Fathom, Cloudflare) or GA4 with a consent banner.
- Starting-point legal drafts and `npm run validate`, which blocks `npm run deploy` on errors;
  `npm run report` compares signups and plan clicks with your hypothesis.
- Ready to launch: one URL style with a trailing slash, sitemap and `robots.txt` from your address,
  the icon set with a web manifest (`npm run icons`), a 404 page, and `_redirects` / `vercel.json`.
- Eight skills for coding agents (`npm run link-skills`), starting with `validate-setup`.
