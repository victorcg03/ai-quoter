// src/hooks/useSuggest.ts
import { useState, useCallback } from "react";
import { zSuggestOut, type SuggestOut } from "@/lib/net/schemas";

export function useSuggest() {
  const [suggest, setSuggest] = useState<SuggestOut | null>(null);
  const [loading, setLoading] = useState(false);

  const doSuggest = useCallback(
    async (payload: {
      sector?: string;
      descripcion?: string;
      objetivos?: string;
      presupuestoAprox?: number;
      avoidSkus?: string[];
      // NUEVO: pistas duras para el server
      pages?: number;
      languages?: number;
      products?: number;
    }) => {
      setLoading(true);
      try {
        const res = await fetch("/api/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        const parsed = zSuggestOut.parse(json);
        parsed.customFeatures = parsed.customFeatures.filter((cf) => {
          const t = (cf.title + " " + (cf.description ?? "")).toLowerCase();
          // descarta si suena a tarifa/plan que no sea ecommerce real
          if (/tarifa mensual|nivel de dificultad|suscrip/i.test(t))
            return false;
          return true;
        });
        setSuggest(parsed);
        return parsed;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { suggest, setSuggest, loading, doSuggest };
}
