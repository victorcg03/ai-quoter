export const prerender = false;
import type { APIRoute } from "astro";
import { makeSuggestPrompt } from "@/lib/ai/prompts";
import { ollamaChat } from "@/lib/ai/ollama";
import { logger, newReqId } from "@/lib/logger";
import { zSuggestOut } from "@/lib/net/schemas";
import { applySuggestPolicy } from "@/lib/policy/suggestPolicy";

const log = logger("SUGGEST");

// ---- helpers limpieza JSON ----
function cleanJsonLike(txt: string) {
  const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const inner = fence ? fence[1] : txt;
  const noLine = inner.replace(/^\s*\/\/.*$/gm, "");
  const noBlock = noLine.replace(/\/\*[\s\S]*?\*\//g, "");
  return noBlock.trim();
}
function tryParse<T>(txt: string): T | null {
  try {
    return JSON.parse(txt) as T;
  } catch {
    return null;
  }
}

// mapear títulos frecuentes a SKUs del catálogo
function titleToSku(title: string): string | null {
  const t = title.toLowerCase();
  if (/faq|preguntas? frecuentes?/.test(t)) return "content.faq";
  if (/whats?app|llamada/.test(t)) return "functional.whatsapp";
  if (/mapa|ubicaci[óo]n|google\s*maps?/.test(t)) return "functional.map";
  if (/blog/.test(t)) return "content.blog";
  if (/testimoni|opiniones|reviews?/.test(t)) return "content.testimonials";
  if (/reserva|booking|pago/.test(t)) return "functional.booking";
  if (/biling[üu]e|idioma|multilenguaje/.test(t)) return "i18n.bilingual";
  if (/responsive|adaptable/.test(t)) return "design.responsive";
  if (/one[-\s]?page|landing/.test(t)) return "site.onepage";
  if (/multi[-\s]?p[aá]gina|corporativa/.test(t)) return "site.multipage";
  if (/seo\s*local|google business|gbp/.test(t)) return "seo.local";
  return null;
}

const FALLBACK = {
  skusSuggested: ["site.onepage", "content.faq"],
  customFeatures: [
    {
      title: "Galería de fotos",
      description: "Muestra actividades y el ambiente.",
      complexity: "low",
      tags: ["galería", "fotos"],
    },
    {
      title: "Mapa con ubicación",
      description: "Mapa embebido.",
      complexity: "low",
      tags: ["mapa", "ubicación"],
    },
  ],
  filledFields: { pages: 3, languages: 1, products: 0 },
  notes: "Propuesta base por contexto incompleto.",
};

export const POST: APIRoute = async ({ request }) => {
  const rid = newReqId();
  let body: any = {};
  try {
    body = await request.json();
  } catch {}

  const avoidSkus: string[] = Array.isArray(body.avoidSkus)
    ? body.avoidSkus
    : [];
  let prompt = makeSuggestPrompt({ ...body, avoidSkus });

  // limitar tamaño por seguridad
  if (prompt.length > 12_000) prompt = prompt.slice(0, 12_000);

  log.info("incoming", { rid, avoid: avoidSkus });

  try {
    const raw = await ollamaChat([{ role: "user", content: prompt }], {
      ns: "SUGGEST",
    });
    const cleaned = cleanJsonLike(raw).slice(0, 50_000);

    // parse -> validar con zod
    let obj = tryParse<any>(cleaned);
    if (!obj) {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) obj = tryParse<any>(m[0]);
    }
    if (!obj) {
      log.error("bad_json", { rid, raw: cleaned.slice(0, 500) });
      return new Response(JSON.stringify(FALLBACK), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // normalizar campos mínimos
    obj.skusSuggested = Array.isArray(obj.skusSuggested)
      ? obj.skusSuggested
      : [];
    obj.customFeatures = Array.isArray(obj.customFeatures)
      ? obj.customFeatures
      : [];
    obj.filledFields = obj.filledFields ?? {
      pages: 3,
      languages: 1,
      products: 0,
    };
    obj.notes = typeof obj.notes === "string" ? obj.notes : "";

    // 1) Mover custom que sean claramente catálogo → skus
    const extraSkus: string[] = [];
    const keepCustom: any[] = [];
    for (const cf of obj.customFeatures) {
      const sku = cf?.title ? titleToSku(String(cf.title)) : null;
      if (sku) extraSkus.push(sku);
      else keepCustom.push(cf);
    }
    obj.customFeatures = keepCustom;
    obj.skusSuggested = Array.from(
      new Set([...(obj.skusSuggested || []), ...extraSkus]),
    );

    // 2) Respetar blacklist (avoidSkus) en skus + custom
    obj.skusSuggested = obj.skusSuggested.filter(
      (id: string) => !avoidSkus.includes(id),
    );
    obj.customFeatures = obj.customFeatures.filter((f: any) => {
      const txt = `${f?.title ?? ""} ${f?.description ?? ""}`.toLowerCase();
      if (
        avoidSkus.includes("content.faq") &&
        /faq|preguntas frecuentes/.test(txt)
      )
        return false;
      if (avoidSkus.includes("functional.whatsapp") && /whats/.test(txt))
        return false;
      if (avoidSkus.includes("functional.map") && /mapa/.test(txt))
        return false;
      return true;
    });

    // 3) Validación final con Zod
    const parsed = zSuggestOut.parse(obj);
    // --- REGLAS DURAS DE NEGOCIO (server-side) ---

    parsed.skusSuggested = applySuggestPolicy(
      {
        pages: Number.isFinite(body?.pages) ? Number(body.pages) : undefined,
        languages: Number.isFinite(body?.languages)
          ? Number(body.languages)
          : undefined,
        products: Number.isFinite(body?.products)
          ? Number(body.products)
          : undefined,
        objetivos: body?.objetivos,
        avoidSkus,
      },
      parsed.skusSuggested,
    );
    log.info("ok", {
      rid,
      skus: parsed.skusSuggested.length,
      custom: parsed.customFeatures.length,
    });
    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    log.error("fail", { rid, error: String(e?.message ?? e) });
    return new Response(JSON.stringify(FALLBACK), {
      headers: { "Content-Type": "application/json" },
    });
  }
};
