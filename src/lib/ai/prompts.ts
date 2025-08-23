import { catalog } from "../pricing/catalog";

export function makeSuggestPrompt(ctx: {
  sector?: string;
  descripcion?: string;
  objetivos?: string;
  presupuestoAprox?: number;
  avoidSkus?: string[];
}) {
  const hints = [
    ctx?.presupuestoAprox
      ? `- Presupuesto aprox: ${ctx.presupuestoAprox}`
      : null,
    typeof (ctx as any).pages === "number"
      ? `- Páginas conocidas: ${(ctx as any).pages}`
      : null,
    typeof (ctx as any).languages === "number"
      ? `- Idiomas conocidos: ${(ctx as any).languages}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
  const catalogIds = catalog.map((c) => c.id).join(", ");
  const avoidLine = ctx.avoidSkus?.length
    ? `- No sugieras estos elementos ni equivalentes: [${ctx.avoidSkus.join(
        ", ",
      )}].`
    : "";

  return `
Eres un asesor de propuestas web. Devuelve ÚNICAMENTE JSON:
{
  "skusSuggested": string[],
  "customFeatures": [
    { "title": string, "description": string, "complexity": "low"|"med"|"high", "tags": string[] }
  ],
  "filledFields": { "pages": number, "languages": number, "products": number },
  "notes": string
}
Invariantes:
- Sugiere SOLO IDs del catálogo listado.
- Si el usuario rechazó algo, no lo incluyas ni como "customFeature".
- Si Páginas=1 ⇒ NO multipágina; incluye "one-page" si aplica.
${hints ? `\nPistas conocidas:\n${hints}\n` : ""}
Reglas:
- Catálogo disponible: [${catalogIds}]
- Respeta estrictamente lo vetado. ${avoidLine}
- Puedes proponer "customFeatures" si no existe SKU equivalente, siempre que sea sensato y realizable por un dev fullstack.
- Evita inventar tarifas o planes mensuales genéricos.
- Aun con poco contexto, incluye 2–3 sugerencias sencillas y útiles.

Contexto:
- Sector: ${ctx.sector ?? "-"}
- Descripción: ${ctx.descripcion ?? "-"}
- Objetivos: ${ctx.objetivos ?? "-"}
- Presupuesto: ${ctx.presupuestoAprox ?? "-"}
`;
}
