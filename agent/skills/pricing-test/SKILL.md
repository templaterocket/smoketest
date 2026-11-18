---
name: pricing-test
description: Set up and read the pricing test — fake-door plans that count "Choose plan" clicks with an honest disclosure, or real checkout links — and compare the intent rate with the target. Use when the owner wants to test prices, add plans, or start taking real pre-orders.
---

# pricing-test — measure willingness to pay, honestly

Settings: `pricing` and `hypothesis` in `src/site.config.ts`.

**Fake door** (`pricing.mode: "fake-door"`, default before launch)
- Plans show on the homepage and `/pricing/`. "Choose plan" records one click per plan, visitor and
  day (`POST /api/intent`, the `plan_intent` analytics event) and opens a dialog that says the plan
  is not available yet, that no payment was taken, and offers the waitlist.
- The dialog is required and stays (the page itself carries no notice). No `checkoutUrl` in this
  mode — the config refuses it (`E_CHECKOUT_IN_FAKE_DOOR`), and `validate` V10 checks the build.
- Test 2–3 prices at most; change one thing at a time and note the date in `PROJECT.md`.

**Real money** (`pricing.mode: "checkout"` or a `preorder` CTA)
- Each paid plan gets a hosted checkout URL (Stripe Payment Links, Polar, Lemon Squeezy, Paddle).
  No card fields on this site, ever. The pre-order and refund terms page appears automatically.

**Reading it**
```bash
npm run report -- --remote --pricing-visitors <unique /pricing/ visitors from analytics>
```
Intent rate = plan clicks ÷ unique `/pricing/` visitors, compared with `hypothesis.intentRateTarget`.
Say the numbers and the target; do not declare the idea validated — the owner decides.
