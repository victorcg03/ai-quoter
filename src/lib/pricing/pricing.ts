// Reemplaza la cabecera y el comienzo de buildQuote por esto:
import { catalog } from "./catalog";
import type { SKU } from "./catalog";
import { estimateCustom } from "./estimator";

export type QuoteInput = {
  pages?: number;
  languages?: number;
  products?: number;
  forcedSkus?: string[]; // <-- opcional
  suggestedSkus?: string[]; // <-- opcional
  customFeatures?: Array<{
    title: string;
    description?: string;
    complexity?: "low" | "med" | "high";
    tags?: string[];
  }>;
  modifiers?: { urgency?: "normal" | "rush" };
};

export function buildQuote(input: QuoteInput) {
  const index = new Map(catalog.map((s) => [s.id, s]));

  // Normaliza a arrays vacíos si vienen undefined o mal tipados
  const forced = Array.isArray(input.forcedSkus) ? input.forcedSkus : [];
  const suggested = Array.isArray(input.suggestedSkus)
    ? input.suggestedSkus
    : [];

  const selected = new Set(
    [...forced, ...suggested].filter((id) => index.has(id)),
  );

  // ---------- dependencias ----------
  let prev = -1;
  while (prev !== selected.size) {
    prev = selected.size;
    for (const id of Array.from(selected)) {
      const sku = index.get(id)!;
      sku.constraints?.requires?.forEach((req) => selected.add(req));
    }
  }
  // ---------- exclusiones ----------
  for (const id of Array.from(selected)) {
    index.get(id)?.constraints?.excludes?.forEach((ex) => selected.delete(ex));
  }

  const lines: {
    id: string;
    title: string;
    amount: number;
    type: "catalog" | "custom";
  }[] = [];
  let subtotal = 0;

  // ---------- líneas catálogo ----------
  for (const id of selected) {
    const sku = index.get(id)!;
    let amount = sku.basePrice;
    if (sku.unit === "perPage")
      amount += (input.pages ?? 1) * (sku.unitPrice ?? 0);
    if (sku.unit === "perLang")
      amount += (input.languages ?? 1) * (sku.unitPrice ?? 0);
    if (sku.unit === "perProduct")
      amount += (input.products ?? 0) * (sku.unitPrice ?? 0);
    lines.push({ id, title: sku.title, amount, type: "catalog" });
    subtotal += amount;
  }

  // ---------- líneas custom ----------
  const customs = Array.isArray(input.customFeatures)
    ? input.customFeatures
    : [];
  for (const cf of customs) {
    const est = estimateCustom(cf, catalog);
    lines.push({
      id: `custom:${slug(cf.title)}`,
      title: cf.title,
      amount: est,
      type: "custom",
    });
    subtotal += est;
  }

  // ---------- modificadores ----------
  if (input.modifiers?.urgency === "rush") {
    const rush = Math.round(subtotal * 0.2);
    lines.push({
      id: "mod:urgency",
      title: "Urgencia (20%)",
      amount: rush,
      type: "custom",
    });
    subtotal += rush;
  }

  const iva = Math.round(subtotal * 0.21);
  const total = subtotal + iva;

  return { lines, subtotal, iva, total };
}

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
