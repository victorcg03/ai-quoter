// src/lib/pricing/estimator.ts
import { type SKU } from "./catalog";

const COMPLEXITY = { low: 0.7, med: 1.0, high: 1.5 };

export function estimateCustom(
  feature: { title: string; tags?: string[]; complexity?: "low"|"med"|"high" },
  catalog: SKU[],
) {
  const base = anchorPrice(feature, catalog);           // ancla por similitud
  const c = COMPLEXITY[feature.complexity ?? "med"];
  // Margen por integración (si aparece “integración”/“api”)
  const integrationBump = hasIntegrationSignal(feature) ? 1.2 : 1.0;
  // Redondeo amable
  return Math.round(base * c * integrationBump / 10) * 10;
}

function anchorPrice(feature: { tags?: string[] }, catalog: SKU[]) {
  // media de los SKUs con tags coincidentes; si no hay, mediana del catálogo
  const pool = catalog.filter(s => overlap(s.tags, feature.tags));
  const nums = (pool.length ? pool : catalog).map(s => s.basePrice).sort((a,b)=>a-b);
  const mid = Math.floor(nums.length/2);
  const median = nums.length % 2 ? nums[mid] : Math.round((nums[mid-1]+nums[mid])/2);
  return median || 150; // fallback prudente
}
function overlap(a?: string[], b?: string[]) {
  if (!a?.length || !b?.length) return false;
  return a.some(x => b.includes(x));
}
function hasIntegrationSignal(f: { title: string }) {
  return /api|integraci|pasarela|erp|crm/i.test(f.title);
}
