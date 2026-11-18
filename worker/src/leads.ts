/**
 * The leads API: signup, email confirmation, queue position and referrals, the honest counter,
 * unsubscribe and fake-door intents. Every rule comes from src/site.config.ts.
 */
import { site } from "../../src/site.config";
import { sendEmail } from "./email";
import { type Env, ipHash, isEmail, json, rateLimited, readBody, redirect, referralCode, stringRecord, text, token, turnstileOk } from "./util";

const CTA_KINDS = new Set(["waitlist", "access", "contact"]);
const { doubleOptIn, referrals, counter } = site.leads;

interface LeadRow {
  id: number;
  email: string;
  name: string | null;
  message: string | null;
  cta: string;
  answers: string;
  status: "pending" | "confirmed" | "unsubscribed";
  confirm_token: string | null;
  unsubscribe_token: string;
  referral_code: string;
  referred_by: number | null;
  referrals_credited: number;
  created_at: string;
}

const unsubscribeUrl = (origin: string, lead: Pick<LeadRow, "unsubscribe_token">): string => `${origin}/api/unsubscribe?token=${lead.unsubscribe_token}`;

/** Sends (or re-sends) the confirmation email and records the attempt. */
export async function sendConfirmation(env: Env, origin: string, lead: LeadRow): Promise<void> {
  if (!lead.confirm_token) return;
  const sent = await sendEmail(env, {
    to: lead.email,
    subject: `Confirm your email for ${site.product.name}`,
    paragraphs: [
      `Thanks for signing up for ${site.product.name}. Please confirm this is your address — one click and you’re on the list:`,
      `${origin}/api/confirm?token=${lead.confirm_token}`,
      "If you didn’t sign up, ignore this email and you won’t hear from us again.",
    ],
    unsubscribeUrl: unsubscribeUrl(origin, lead),
  });
  await env.DB.prepare("UPDATE leads SET email_attempts = email_attempts + 1, email_sent_at = CASE WHEN ?2 THEN datetime('now') ELSE email_sent_at END WHERE id = ?1").bind(lead.id, sent ? 1 : 0).run();
}

/** Tells the owner about a contact or access request (OWNER_EMAIL), and the webhook about any lead. */
function notify(env: Env, ctx: ExecutionContext, event: "lead.created" | "lead.confirmed", lead: Record<string, unknown>): void {
  if (env.LEADS_WEBHOOK_URL) {
    ctx.waitUntil(fetch(env.LEADS_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event, lead }) }).catch(() => undefined));
  }
  if (event === "lead.created" && env.OWNER_EMAIL && (lead.cta === "contact" || lead.cta === "access")) {
    const lines = Object.entries(lead).filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
    ctx.waitUntil(sendEmail(env, { to: env.OWNER_EMAIL, subject: `New ${String(lead.cta)} request on ${site.product.name}`, paragraphs: lines }));
  }
}

