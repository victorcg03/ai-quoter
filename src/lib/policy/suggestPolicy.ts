// lib/policy/suggestPolicy.ts
import { catalog } from "@/lib/pricing/catalog";
const valid = new Set(catalog.map((c) => c.id));

export type SuggestCtx = {
  pages?: number;
  languages?: number;
  products?: number;
  objetivos?: string; // "leads" | "reservas" | "ecommerce" | "branding" | ...
  avoidSkus?: string[];
};

export function applySuggestPolicy(ctx: SuggestCtx, skusIn: string[]) {
  const out = new Set(skusIn.filter((id) => valid.has(id)));

  // 1) VETOS globales
  (ctx.avoidSkus ?? []).forEach((id) => out.delete(id));

  // 2) Single-page ⇢ forzar onepage, quitar multipage
  if (ctx.pages === 1) {
    out.delete("site.multipage");
    out.add("site.onepage");
  }
  if (!/e-?commerce|tienda|productos?/i.test(ctx.objetivos ?? "")) {
    out.delete("ecom.catalog");
  }
  // 3) Idiomas
  if ((ctx.languages ?? 1) > 1) out.add("i18n.bilingual");

  // 4) Objetivo ⇒ recomendaciones mínimas
  const goal = (ctx.objetivos ?? "").toLowerCase();
  if (/lead|contact/.test(goal)) {
    out.add("functional.contactForm");
    out.add("functional.whatsapp");
  }
  if (/reserva/.test(goal)) {
    out.add("functional.booking");
    out.add("content.menus.basic"); // requiere
  }
  if (/e-?commerce|tienda/.test(goal)) {
    out.add("ecom.catalog");
    out.add("content.menus.basic");
  }
  if (/branding/.test(goal)) {
    // branding suele ser simple; no fuerces multipágina ni ecom
    out.delete("site.multipage");
  }

  // 5) Coherencia básica
  if (out.has("functional.booking")) out.add("content.menus.basic");
  // evitar combinaciones contradictorias
  if (ctx.pages === 1) out.delete("content.menus.basic"); // navegación compleja no aplica a one-page

  return Array.from(out);
}
