// Edge Function: translate
//
// POST { texts: string[], target_lang?: 'EN-US' | 'EN-GB' }
//   -> { translations: { [sourceText]: translatedText } }
//
// Pipeline:
//   1. Dedup + sanitize textos de entrada.
//   2. Buscar en la tabla `translations` los que ya existen.
//   3. Solo los que falten se envían a DeepL Free (https://api-free.deepl.com/v2/translate).
//   4. Las nuevas traducciones se persisten (upsert) para reutilizarlas.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const DEEPL_API_KEY = Deno.env.get("DEEPL_API_KEY") ?? "";

// IMPORTANTE: clave del plan FREE (termina en :fx) -> endpoint api-free.deepl.com
const DEEPL_ENDPOINT = "https://api-free.deepl.com/v2/translate";

// Límites defensivos
const MAX_TEXTS_PER_REQUEST = 80;
const MAX_TEXT_LEN = 2000;
const DEEPL_BATCH_SIZE = 30; // DeepL acepta hasta 50; nos quedamos por debajo

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

async function deepLTranslate(
  texts: string[],
  targetLang: string,
): Promise<string[]> {
  if (texts.length === 0) return [];
  const out: string[] = new Array(texts.length);
  for (let i = 0; i < texts.length; i += DEEPL_BATCH_SIZE) {
    const batch = texts.slice(i, i + DEEPL_BATCH_SIZE);
    const res = await fetch(DEEPL_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: batch,
        source_lang: "ES",
        target_lang: targetLang,
        preserve_formatting: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `DeepL ${res.status}: ${body.slice(0, 250) || res.statusText}`,
      );
    }
    const data = await res.json();
    const list = (data?.translations ?? []) as { text?: string }[];
    for (let j = 0; j < batch.length; j++) {
      out[i + j] = typeof list[j]?.text === "string"
        ? (list[j].text as string)
        : batch[j];
    }
  }
  return out;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  if (!DEEPL_API_KEY) {
    return json({ error: "DEEPL_API_KEY not configured" }, { status: 500 });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Supabase env not configured" }, { status: 500 });
  }

  let body: { texts?: unknown; target_lang?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // target_lang normalizado a EN-US / EN-GB (DeepL ya no acepta solo "EN" sin sufijo)
  const rawTarget = String(body.target_lang || "EN-US").toUpperCase();
  const targetLang = rawTarget === "EN-GB" ? "EN-GB" : "EN-US";

  if (!Array.isArray(body.texts)) {
    return json({ error: "`texts` must be an array of strings" }, {
      status: 400,
    });
  }

  // 1. Dedup + sanitize
  const seen = new Set<string>();
  const inputs: string[] = [];
  for (const t of body.texts) {
    if (typeof t !== "string") continue;
    const s = t.trim();
    if (!s) continue;
    if (s.length > MAX_TEXT_LEN) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    inputs.push(s);
    if (inputs.length >= MAX_TEXTS_PER_REQUEST) break;
  }

  if (inputs.length === 0) {
    return json({ translations: {} });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 2. Buscar en caché
  const result: Record<string, string> = {};
  const { data: cached, error: cacheErr } = await supabase
    .from("translations")
    .select("source_text, translated_text")
    .eq("target_lang", targetLang)
    .in("source_text", inputs);

  if (cacheErr) {
    console.error("[translate] cache select error", cacheErr);
  } else if (Array.isArray(cached)) {
    for (const row of cached) {
      if (row?.source_text && typeof row.translated_text === "string") {
        result[row.source_text] = row.translated_text;
      }
    }
  }

  // 3. Traducir los que faltan
  const misses = inputs.filter((t) => !(t in result));

  if (misses.length > 0) {
    let translations: string[];
    try {
      translations = await deepLTranslate(misses, targetLang);
    } catch (err) {
      console.error("[translate] DeepL error", err);
      // Devolvemos lo que tengamos en caché aunque falle DeepL.
      return json(
        {
          error: String((err as Error)?.message || err),
          translations: result,
        },
        { status: 502 },
      );
    }

    // 4. Persistir
    const rows = misses.map((src, i) => ({
      source_text: src,
      target_lang: targetLang,
      translated_text: translations[i],
    }));
    const { error: upsertErr } = await supabase
      .from("translations")
      .upsert(rows, { onConflict: "target_lang,source_text" });
    if (upsertErr) {
      console.error("[translate] upsert error", upsertErr);
    }
    for (const r of rows) {
      result[r.source_text] = r.translated_text;
    }
  }

  return json({ translations: result });
});
