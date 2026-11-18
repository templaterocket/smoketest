/**
 * Smoketest — the one file to edit: product, calls to action, where leads go, pricing, the
 * hypothesis, analytics, SEO and legal details. The site and the Worker both read it.
 * Checked at build time against src/config/schema.ts; an invalid value fails with E_CONFIG.
 * Values in {{DOUBLE_BRACES}} are placeholders to replace before launch (`npm run validate` lists them).
 */
import { loadConfig } from "./config/schema";

export const site = loadConfig({
  product: {
    name: "Smoketest",
    description: "An Astro template for testing demand for a SaaS idea before you build it.",
    url: "https://example.com",
  },

  // preset: "forma" (violet) | "ocean" | "forest" | "ember" | "rose" | "graphite" · theme: "light" | "dark" | "system"
  // fonts: "geometric" (Manrope + DM Sans) | "editorial" (Fraunces + Inter) | "technical" (Space Grotesk + IBM Plex Sans)
  // themeToggle: a light/dark switch in the navbar; the visitor's choice is then saved in their browser.
  brand: { preset: "forma", theme: "system", themeToggle: true, fonts: "geometric" },

  // The homepage: "minimal" (hero with the form, FAQ) · "product" (the full page) · "story" (problem → solution → how it works → pricing → FAQ).
  layout: "product",

  cta: {
    // Other kinds: { type: "access", … } · { type: "demo", provider: "cal", url: "https://cal.com/you/demo", label: "Book a demo" }
    // · { type: "preorder", checkoutUrl: "https://…", label: "Pre-order — $39" } · { type: "contact", … }. All of them: /examples/cta.
    primary: { type: "waitlist", label: "Get early access", placeholder: "you@company.com" },
    secondary: { type: "link", label: "See how it works", href: "#how-it-works" },
  },

  leads: {
    // "cloudflare" is the template's own Worker + D1 (worker/). For a quick start without it:
    // { id: "web3forms", accessKey } · { id: "formspree", formId } · { id: "loops", formId } ·
    // { id: "supabase", url, anonKey } · { id: "google-sheets", scriptUrl } · { id: "webhook", url } ·
    // { id: "embed", service: "mailchimp" | "kit" | "mailerlite" | "brevo" | "buttondown", action }.
    provider: { id: "cloudflare" },
    consent: "notice",
    consentText: "No spam: joining means one email at launch. Unsubscribe anytime.",
    successPath: "/thanks/",
    doubleOptIn: true,
    attribution: "url-only",
    referrals: { enabled: true, positionsPerReferral: 5, maxCredited: 10 },
    counter: { enabled: true, threshold: 25, label: "people on the waitlist" },
  },

  pricing: {
    // fake-door: count "Choose plan" clicks with a disclosure, take no money. checkout: link each paid plan to a hosted checkout.
    mode: "fake-door",
    plans: [
      {
        id: "lite",
        name: "Lite",
        description: "A page with a working form, fast.",
        price: "Free",
        note: "MIT license. Clone the public GitHub repo, no purchase needed.",
        features: ["4 pages: home, thanks, privacy, 404", "Light and dark, 6 palettes, 3 font pairs", "Leads via Web3Forms or a webhook", "One privacy policy draft", "Cookieless analytics", "AGENTS.md, CLAUDE.md, brand skill"],
        cta: "Get Lite",
      },
      {
        id: "pro",
        name: "Pro",
        description: "The full demand-testing engine.",
        price: "$49",
        note: "One-time. $39 for the first two weeks after launch.",
        features: ["10 pages, 3 homepage layouts, RSS", "8 lead providers, Worker + D1", "Double opt-in, queue, referrals", "Fake-door /pricing, disclosed", "5 legal drafts, data requests", "validate, report, 8 agent skills"],
        highlighted: true,
        badge: "Recommended",
      },
      {
        id: "agency",
        name: "Agency",
        description: "Everything in Pro, for client work.",
        price: "$129–149",
        note: "One-time. Final price and license scope set at launch.",
        features: ["Everything in Pro", "Commercial license for client sites", "Many client sites, one purchase", "Free updates in the major version", "All 8 agent skills on every site", "validate and report on every site"],
      },
    ],
  },

  hypothesis: {
    statement: "Founders who build with coding agents will pay $49 for a template that tests demand for them.",
    intentRateTarget: 0.1,
    signupTarget: 100,
  },

  // Cookieless options: plausible, umami, fathom, cloudflare. ga4 sets cookies and brings a consent banner.
  analytics: { provider: { id: "none" }, respectDoNotTrack: true },

  seo: { ogImage: "/og-default.png", locale: "en" },

  legal: {
    companyName: "{{COMPANY_NAME}}",
    contactEmail: "privacy@example.com",
    address: "{{COMPANY_ADDRESS}}",
    country: "{{COUNTRY}}",
    governingLaw: "{{GOVERNING_LAW}}",
    effectiveDate: "2026-10-30",
    hosting: "cloudflare", // or "netlify", "vercel", "other": named in the privacy policy
    imprint: false,
    refundDays: 14,
    reviewed: false,
  },
});
