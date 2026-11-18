/**
 * Data subject requests from /legal/data-request: export, delete or unsubscribe. The request is
 * carried out only after the person clicks a link sent to that address, and the answer is the
 * same whether or not the address is on the list.
 */
import { site } from "../../src/site.config";
import { sendEmail } from "./email";
import { type Env, ipHash, isEmail, json, rateLimited, readBody, redirect, text, token, turnstileOk } from "./util";

const KINDS = new Set(["export", "delete", "unsubscribe"]);
const PAGE = "/legal/data-request/";

/** POST /api/data-request */
export async function createRequest(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request);
  const email = text(body?.email, 254)?.toLowerCase();
  const kind = text(body?.kind, 20);
  if (!isEmail(email) || !kind || !KINDS.has(kind)) return json({ ok: false, error: "invalid-request" }, 400);
  if (!(await turnstileOk(request, env, body?.turnstileToken))) return json({ ok: false, error: "verification-failed" }, 400);
  if (await rateLimited(env, await ipHash(request, env), "data-request", 4)) return json({ ok: false, error: "rate-limited" }, 429);

  const known = await env.DB.prepare("SELECT 1 FROM leads WHERE email = ?1").bind(email).first();
  if (known) {
    const value = token();
    await env.DB.prepare("INSERT INTO data_requests (email, kind, token) VALUES (?1, ?2, ?3)").bind(email, kind, value).run();
    const origin = new URL(request.url).origin;
    const action = { export: "send you a copy of the data we hold about this address", delete: "delete everything we hold about this address", unsubscribe: "stop all emails to this address" }[kind as "export" | "delete" | "unsubscribe"];
    await sendEmail(env, {
      to: email,
      subject: `Confirm your data request for ${site.product.name}`,
      paragraphs: [`Someone asked us to ${action}. If that was you, confirm with the link below (it works for 7 days):`, `${origin}/api/data-request/confirm?token=${value}`, "If it wasn’t you, ignore this email; nothing will change."],
    });
  }
  return json({ ok: true });
}

/** GET /api/data-request/confirm?token=… — carries the request out. */
export async function confirmRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const page = new URL(PAGE, url.origin);
  const value = url.searchParams.get("token") ?? "";
  const row = value ? await env.DB.prepare("UPDATE data_requests SET status = 'done', done_at = datetime('now') WHERE token = ?1 AND status = 'pending' AND created_at > datetime('now', '-7 days') RETURNING email, kind").bind(value).first<{ email: string; kind: string }>() : null;
  if (!row) {
    page.searchParams.set("state", "link-invalid");
    return redirect(page);
  }
  if (row.kind === "export") {
    const lead = await env.DB.prepare("SELECT email, name, message, cta, answers, utm, page, referrer, status, referral_code, referrals_credited, consent, created_at, confirmed_at FROM leads WHERE email = ?1").bind(row.email).first();
    await sendEmail(env, { to: row.email, subject: `Your data from ${site.product.name}`, paragraphs: ["Here is everything we hold about this address:", JSON.stringify(lead ?? {}, null, 2)] });
  } else if (row.kind === "delete") {
    await env.DB.prepare("DELETE FROM leads WHERE email = ?1").bind(row.email).run();
    await env.DB.prepare("DELETE FROM data_requests WHERE email = ?1 AND kind != 'delete'").bind(row.email).run();
  } else {
    await env.DB.prepare("UPDATE leads SET status = 'unsubscribed', confirm_token = NULL WHERE email = ?1").bind(row.email).run();
  }
  page.searchParams.set("state", `done-${row.kind}`);
  return redirect(page);
}
