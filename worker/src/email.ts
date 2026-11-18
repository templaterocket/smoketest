/**
 * Email through Resend. Without RESEND_API_KEY (local development) every email is printed to the
 * Worker log instead, links included, so the whole flow can be clicked through locally.
 */
import { site } from "../../src/site.config";
import type { Env } from "./util";

interface Message {
  to: string;
  subject: string;
  /** Paragraphs of plain text; a paragraph that is a URL becomes a button in the HTML. */
  paragraphs: string[];
  unsubscribeUrl?: string;
}

const escape = (value: string): string => value.replace(/[&<>"']/gu, (c) => `&#${c.charCodeAt(0)};`);

function html(message: Message): string {
  const body = message.paragraphs.map((p) => /^https?:\/\//u.test(p)
    ? `<p style="margin:28px 0"><a href="${escape(p)}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#5B3FE0;color:#ffffff;font-weight:600;text-decoration:none">${p.includes("/confirm") ? "Confirm my email" : "Open"}</a></p><p style="margin:0 0 16px;color:#687083;font-size:13px;word-break:break-all">${escape(p)}</p>`
    : `<p style="margin:0 0 16px">${escape(p)}</p>`).join("");
  const footer = message.unsubscribeUrl ? `<p style="margin:32px 0 0;color:#687083;font-size:12px">You get this because this address was entered on ${escape(site.product.name)}. <a href="${escape(message.unsubscribeUrl)}" style="color:#687083">Unsubscribe</a>.</p>` : "";
  return `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#F9F7FC"><div style="max-width:520px;margin:0 auto;padding:32px;border-radius:16px;background:#ffffff;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#1B1426"><p style="margin:0 0 24px;font-weight:700;font-size:18px">${escape(site.product.name)}</p>${body}${footer}</div></body></html>`;
}

/** Sends one email; resolves to whether it was accepted. */
export async function sendEmail(env: Env, message: Message): Promise<boolean> {
  const text = [...message.paragraphs, ...(message.unsubscribeUrl ? ["", `Unsubscribe: ${message.unsubscribeUrl}`] : [])].join("\n\n");
  if (!env.RESEND_API_KEY) {
    console.log(`[smoketest] email (RESEND_API_KEY not set, not sent)\nTo: ${message.to}\nSubject: ${message.subject}\n\n${text}`);
    return true;
  }
  const headers: Record<string, string> = {};
  if (message.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${message.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [message.to], subject: message.subject, html: html(message), text, headers }),
    });
    if (!response.ok) console.error(`[smoketest] Resend refused the email: ${response.status} ${await response.text()}`);
    return response.ok;
  } catch (error) {
    console.error("[smoketest] Resend unreachable", error);
    return false;
  }
}
