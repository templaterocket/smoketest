---
name: results
description: Reads the demand test — confirmed signups, sources, referrals and plan clicks against the hypothesis — and summarises what the numbers say without overclaiming. Use when the owner asks "how is it going", "did it work", or wants a results summary.
---

# results — what the test measured

```bash
npm run report -- --remote --pricing-visitors <unique /pricing/ visitors from analytics>
```

Summarise in this order:
1. **Against the hypothesis**: confirmed signups vs `hypothesis.signupTarget`; intent rate vs
   `hypothesis.intentRateTarget` (only with `--pricing-visitors`).
2. **Quality**: share of signups that confirmed; answers to qualifying questions (query D1 if needed).
3. **Where they came from**: top sources; which channel to double down on.
4. **Prices**: which plan was chosen most.
5. **Caveats**: sample size (fewer than ~100 visitors per variant is noise), changes made during the
   test (from `PROJECT.md`), traffic sources that skew results.

State numbers and comparisons. Do not say the idea is "validated" or "proven": the template
measures interest; the owner decides what it means.