/** POST /api/leads — the same answer whether the address is new or already listed. */
export async function createLead(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const body = await readBody(request);
  if (!body) return json({ ok: false, error: "invalid-request" }, 400);
  const email = text(body.email, 254)?.toLowerCase();
  const cta = text(body.cta, 20) ?? "waitlist";
  if (!isEmail(email) || !CTA_KINDS.has(cta)) return json({ ok: false, error: "invalid-email" }, 400);
  if (!(await turnstileOk(request, env, body.turnstileToken))) return json({ ok: false, error: "verification-failed" }, 400);
  const hash = await ipHash(request, env);
  if (await rateLimited(env, hash, "leads", 8)) return json({ ok: false, error: "rate-limited" }, 429);

  const origin = new URL(request.url).origin;
  // A contact message is not a signup: no confirmation email, no place in the queue or the counter.
  const listed = cta !== "contact";
  const confirmFirst = doubleOptIn && listed;
  const existing = await env.DB.prepare("SELECT * FROM leads WHERE email = ?1").bind(email).first<LeadRow>();
  if (existing && !listed) {
    // A known address writing again: the message still reaches the owner.
    notify(env, ctx, "lead.created", { email, cta, name: text(body.name, 120), message: text(body.message, 4000) });
    return json({ ok: true, next: "done" });
  }
  if (existing) {
    // A second signup with a pending address re-sends the link (at most every two minutes).
    if (existing.status === "pending" && confirmFirst) {
      const recent = await env.DB.prepare("SELECT 1 FROM leads WHERE id = ?1 AND email_sent_at > datetime('now', '-2 minutes')").bind(existing.id).first();
      if (!recent) ctx.waitUntil(sendConfirmation(env, origin, existing));
    }
    return json({ ok: true, next: confirmFirst ? "confirm-email" : "done" });
  }

  const referrer = referrals.enabled ? text(body.ref, 16) : undefined;
  const referredBy = referrer ? await env.DB.prepare("SELECT id FROM leads WHERE referral_code = ?1").bind(referrer).first<{ id: number }>() : null;
  const fields = {
    email,
    name: text(body.name, 120) ?? null,
    message: text(body.message, 4000) ?? null,
    cta,
    answers: JSON.stringify(stringRecord(body.answers, 8)),
    utm: JSON.stringify(stringRecord(body.utm, 8, 200)),
    page: text(body.page, 200) ?? null,
    referrer: text(body.referrer, 500) ?? null,
    status: confirmFirst ? "pending" : "confirmed",
    confirm_token: confirmFirst ? token() : null,
    unsubscribe_token: token(),
    referral_code: referralCode(),
    referred_by: referredBy?.id ?? null,
    consent: text(body.consent, 300) ?? site.leads.consentText,
  };
  // The row is written before any email goes out; a failed send is retried by the daily job.
  const lead = await env.DB.prepare(
    `INSERT INTO leads (email, name, message, cta, answers, utm, page, referrer, status, confirm_token, unsubscribe_token, referral_code, referred_by, consent, ip_hash, confirmed_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, CASE WHEN ?9 = 'confirmed' THEN datetime('now') END)
     ON CONFLICT (email) DO NOTHING RETURNING *`,
  ).bind(fields.email, fields.name, fields.message, fields.cta, fields.answers, fields.utm, fields.page, fields.referrer, fields.status, fields.confirm_token, fields.unsubscribe_token, fields.referral_code, fields.referred_by, fields.consent, hash).first<LeadRow>();
  if (!lead) return json({ ok: true, next: confirmFirst ? "confirm-email" : "done" });

  notify(env, ctx, "lead.created", { ...fields, answers: JSON.parse(fields.answers), utm: JSON.parse(fields.utm), confirm_token: undefined, unsubscribe_token: undefined });
  if (confirmFirst) {
    ctx.waitUntil(sendConfirmation(env, origin, lead));
    return json({ ok: true, next: "confirm-email" });
  }
  if (!listed) return json({ ok: true, next: "done" });
  if (lead.referred_by) await credit(env, lead.referred_by);
  return json({ ok: true, next: "done", code: referrals.enabled ? lead.referral_code : undefined });
}

/** Credits one confirmed referral to the referrer, up to the configured cap. */
async function credit(env: Env, referrerId: number): Promise<void> {
  await env.DB.prepare("UPDATE leads SET referrals_credited = MIN(referrals_credited + 1, ?2) WHERE id = ?1").bind(referrerId, referrals.maxCredited).run();
}

/** GET /api/confirm?token=… — the link in the confirmation email. */
export async function confirmLead(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const thanks = new URL(site.leads.successPath, url.origin);
  const value = url.searchParams.get("token") ?? "";
  const lead = value ? await env.DB.prepare("UPDATE leads SET status = 'confirmed', confirmed_at = datetime('now'), confirm_token = NULL WHERE confirm_token = ?1 AND status = 'pending' RETURNING *").bind(value).first<LeadRow>() : null;
  if (!lead) {
    thanks.searchParams.set("state", "link-invalid");
    return redirect(thanks);
  }
  if (lead.referred_by && referrals.enabled) await credit(env, lead.referred_by);
  notify(env, ctx, "lead.confirmed", { email: lead.email, cta: lead.cta });
  thanks.searchParams.set("cta", lead.cta);
  thanks.searchParams.set("state", "confirmed");
  if (referrals.enabled) thanks.searchParams.set("code", lead.referral_code);
  return redirect(thanks);
}

