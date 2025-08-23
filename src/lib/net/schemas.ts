// src/lib/net/schemas.ts
import { z } from "zod";

export const zSuggestOut = z.object({
  skusSuggested: z.array(z.string()),
  customFeatures: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      complexity: z.enum(["low", "med", "high"]).optional(),
      tags: z.array(z.string()).optional(),
    }),
  ),
  filledFields: z.object({
    pages: z.number().optional(),
    languages: z.number().optional(),
    products: z.number().optional(),
  }),
  notes: z.string().optional(),
});
export type SuggestOut = z.infer<typeof zSuggestOut>;

export const zQuoteLine = z.object({
  id: z.string(),
  title: z.string(),
  amount: z.number(),
  type: z.enum(["catalog", "custom"]),
});

export const zQuoteOut = z.object({
  lines: z.array(zQuoteLine),
  subtotal: z.number(),
  iva: z.number(),
  total: z.number(),

  // 🔥 NUEVO: estimación anual (no incluida en total)
  annualMin: z.number().optional(),
  annualMax: z.number().optional(),
  annualLabel: z.string().optional(),
});
export type QuoteOut = z.infer<typeof zQuoteOut>;

export const zQuoteInputSafe = z.object({
  pages: z.number().optional(),
  languages: z.number().optional(),
  products: z.number().optional(),
  forcedSkus: z.array(z.string()).optional(),
  suggestedSkus: z.array(z.string()).optional(),
  customFeatures: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        complexity: z.enum(["low", "med", "high"]).optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  modifiers: z
    .object({ urgency: z.enum(["normal", "rush"]).optional() })
    .optional(),
});
export type QuoteInputSafe = z.infer<typeof zQuoteInputSafe>;
