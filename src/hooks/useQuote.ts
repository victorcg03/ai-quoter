// src/hooks/useQuote.ts
import { useState, useCallback } from "react";
import {
  zQuoteOut,
  type QuoteOut,
  type QuoteInputSafe,
} from "@/lib/net/schemas";

export function useQuote() {
  const [quote, setQuote] = useState<QuoteOut | null>(null);
  const [loading, setLoading] = useState(false);

  const doQuote = useCallback(async (input: QuoteInputSafe) => {
    setLoading(true);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      const parsed = zQuoteOut.parse(json);
      setQuote(parsed);
      return parsed;
    } finally {
      setLoading(false);
    }
  }, []);

  return { quote, setQuote, loading, doQuote };
}
