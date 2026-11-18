---
name: copy
description: Write or tighten the landing page copy — hero, how it works, features, FAQ, CTA — in the founder's words, honestly. Use when the owner asks to rewrite text, make it clearer or shorter, or adapt it to a new audience.
---

# copy — clear words, no invented proof

Copy lives in the section constants of `src/pages/index.astro` and in `site.config.ts`
(`product.description`, CTA labels, `pricing.plans`, `leads.consentText`).

Checklist for every change:
- The hero says **who it is for and what changes for them**; ≤ 10 words heading, ≤ 35 words below.
- Specific beats clever. Use the customer's words from `PROJECT.md`.
- **No invented proof**: no testimonials, logos, user numbers, ratings, "trusted by" or results.
- **No promises of outcomes** ("guaranteed", "in 60 minutes", "validated") and no compliance claims
  ("GDPR-compliant", "lawyer-approved") — `npm run validate` (V11) checks the build.
- CTA labels say what happens: "Get early access", "Book a 20-minute demo", "Pre-order — $39".
- The FAQ answers real objections, including what the product will not do.
- Keep the fake-door wording intact in `pricing.disclosure` — it may be rephrased, never weakened.
