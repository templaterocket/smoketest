/**
 * Smoketest's Worker: the leads API under /api/*; everything else is the static site in dist/.
 *
 *   POST /api/leads                    signup (waitlist, access, contact)
 *   GET  /api/confirm?token=           double opt-in link
 *   GET  /api/status?code=             queue position and referrals
 *   GET  /api/count                    honest counter
 *   GET|POST /api/unsubscribe?token=   unsubscribe (POST: one-click)
 *   POST /api/intent                   fake-door plan click
 *   POST /api/data-request             export / delete / unsubscribe request
 *   GET  /api/data-request/confirm     carries a verified request out
 */
import { site } from "../../src/site.config";
import { confirmLead, createLead, leadCount, leadStatus, recordIntent, retryConfirmations, unsubscribe } from "./leads";
import { confirmRequest, createRequest } from "./requests";
import { type Env, json } from "./util";

type Handler = (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response>;

const routes: Record<string, Partial<Record<string, Handler>>> = {
  "/api/leads": { POST: createLead },
  "/api/confirm": { GET: confirmLead },
  "/api/status": { GET: leadStatus },
  "/api/count": { GET: (_request, env) => leadCount(env) },
  "/api/unsubscribe": { GET: unsubscribe, POST: unsubscribe },
  "/api/intent": { POST: recordIntent },
  "/api/data-request": { POST: createRequest },
  "/api/data-request/confirm": { GET: confirmRequest },
};

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    const handler = routes[url.pathname]?.[request.method];
    if (!handler) return json({ ok: false, error: "not-found" }, 404);
    // Forms post from this site only.
    const origin = request.headers.get("Origin");
    if (request.method === "POST" && origin && origin !== url.origin && url.pathname !== "/api/unsubscribe") return json({ ok: false, error: "forbidden" }, 403);
    try {
      return await handler(request, env, ctx);
    } catch (error) {
      console.error("[smoketest] API error", url.pathname, error);
      return json({ ok: false, error: "server-error" }, 500);
    }
  },

  async scheduled(_controller, env): Promise<void> {
    const days = Number(env.IP_HASH_RETENTION_DAYS ?? "30") || 30;
    await retryConfirmations(env, new URL(site.product.url).origin);
    await env.DB.batch([
      env.DB.prepare("UPDATE leads SET ip_hash = NULL WHERE ip_hash IS NOT NULL AND created_at < datetime('now', ?1)").bind(`-${days} days`),
      env.DB.prepare("UPDATE intents SET ip_hash = NULL WHERE ip_hash IS NOT NULL AND created_at < datetime('now', ?1)").bind(`-${days} days`),
      env.DB.prepare("DELETE FROM leads WHERE status = 'pending' AND created_at < datetime('now', '-30 days')"),
      env.DB.prepare("DELETE FROM attempts WHERE created_at < datetime('now', '-1 day')"),
      env.DB.prepare("DELETE FROM data_requests WHERE status = 'pending' AND created_at < datetime('now', '-7 days')"),
    ]);
  },
} satisfies ExportedHandler<Env>;
