/**
 * Smoketest — the one file to edit: product, calls to action, where leads go, pricing, the
 * hypothesis, analytics, SEO and legal details. The site and the Worker both read it.
 * Checked at build time against src/config/schema.ts; an invalid value fails with E_CONFIG.
 * Values in {{DOUBLE_BRACES}} are placeholders to replace before launch (`npm run validate` lists them).
 */
import { loadConfig } from "./config/schema";

export const site = loadConfig({
  // The sample content is a made-up product, Paylark: replace it with yours (or run /validate-setup).
  product: {
    name: "Paylark",
    description: "Polite reminders for unpaid invoices, sent on schedule until the client pays.",
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
    primary: { type: "waitlist", label: "Join the waitlist", placeholder: "you@example.com" },
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
        id: "solo",
        name: "Solo",
        description: "For a freelancer with a few clients.",
        price: "$5",
        period: "/mo",
        note: "Billed monthly. Cancel anytime.",
        features: ["Up to 10 open invoices", "4 reminder steps per invoice", "Friendly, neutral and firm wording", "Sent from your own address"],
      },
      {
        id: "studio",
        name: "Studio",
        description: "For a small studio that bills every week.",
        price: "$12",
        period: "/mo",
        note: "Billed monthly. Cancel anytime.",
        features: ["Unlimited open invoices", "Your own schedule per client", "Edit the wording of every step", "A payment link in each reminder", "Pause a client in one click"],
        highlighted: true,
        badge: "Recommended",
      },
      {
        id: "agency",
        name: "Agency",
        description: "For teams that bill many clients.",
        price: "$29",
        period: "/mo",
        note: "Billed monthly. Up to 5 people.",
        features: ["Everything in Studio", "5 team members", "Reminders in your clients' languages", "A monthly summary of what was paid", "Priority email support"],
      },
    ],
  },

  hypothesis: {
    statement: "Freelancers who chase late invoices by hand will pay $12 a month to have it done for them, politely.",
    intentRateTarget: 0.1,
    signupTarget: 100,
  },

  // Cookieless options: plausible, umami, fathom, cloudflare. ga4 sets cookies and brings a consent banner.
  analytics: { provider: { id: "none" }, respectDoNotTrack: true },

  seo: { ogImage: "/og-default.png", locale: "en" },

  // A "Template by ShipThemes" link in the footer. Optional (MIT doesn't require it): false removes it.
  credit: true,

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
