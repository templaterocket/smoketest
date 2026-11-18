/** /rss.xml — the changelog as an RSS 2.0 feed (links relative while product.url is a placeholder). */
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { absolute } from "../lib/url";
import { site } from "../site.config";

const escape = (value: string): string => value.replace(/[&<>"']/gu, (c) => `&#${c.charCodeAt(0)};`);

export const GET: APIRoute = async () => {
  const entries = (await getCollection("changelog")).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  const link = absolute("/changelog/");
  const items = entries.map((entry) => `    <item>
      <title>${escape(entry.data.title)}</title>
      <link>${link}#${entry.id}</link>
      <guid isPermaLink="false">${escape(entry.id)}</guid>
      <pubDate>${entry.data.date.toUTCString()}</pubDate>
      <description>${escape(entry.body?.trim() ?? "")}</description>
    </item>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escape(site.product.name)} changelog</title>
    <link>${link}</link>
    <description>${escape(`What’s new in ${site.product.name}.`)}</description>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
};
