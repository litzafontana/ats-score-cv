import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";
import Readability from "readability-node";

const UA_DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

function isLikelyUrl(s: string) {
  try { new URL(s); return true; } catch { return false; }
}

function safeParse(txt?: string | null) {
  try { return JSON.parse(txt || "null"); } catch { return null; }
}

function cleanHtml(html: string) {
  return cleanText(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/li>/gi, "\n- ")
      .replace(/<[^>]*>/g, "")
  );
}

function cleanText(t: string) {
  return t
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function qualityOK(text: string) {
  const minLen = 400;
  const kw = ["Responsabilidades", "Requisitos", "Benefícios", "Atividades", "Qualificações"];
  const hit = kw.some(k => text.toLowerCase().includes(k.toLowerCase()));
  return text.length >= minLen || hit;
}

async function extractStatic(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA_DESKTOP,
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (!res.ok) return { ok: false as const, text: "" };

    const html = await res.text();
    const $ = cheerio.load(html);

    // JSON-LD JobPosting
    const ldjson = $('script[type="application/ld+json"]').toArray()
      .map(el => safeParse($(el).contents().text()))
      .flatMap(v => Array.isArray(v) ? v : [v])
      .find(v => v && (v["@type"] === "JobPosting" || v.type === "JobPosting"));
    if (ldjson?.description) {
      const text = cleanHtml(String(ldjson.description));
      if (qualityOK(text)) return { ok: true as const, text };
    }

    // Metas
    const og = $('meta[property="og:description"]').attr("content");
    const md = $('meta[name="description"]').attr("content");
    if (og && og.length > 120) {
      const text = cleanText(og);
      if (qualityOK(text)) return { ok: true as const, text };
    }
    if (md && md.length > 120) {
      const text = cleanText(md);
      if (qualityOK(text)) return { ok: true as const, text };
    }

    // Readability
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const art = reader.parse();
    if (art?.textContent) {
      const text = cleanText(art.textContent);
      if (qualityOK(text)) return { ok: true as const, text };
    }

    return { ok: false as const, text: "" };
  } catch {
    return { ok: false as const, text: "" };
  }
}

export async function getJobText(urlOrText: string) {
  if (!isLikelyUrl(urlOrText)) {
    const text = cleanText(urlOrText || "");
    return { ok: Boolean(text), text, source: "pasted" as const };
  }

  const s1 = await extractStatic(urlOrText);
  if (s1.ok && s1.text) return { ...s1, source: "static" as const };

  return { ok: false as const, text: "", source: "static", reason: "blocked_or_dynamic" as const };
}