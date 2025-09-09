import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const urlOrText = String(body?.urlOrText ?? "");

    if (!urlOrText) {
      return new Response(
        JSON.stringify({ ok: false, text: "", reason: "empty_input" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await getJobText(urlOrText);
    return new Response(
      JSON.stringify({
        ok: result.ok,
        text: result.text,
        source: result.source,
        reason: result.reason ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ ok: false, text: "", reason: "unexpected_error" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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
    
    // Simple regex-based parsing for Deno environment
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis);
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        const content = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
        const parsed = safeParse(content);
        const data = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of data) {
          if (item && (item["@type"] === "JobPosting" || item.type === "JobPosting") && item.description) {
            const text = cleanHtml(String(item.description));
            if (qualityOK(text)) return { ok: true as const, text };
          }
        }
      }
    }

    // Meta tags
    const ogMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)/i);
    if (ogMatch && ogMatch[1] && ogMatch[1].length > 120) {
      const text = cleanText(ogMatch[1]);
      if (qualityOK(text)) return { ok: true as const, text };
    }

    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i);
    if (metaMatch && metaMatch[1] && metaMatch[1].length > 120) {
      const text = cleanText(metaMatch[1]);
      if (qualityOK(text)) return { ok: true as const, text };
    }

    // Fallback to body content cleanup
    const bodyMatch = html.match(/<body[^>]*>(.*?)<\/body>/is);
    if (bodyMatch) {
      const bodyContent = bodyMatch[1];
      const cleanBody = cleanHtml(bodyContent);
      if (qualityOK(cleanBody)) return { ok: true as const, text: cleanBody };
    }

    return { ok: false as const, text: "" };
  } catch {
    return { ok: false as const, text: "" };
  }
}

async function getJobText(urlOrText: string) {
  if (!isLikelyUrl(urlOrText)) {
    const text = cleanText(urlOrText || "");
    return { ok: Boolean(text), text, source: "pasted" as const };
  }

  const s1 = await extractStatic(urlOrText);
  if (s1.ok && s1.text) return { ...s1, source: "static" as const };

  return { ok: false as const, text: "", source: "static", reason: "blocked_or_dynamic" as const };
}