export const prerender = false;
import type { APIRoute } from "astro";
import { buildQuote } from "@/lib/pricing/pricing";
import { catalog } from "@/lib/pricing/catalog";
import { logger, newReqId } from "@/lib/logger";
import { zQuoteInputSafe, zQuoteOut } from "@/lib/net/schemas";
import { annualEstimateFromSkus } from "@/lib/pricing/annual";

const log = logger("QUOTE");

export const POST: APIRoute = async ({ request }) => {
  const rid = newReqId();
  const raw = await request.json().catch(() => ({}));
  log.info("incoming", { rid, keys: Object.keys(raw || {}) });

  // Derivar campos con suggest.filledFields si faltan
  const suggest = raw?.suggest ?? {};
  const derived = {
    pages: raw.pages ?? suggest.filledFields?.pages ?? 1,
    languages: raw.languages ?? suggest.filledFields?.languages ?? 1,
    products: raw.products ?? suggest.filledFields?.products ?? 0,
    forcedSkus: raw.forcedSkus,
    suggestedSkus: raw.suggestedSkus ?? suggest.skusSuggested,
    customFeatures: [
      ...(Array.isArray(raw.customFeatures) ? raw.customFeatures : []),
      ...(Array.isArray(suggest.customFeatures) ? suggest.customFeatures : []),
    ],
    modifiers: raw.modifiers ?? { urgency: "normal" },
  };

  // Validación de input
  const input = zQuoteInputSafe.parse(derived);

  // Filtra SKUs inválidos
  const valid = new Set(catalog.map((c) => c.id));
  const forcedSkus = (input.forcedSkus ?? []).filter((id) => valid.has(id));
  const suggestedSkus = (input.suggestedSkus ?? []).filter((id) =>
    valid.has(id),
  );

  const output = buildQuote({
    pages: input.pages,
    languages: input.languages,
    products: input.products,
    forcedSkus,
    suggestedSkus,
    customFeatures: input.customFeatures,
    modifiers: input.modifiers,
  });

  // 🔥 NUEVO: estimación anual (no incluida en total)
  const annual = annualEstimateFromSkus({
    skus: [...forcedSkus, ...suggestedSkus],
    pages: input.pages ?? 1,
    languages: input.languages ?? 1,
  });

  // Validación salida + añadimos los campos anuales
  const safeOut = zQuoteOut.parse({
    ...output,
    annualMin: annual.min,
    annualMax: annual.max,
    annualLabel: annual.label,
  });

  log.info("ok", { rid, total: safeOut.total, lines: safeOut.lines.length });
  return new Response(JSON.stringify(safeOut), {
    headers: { "Content-Type": "application/json" },
  });
};
