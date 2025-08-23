// src/lib/pricing/annual.ts
/**
 * Estimación sencilla de costes anuales (NO se suma al total):
 * - Dominio (.com/.es): ~12–30 €/año
 * - Hosting + mantenimiento: rango según tipo de web
 *
 * Reglas base:
 *   • Web informativa/one-page → 180–360 €/año (+ dominio)
 *   • Tienda / reservas / catálogos → 360–720 €/año (+ dominio)
 * Ajustes suaves por nº de idiomas y páginas.
 */
export function annualEstimateFromSkus({
  skus = [],
  pages = 1,
  languages = 1,
}: {
  skus?: string[];
  pages?: number;
  languages?: number;
}) {
  const ids = new Set(skus);
  const hasEcomOrBooking =
    ids.has("ecom.catalog") || ids.has("functional.booking");

  let min = hasEcomOrBooking ? 360 : 180;
  let max = hasEcomOrBooking ? 720 : 360;

  // Ajustes suaves
  if ((languages || 1) > 1) {
    min += 30;
    max += 90;
  }
  if ((pages || 1) > 5) {
    min += 30;
    max += 90;
  }

  // Dominio (añadimos siempre)
  const domainMin = 12;
  const domainMax = 30;
  min += domainMin;
  max += domainMax;

  return {
    min: Math.round(min),
    max: Math.round(max),
    label: "Dominio, hosting y mantenimiento",
  };
}
