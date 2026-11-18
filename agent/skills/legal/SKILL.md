---
name: legal
description: Fill in the legal pack — privacy, cookies, terms, pre-order terms, imprint and the data request page — from the owner's details, and keep it consistent with the providers in use. Use when the owner asks about privacy, cookies, GDPR, terms or an imprint.
---

# legal — starting-point drafts, filled in

The drafts are `src/content/legal/*.md`; `{{TOKENS}}` come from `legal` and `product` in
`src/site.config.ts`; the processor and browser-storage tables are generated from the providers
in use (`src/lib/legal.ts`), so they change when the config does.

1. Collect: company name, address, country, contact email for privacy requests, governing law,
   registration and VAT ID (imprint), refund window for pre-orders.
2. Fill them into `legal` in the config. Set `legal.imprint: true` for Germany/Austria.
3. Edit the drafts only where the owner's business differs (another retention period, more data
   collected). Never write "GDPR-compliant", "lawyer-approved" or similar.
4. **Never set `legal.reviewed: true`.** Tell the owner: the drafts are starting points, not legal
   advice; a person should check them, and then the owner sets the flag, which clears the V07 warning.
5. `npm run build && npm run validate` — V05/V06 list placeholders still empty.
