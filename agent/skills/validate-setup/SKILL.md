---
name: validate-setup
description: Interview the founder about their SaaS idea and set up this Smoketest site for it — product, audience, copy, call to action, leads provider, pricing test, hypothesis and legal details. Use at the start of a new site, or when the owner says "set this up for my idea".
---

# validate-setup — from idea to a configured test page

You are setting up a demand test, not a finished product site. Ask, don't guess. One question at a
time; offer your recommended answer first. Keep notes in `PROJECT.md` (copy `PROJECT.md.template`).

## 1. Interview (8–12 questions)

1. **The problem** in one sentence, in the customer's words.
2. **Who** feels it most — be specific (role, situation), not "small businesses".
3. **What they do today** instead, and what that costs them.
4. **The promise**: what changes for them with the product.
5. **The call to action** that matches the stage:
   waitlist (default) · early access with 1–3 qualifying questions · book a demo (B2B, high price) ·
   pre-order (strong signal, needs a hosted checkout) · contact.
6. **The price idea**: 1–3 plans with names, prices and 3–6 features each.
7. **The test**: fake-door pricing (default before launch) or real checkout?
8. **Success**: how many confirmed signups, and what share of `/pricing/` visitors choosing a plan,
   would make it worth building? Write it as one sentence (the hypothesis).
9. **Channels**: where the first visitors come from (they become `utm_source` values in the report).
10. **Leads**: their own database (Cloudflare Worker + D1, default) or a service they already use
    (Loops, Mailchimp, Kit, MailerLite, Brevo, Buttondown, Formspree, Web3Forms, Supabase, Sheets).
11. **Legal details**: company name, address, country, contact email, governing law; Germany/Austria → imprint.
12. **Domain** for `product.url`.
13. **Look and layout**: a colour preset or their brand colour, light/dark/system with or without the
    switch, a font pair, and the homepage layout (`minimal` for a quick page, `product` for the
    full page, `story` to lead with the problem). Defaults are fine; the `brand` skill has details.

## 2. Configure

- `src/site.config.ts`: product, `brand`, `layout`, `cta.primary`/`cta.secondary`, `leads`, `pricing`,
  `hypothesis`, `legal` (never `legal.reviewed`). Use the owner's words.
- `src/pages/index.astro`: rewrite the section constants of the chosen layout with the interview
  answers (hero heading ≤ 10 words, description ≤ 35 words; how it works in 3 steps; for `story`,
  the problem in the owner's words; FAQ from the owner's real doubts).
- Nothing invented: no testimonials, logos, numbers or results the owner did not give you.
- Run the `copy` skill's checklist over the text.

## 3. Check

```bash
npm run og && npm run build && npm run validate && npx astro check
```

Report what is left (placeholders the owner still has to supply, provider setup, `legal.reviewed`)
as a short list. Then suggest the `leads` skill for the provider and `launch` for deployment.
