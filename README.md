# Smoketest

**A landing page that measures demand, not just looks good.** An Astro 7 + Tailwind 4 template
for testing a SaaS idea before you build it: calls to action from a waitlist to a demo booking,
a lead layer with double opt-in, a real queue and referrals, fake-door pricing that always
discloses itself, cookieless analytics, and a legal pack of starting-point drafts. Set it up with
your coding agent: the `validate-setup` skill interviews you and fills everything in.

## Quick start

```bash
npm install
npm run dev:api        # builds, creates the local database, serves site + API on http://localhost:8787
```

Open http://localhost:8787, join the waitlist, and copy the confirmation link from the terminal
(locally, emails are printed instead of sent). For hot reload while editing, run `npm run dev`
(http://localhost:4321) alongside: it forwards `/api` to the Worker.

Then edit **`src/site.config.ts`** — the one file with every setting — or ask your agent:
run `npm run link-skills` once and start with `/validate-setup`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Site with hot reload (forms need `dev:api` running) |
| `npm run dev:api` | Build, migrate the local D1, run the Worker (site + API) on :8787 |
| `npm run build` | Static site into `dist/` |
| `npm run validate` | 22 pre-launch checks (V01–V24; V08 and V09 retired); errors block `deploy` |
| `npm run report` | Signups, sources, referrals, plan clicks vs your hypothesis (`-- --remote`, `--pricing-visitors N`) |
| `npm run og` | Redraws `public/og-default.png` from the product name and description |
| `npm run icons` | Renders `favicon.ico`, `apple-touch-icon.png`, `icon-192.png` and `icon-512.png` from `public/favicon.svg` |
| `npm run deploy` | Build, validate, deploy to Cloudflare |
| `npm run link-skills` | Links `agent/skills` for Claude Code (`.claude/skills`) and Cursor (`.cursor/rules`) |
| `npx astro check` | Type check |

## What's in `site.config.ts`

| Key | Sets |
|---|---|
| `product` | Name, one-line description, the site's address (`url`: canonical links, sitemap, social image) |
| `brand` | `preset` (six palettes), `theme` (`light` · `dark` · `system`), `themeToggle` (a light/dark switch in the navbar), `fonts` (three pairs) — see below |
| `layout` | The homepage: `minimal` · `product` · `story` — see below |
| `cta.primary`, `cta.secondary` | `waitlist` · `access` (with qualifying questions) · `demo` (Cal.com, Calendly or a link) · `preorder` (hosted checkout) · `contact` · `link`. See them all at `/examples/cta` |
| `leads` | Where signups go (below), consent as a notice or a checkbox, double opt-in, attribution mode, referrals, the honest counter |
| `pricing` | `fake-door` (counts "Choose plan", never charges, always disclosed) · `checkout` · `off`; the plans |
| `hypothesis` | What you are testing; `npm run report` compares results with it |
| `analytics` | `none` · `plausible` · `umami` · `fathom` · `cloudflare` (all cookieless) · `ga4` (cookies → consent banner) |
| `seo` | Title, OG image, locale, Twitter handle |
| `legal` | Company details that fill the legal drafts; `hosting` (named in the privacy policy); `imprint`; `reviewed` (set by a person only) |

## Look and layout — `brand`, `layout`

| Preset | Accent | | Fonts | Headings + body |
|---|---|---|---|---|
| `forma` *(default)* | violet | | `geometric` *(default)* | Manrope + DM Sans |
| `ocean` | blue | | `editorial` | Fraunces + Inter |
| `forest` | green | | `technical` | Space Grotesk + IBM Plex Sans |
| `ember` | burnt orange | | | |
| `rose` | raspberry | | | |
| `graphite` | monochrome | | | |

Every preset has a light and a dark variant. `theme: "system"` follows the visitor's device;
the theme is applied before the first paint, so a dark page never flashes white. With
`themeToggle: true` the navbar has a light/dark switch; a visitor's choice is then kept in their
browser under `smoketest:theme` — the only thing the template stores there unasked, listed in the
cookie policy — and only while it differs from what the site would show anyway.

For your own colours, change the values of your preset in `src/styles/presets.css` (eleven
per theme; everything else is derived from them) and run `npm run validate`: V22 checks that text
keeps a contrast of 4.5:1 in both themes. The product mockups (`design/mockups/`) are drawn in the
preset's colours at build time, with a dark variant.

| Layout | Homepage sections |
|---|---|
| `minimal` | hero with the form → FAQ |
| `product` *(default)* | hero → how it works → stats → what's inside → fake door → pricing → FAQ → closing call to action |
| `story` | hero → problem → solution → how it works → pricing → FAQ → closing call to action |

The copy of every section is in `src/pages/index.astro`; navbar and footer links follow the layout.

## Where leads go — `leads.provider`

| Provider | Best for | You set | Notes |
|---|---|---|---|
| `cloudflare` *(default)* | Owning your data; double opt-in, queue, referrals, counter, data requests | nothing in the config | Worker + D1 in this repo. Needs a Cloudflare account; Resend for emails |
| `web3forms` | Fastest start, signups emailed to you | `accessKey` | Free tier; email only, not a list |
| `formspree` | Simple inbox for submissions | `formId` | 20 submissions/min per form |
| `loops` | SaaS email (newsletter, launch) | `formId`, optional `userGroup` | Loops' public form endpoint; turn on its double opt-in in Loops |
| `supabase` | Your own Postgres | `url`, `anonKey`, `table` | Insert-only table below |
| `google-sheets` | A spreadsheet | `scriptUrl` | Apps Script below; the browser can't read its reply, so errors aren't shown |
| `webhook` | Zapier, Make, n8n, your API | `url`, `opaque` | JSON body; `opaque: true` if the endpoint doesn't send CORS headers |
| `embed` | Mailchimp, Kit, MailerLite, Brevo, Buttondown | `service`, `action`, `emailField`, `hiddenFields` | Posts to the form in your service's embed code; visitors see the service's confirmation page. Email only (no `access`/`contact` CTAs) |

Only public identifiers go in the config — the form posts from the browser. Secret keys belong to
the Worker (`wrangler secret put`).

Until a provider is connected — `{ id: "none" }`, or a `{{PLACEHOLDER}}` left in its settings — the
form sends nothing anywhere: a visitor who submits it stays on the page and reads "This form isn't
connected yet, so nothing was sent." (never a thank-you), and `validate` V03 blocks the deploy.
`none` is the setting for a demo that must collect no emails.

<details>
<summary><strong>Supabase: the insert-only table</strong></summary>

```sql
create table public.leads (
  id bigint generated always as identity primary key,
  email text not null unique,
  name text,
  message text,
  cta text not null,
  answers jsonb not null default '{}',
  utm jsonb not null default '{}',
  page text,
  referrer text,
  created_at timestamptz not null default now()
);
alter table public.leads enable row level security;
revoke all on public.leads from anon;
grant insert on public.leads to anon;
create policy "Anyone can sign up" on public.leads for insert to anon with check (true);
```

Use the project's publishable (anon) key — never the secret one. A duplicate email returns 409,
which the form treats as "already signed up".
</details>

<details>
<summary><strong>Google Sheets: the Apps Script</strong></summary>

In the sheet: Extensions → Apps Script, paste this, then Deploy → New deployment → Web app,
"Execute as: Me", "Who has access: Anyone". Put the web app URL in `scriptUrl`.

```js
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const headers = sheet.getLastRow() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
  const keys = ["date", ...Object.keys(data)];
  for (const key of keys) if (!headers.includes(key)) headers.push(key);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  const row = headers.map((h) => (h === "date" ? new Date() : data[h] ?? ""));
  sheet.appendRow(row);
  return ContentService.createTextOutput("ok");
}
```
</details>

<details>
<summary><strong>Mailchimp, Kit, MailerLite, Brevo, Buttondown (embed)</strong></summary>

In your service, create an embedded signup form and open its HTML. Copy the form's `action` URL
into `action`, the email input's `name` into `emailField` (defaults: Mailchimp `EMAIL`, Kit
`email_address`, MailerLite `fields[email]`, Brevo `EMAIL`, Buttondown `email` — check yours), and
any hidden inputs (list IDs, tags, Mailchimp's `b_…` honeypot, left empty) into `hiddenFields`.
Test one signup: these services show their own confirmation page and run their own double opt-in.
</details>

## Before you launch

Whichever host you pick, go through this list once; `npm run validate` checks most of it.

- **Your address.** Set `product.url` in `src/site.config.ts` to the real domain and run `npm run og`.
  While it is `example.com` (or `.org`, `.net`) the build writes no URL on that domain: pages have no
  canonical link or `og:url`, the sitemap lists no pages, `robots.txt` names no sitemap, and the
  legal drafts say "this website". `validate` reports it once, as V04, and `deploy` stops there.
- **Your icon.** Replace `public/favicon.svg` with your own square icon (it is also drawn at 16 px,
  so keep it simple) and run `npm run icons`. It renders `favicon.ico` (16 and 32 px),
  `apple-touch-icon.png` (180 px on your preset's page colour, as iOS wants no transparency) and
  `icon-192.png` / `icon-512.png`, which `/manifest.webmanifest` lists with your product name and
  preset colours. Every page links them; V23 checks they are there.
- **One URL style.** Pages end with a slash: `/pricing/`, `/legal/privacy/` (home is `/`); files
  don't (`/robots.txt`, `/rss.xml`, `/api/…`). Link to pages that way in your copy and calls to
  action; V14 flags a page link without the slash. Hosts redirect `/pricing` to `/pricing/`.
- **Redirects.** When you move or rename a page, add the old address to `redirects` in
  `astro.config.mjs` — the source of truth — and copy the rule into `public/_redirects` (Cloudflare,
  Netlify) and `vercel.json` (Vercel), with and without the trailing slash. Astro writes no redirect
  pages, so a rule missing from a file does not exist on that host; the build warns about it, and so
  does `validate` (V24).
- **A staging copy stays out of Google** with an `X-Robots-Tag: noindex` response header on the
  staging host, not with `robots.txt`: a page blocked there can still be listed from links, and
  crawlers never see its `noindex`. Preview URLs of Vercel and Netlify usually send the header
  already (check the response headers); for a staging domain of your own, add it in the host's
  header settings (Cloudflare: a response header Transform Rule for that hostname). Never put it in
  a file the production build ships.
- **Search Console.** After the first deploy, add the domain in Google Search Console and submit
  `https://yourdomain/sitemap.xml` (`robots.txt` points to it as well). The sitemap lists the public
  pages; `lastmod` comes only from real dates — the newest changelog entry and `legal.effectiveDate`
  for the legal drafts — and thank-you, example and 404 pages stay out.

## Going live on Cloudflare

Cloudflare Workers is the full setup: the Worker serves the site from `dist/` and the leads API
(double opt-in, queue, referrals, counter, data requests, D1). It applies `public/_redirects`, adds
the trailing slash to page addresses, and answers unknown paths with `404.html`.

```bash
npx wrangler login
npx wrangler d1 create smoketest-leads           # paste the database_id into wrangler.jsonc
npm run db:migrate                                # create the tables remotely
npx wrangler secret put IP_HASH_SALT              # any long random string
npx wrangler secret put RESEND_API_KEY            # from resend.com, after verifying your domain
npm run deploy
```

Also: set `EMAIL_FROM` (a sender on your verified domain) and `OWNER_EMAIL` (where contact and
access requests go) in `wrangler.jsonc`; set `product.url` to your domain and run `npm run og`;
add the domain to the Worker in the Cloudflare dashboard. Optional: a Turnstile widget — site key in
`leads.provider.turnstileSiteKey`, secret via `npx wrangler secret put TURNSTILE_SECRET_KEY`.
Optional: `LEADS_WEBHOOK_URL` secret to copy every new/confirmed lead to Zapier, Make or n8n.

Locally, put secrets in `.dev.vars` (`KEY=value` lines; git-ignored).

### Netlify or Vercel: the static site only

Both build the site (`npm run build`, output `dist/`) and serve it as files. **The Worker does not
run there**, so the `cloudflare` leads provider — double opt-in, the queue, referrals, the counter,
the data request form and fake-door click counting — does not work. Pick a provider that posts from
the browser (`web3forms`, `formspree`, `loops`, `supabase`, `google-sheets`, `webhook`, `embed`;
V20 says "needs no Worker" for them); `/legal/data-request/` then offers an email to you instead.

- **Netlify** reads `dist/_redirects` (copied from `public/`) and serves `404.html` for unknown paths.
- **Vercel** reads `vercel.json`: `"trailingSlash": true` and your `redirects`. It serves `404.html`
  for unknown paths as well.

### The leads API

| Route | |
|---|---|
| `POST /api/leads` | Signup; the same answer whether the address is new or known |
| `GET /api/confirm?token=` | Double opt-in link → `/thanks/?state=confirmed&code=…` |
| `GET /api/status?code=` | Place in the queue and credited referrals |
| `GET /api/count` | The honest counter (null below the threshold) |
| `GET/POST /api/unsubscribe?token=` | Unsubscribe link in every email (POST = one-click) |
| `POST /api/intent` | A fake-door plan click (once per plan, visitor and day) |
| `POST /api/data-request`, `GET /api/data-request/confirm` | Export, delete or unsubscribe, verified by email |

A daily job retries unsent confirmation emails, deletes signups not confirmed within 30 days,
clears IP hashes after `IP_HASH_RETENTION_DAYS` and prunes old requests. Raw IPs are never stored.

## Pages

`/` · `/pricing/` · `/changelog/` (+ `/rss.xml`) · `/legal/privacy/` · `/legal/cookies/` ·
`/legal/terms/` · `/legal/preorder/` (when you take pre-orders) · `/legal/imprint/` (`legal.imprint`) ·
`/legal/data-request/` · `/thanks/` · 404 · `/examples/cta/` (not indexed) · `/sitemap.xml` ·
`/robots.txt` · `/llms.txt` · `/manifest.webmanifest`.

## Honest by design

The template measures interest; it does not promise results. So: no invented testimonials, logos
or numbers (the counter is real and hides below a threshold); the fake door is disclosed after
the click and never takes money (`E_CHECKOUT_IN_FAKE_DOOR`); the legal pages are starting-point
drafts, and `validate` warns until a person sets `legal.reviewed: true`; no "GDPR-compliant"
or "lawyer-approved" claims (`validate` checks); secrets stay in the environment. `AGENTS.md` holds
these rules for coding agents.

## Licence

MIT — see [LICENSE](LICENSE). Use it for any project, personal or commercial, including client
sites; keep the copyright notice.

## Project map

```
src/site.config.ts        every setting (schema: src/config/schema.ts)
src/pages/                pages and endpoints (index.astro holds the homepage copy)
src/components/           cta/ (Cta, LeadForm, SignupCount), sections/, site/ (header, footer, analytics, legal), ui/, library/
src/content/              legal drafts and changelog entries (Markdown)
src/lib/                  leads sending and attribution, analytics, legal tokens, page list, palette and theme, layout
src/styles/               presets.css (colours), tokens.css (theme), fonts.css, tailwind.css, craft.css (polish) — see DESIGN.md
src/scripts/fx/           effects (ASCII background and waves, tilt, reveal)
src/integrations/         redirects-check (warns when public/_redirects or vercel.json miss a redirect)
worker/                   the Cloudflare Worker and D1 migrations
scripts/                  validate, report, og, icons, link-skills
public/                   favicon.svg and the icons rendered from it, og-default.png, _redirects, fonts
agent/skills/             skills for coding agents
design/mockups/           sources of the product mockups (drawn by src/pages/images/[mockup].svg.ts)
```

Fonts: DM Sans, Manrope, Inter, Fraunces, IBM Plex Sans, Space Grotesk, JetBrains Mono — all under
the SIL Open Font License (texts in `public/fonts/`).
