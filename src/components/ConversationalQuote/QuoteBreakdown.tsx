import { fmtEUR } from "@/utils/currency";
import type { QuoteOut } from "@/lib/net/schemas";

export function QuoteBreakdown({
  quote,
  onPdf,
  disabled,
}: {
  quote: QuoteOut;
  onPdf: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="bg-white border rounded-xl p-3 text-sm space-y-3">
      <div className="font-semibold text-base">Desglose</div>

      <ul className="divide-y">
        {quote.lines.map((l) => (
          <li key={l.id} className="flex justify-between py-1">
            <span>{l.title}</span>
            <span>{fmtEUR(l.amount)}</span>
          </li>
        ))}
      </ul>

      <div className="pt-2 space-y-1">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{fmtEUR(quote.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>IVA</span>
          <span>{fmtEUR(quote.iva)}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{fmtEUR(quote.total)}</span>
        </div>
      </div>

      {/* 🔥 NUEVO: bloque informativo anual */}
      {(quote.annualMin ?? 0) > 0 && (
        <div className="rounded-lg border bg-gray-50 p-3 mt-1">
          <div className="text-xs text-gray-600">
            Coste anual estimado (no incluido en el total)
          </div>
          <div className="font-medium">
            {quote.annualLabel ?? "Dominio, hosting y mantenimiento"}:{" "}
            {fmtEUR(quote.annualMin!)} – {fmtEUR(quote.annualMax!)} / año
          </div>
          <div className="text-xs text-gray-500 mt-1">
            El dominio es el nombre de tu web (p. ej. <em>tuacademia.com</em>).
            Incluye alojamiento y mantenimiento (actualizaciones y soporte).
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={onPdf} className="btn" disabled={disabled}>
          Generar PDF
        </button>
      </div>
    </div>
  );
}
