import { catalog, type SKU } from "./catalog";

const byId = new Map(catalog.map(s => [s.id, s]));
export function humanizeSku(id: string) {
  const sku = byId.get(id);
  return sku?.title ?? id;
}
export function skuDesc(id: string) {
  const sku = byId.get(id);
  return sku?.description ?? "";
}
export function hasPerProduct(skus: string[]) {
  return skus.some(id => byId.get(id)?.unit === "perProduct");
}
export function isKnownSku(id: string) {
  return byId.has(id);
}
export function validSkus(ids: string[]) {
  return ids.filter(isKnownSku);
}
