---
name: leads
description: Choose and connect where signups go — the template's Cloudflare Worker + D1, or Loops, Mailchimp, Kit, MailerLite, Brevo, Buttondown, Formspree, Web3Forms, Supabase, Google Sheets or a webhook — and test it end to end. Use when the owner asks where emails are stored or wants to switch provider.
---

# leads — connect the signup form

All options are in `leads.provider` (see the comments in `src/config/schema.ts` and `README.md`).

| Owner wants | Provider | Needs |
|---|---|---|
| Own data, double opt-in, queue + referrals, honest counter | `cloudflare` (default) | Cloudflare account, D1, Resend for emails |
| Fastest, emailed to them | `web3forms` / `formspree` | access key / form ID |
| Already on an email tool | `loops` (fetch) or `embed` with `service` mailchimp, kit, mailerlite, brevo, buttondown | form ID / the form `action` from their embed code |
| A database they own | `supabase` | project URL, publishable key, the insert-only table from README |
| A spreadsheet | `google-sheets` | Apps Script web app URL (script in README) |
| Their own automation | `webhook` | URL (Zapier, Make, n8n) |

Steps:
1. Ask which row fits; recommend `cloudflare` unless they already pay for an email tool.
2. Set `leads.provider` — with `none`, or while a `{{PLACEHOLDER}}` is left in it, the form sends
   nothing and tells visitors "This form isn't connected yet" (V03 fails); for `embed`, copy `action`, the email field name and hidden fields from
   their embed code (check the field name — defaults are in `EMBED_EMAIL_FIELD`).
   `embed` sends the email only: it cannot be used with `access`/`contact` CTAs.
3. Secrets (Resend, Turnstile secret, IP salt, webhook) go in `.dev.vars` locally and
   `npx wrangler secret put …` in production — never in the config.
4. Test: `npm run dev:api`, submit the hero form, follow the confirmation link printed in the
   Worker log, check `/thanks/` shows the place in line, then `npm run report`.
5. `npm run validate`.
