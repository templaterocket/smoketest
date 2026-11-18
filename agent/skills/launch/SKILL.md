---
name: launch
description: Deploy the site and the leads Worker to Cloudflare — D1 database, secrets, email sender, bot check, domain — or the static site to Netlify or Vercel, and run the pre-launch checks. Use when the owner says "put it live", "deploy" or "launch".
---

# launch — from local to live

`README.md` → "Before you launch" has the details behind steps 1–4; walk the owner through them.

1. **Address**: `product.url` = the real domain; `npm run og`. While it is example.com the build
   leaves out canonical links and the sitemap's pages, and V04 blocks the deploy.
2. **Icon**: the owner's square icon in `public/favicon.svg`, then `npm run icons` (V23 checks the
   files; read the PNGs to see them).
3. **Redirects**, if pages moved: `redirects` in `astro.config.mjs`, the same rules in
   `public/_redirects` and `vercel.json`, as `/old` and `/old/` (the build and V24 warn on drift).
4. **Host** — ask which:
   - **Cloudflare** (the full setup; needed for the `cloudflare` leads provider: double opt-in,
     queue, referrals, counter, data requests): steps 6–9 below.
   - **Netlify or Vercel**: the static site only — the Worker does not run there, so the leads
     provider must be one that needs no Worker (V20 says so; switch with the `leads` skill). Netlify
     reads `_redirects` and serves `404.html`; Vercel reads `vercel.json`. Build `npm run build`,
     output `dist`. Then step 10.
5. `npm run build && npm run validate`; fix every error (warnings: explain them to the owner).
6. Cloudflare (owner logs in with `npx wrangler login` — you never handle their password):
   ```bash
   npx wrangler d1 create smoketest-leads          # paste the id into wrangler.jsonc
   npm run db:migrate                               # tables in the remote database
   npx wrangler secret put IP_HASH_SALT             # any long random string
   npx wrangler secret put RESEND_API_KEY           # double opt-in and data-request emails
   ```
7. Resend: the owner verifies their sending domain; set `EMAIL_FROM` in `wrangler.jsonc`
   (e.g. "Product <hello@theirdomain.com>"), and `OWNER_EMAIL` for contact/access requests.
8. Optional bot check: create a Turnstile widget, put the **site key** in
   `leads.provider.turnstileSiteKey` and the **secret** with `npx wrangler secret put TURNSTILE_SECRET_KEY`.
9. `npm run deploy` (build → validate → wrangler deploy). Then add the custom domain in the
   Cloudflare dashboard (Workers → the worker → Domains).
10. **Staging**: a copy that should stay out of search gets an `X-Robots-Tag: noindex` header on
    its host — never a `Disallow` in robots.txt, never in a file production ships.
11. Smoke test live: sign up with a real address (on Cloudflare: click the email link, check
    `/thanks/` shows the place in line, choose a plan on `/pricing/`, `npm run report -- --remote`). Open
    `/sitemap.xml` (pages end with `/`) and `/robots.txt` (its `Sitemap:` line).
12. **Search Console**: the owner adds the domain and submits `https://theirdomain/sitemap.xml`.