/**
 * The queue: a confirmed signup's place is 1 + the confirmed signups ahead of it, ordered by
 * signup number minus `positionsPerReferral` for each credited referral (capped). A real order,
 * not a decoration: it is what the owner sees in `npm run report`.
 */
async function position(env: Env, lead: Pick<LeadRow, "id" | "referrals_credited">): Promise<number> {
  const per = referrals.positionsPerReferral;
  const cap = referrals.maxCredited;
  const key = lead.id - per * Math.min(lead.referrals_credited, cap);
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS ahead FROM leads WHERE status = 'confirmed' AND cta != 'contact' AND id != ?4
       AND ((id - ?1 * MIN(referrals_credited, ?2)) < ?3 OR ((id - ?1 * MIN(referrals_credited, ?2)) = ?3 AND id < ?4))`,
  ).bind(per, cap, key, lead.id).first<{ ahead: number }>();
  return (row?.ahead ?? 0) + 1;
}

/** GET /api/status?code=… — place in the queue and referrals, for the thank-you page. */
export async function leadStatus(request: Request, env: Env): Promise<Response> {
  const code = new URL(request.url).searchParams.get("code") ?? "";
  const lead = code ? await env.DB.prepare("SELECT id, status, referrals_credited FROM leads WHERE referral_code = ?1 AND cta != 'contact'").bind(code).first<Pick<LeadRow, "id" | "status" | "referrals_credited">>() : null;
  if (!lead || lead.status !== "confirmed") return json({ ok: false }, 404);
  return json({ ok: true, position: await position(env, lead), referrals: lead.referrals_credited, perReferral: referrals.positionsPerReferral });
}

/** GET /api/count — the honest counter: confirmed signups, or null below the threshold. */
export async function leadCount(env: Env): Promise<Response> {
  if (!counter.enabled) return json({ count: null });
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM leads WHERE status = 'confirmed' AND cta != 'contact'").first<{ n: number }>();
  const count = row?.n ?? 0;
  return new Response(JSON.stringify({ count: count >= counter.threshold ? count : null }), { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" } });
}

/** GET or POST /api/unsubscribe?token=… — the link in every email (POST is one-click unsubscribe). */
export async function unsubscribe(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const value = url.searchParams.get("token") ?? "";
  if (value) await env.DB.prepare("UPDATE leads SET status = 'unsubscribed', confirm_token = NULL WHERE unsubscribe_token = ?1").bind(value).run();
  if (request.method === "POST") return new Response(null, { status: 204 });
  const thanks = new URL(site.leads.successPath, url.origin);
  thanks.searchParams.set("state", "unsubscribed");
  return redirect(thanks);
}

/** POST /api/intent — a fake-door click, counted once per plan, visitor and day. */
export async function recordIntent(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request);
  const plan = text(body?.plan, 40);
  if (!plan || !site.pricing.plans.some((p) => p.id === plan)) return json({ ok: false }, 400);
  const hash = await ipHash(request, env);
  await env.DB.prepare("INSERT INTO intents (plan, page, ip_hash, day) VALUES (?1, ?2, ?3, date('now')) ON CONFLICT DO NOTHING").bind(plan, text(body?.page, 200) ?? null, hash).run();
  return new Response(null, { status: 204 });
}

/** The daily job: retry confirmation emails that did not go out. */
export async function retryConfirmations(env: Env, origin: string): Promise<void> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM leads WHERE status = 'pending' AND email_attempts < 5 AND email_sent_at IS NULL AND created_at > datetime('now', '-3 days') LIMIT 50`,
  ).all<LeadRow>();
  for (const lead of results) await sendConfirmation(env, origin, lead);
}
