# Changelog

All notable changes to Smoketest are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/).

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
