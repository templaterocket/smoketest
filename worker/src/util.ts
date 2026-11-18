/** Small helpers shared by the Worker's routes. */

export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  EMAIL_FROM?: string;
  OWNER_EMAIL?: string;
  IP_HASH_RETENTION_DAYS?: string;
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  IP_HASH_SALT?: string;
  LEADS_WEBHOOK_URL?: string;
}

export const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

export const redirect = (url: URL | string, status = 303): Response =>
  new Response(null, { status, headers: { Location: String(url), "Cache-Control": "no-store" } });

/** A URL-safe random token. */
export function token(bytes = 24): string {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...data)).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}

const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** A short, unambiguous referral code. */
export function referralCode(length = 8): string {
  const data = crypto.getRandomValues(new Uint8Array(length));
  return [...data].map((n) => CODE_ALPHABET[n % CODE_ALPHABET.length]).join("");
}

/** HMAC-SHA256 of the visitor's IP; the raw IP never reaches the database. */
export async function ipHash(request: Request, env: Env): Promise<string | null> {
  const ip = request.headers.get("CF-Connecting-IP");
  if (!ip) return null;
  const salt = env.IP_HASH_SALT ?? "smoketest-dev-salt";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(salt), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;
export const isEmail = (value: unknown): value is string => typeof value === "string" && value.length <= 254 && EMAIL.test(value);

/** A trimmed string no longer than `max`, or undefined. */
export function text(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

/** A flat object of short strings (answers, UTM tags), with at most `keys` entries. */
export function stringRecord(value: unknown, keys = 12, max = 500): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value).slice(0, keys)) {
    const clean = text(item, max);
    if (clean && /^[a-z0-9_]{1,40}$/iu.test(key)) out[key] = clean;
  }
  return out;
}

/** Reads a small JSON body, refusing anything over 16 KB. */
export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  if (!(request.headers.get("Content-Type") ?? "").includes("application/json")) return null;
  const raw = await request.text();
  if (raw.length > 16_384) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Cloudflare Turnstile; skipped when no secret is set (local development). */
export async function turnstileOk(request: Request, env: Env, response: unknown): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (typeof response !== "string" || !response) return false;
  const form = new FormData();
  form.set("secret", env.TURNSTILE_SECRET_KEY);
  form.set("response", response);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) form.set("remoteip", ip);
  const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const body = (await result.json()) as { success?: boolean };
  return body.success === true;
}

/** At most `limit` submissions to one route per IP hash in ten minutes. Records this one. */
export async function rateLimited(env: Env, hash: string | null, route: string, limit: number): Promise<boolean> {
  if (!hash) return false;
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM attempts WHERE ip_hash = ?1 AND route = ?2 AND created_at > datetime('now', '-10 minutes')").bind(hash, route).first<{ n: number }>();
  await env.DB.prepare("INSERT INTO attempts (ip_hash, route) VALUES (?1, ?2)").bind(hash, route).run();
  return (row?.n ?? 0) >= limit;
}
