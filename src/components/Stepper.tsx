import React, { useMemo, useState } from "react";
import { useSuggest } from "@/hooks/useSuggest";
import { useQuote } from "@/hooks/useQuote";
import { fmtEUR } from "@/utils/currency";

export default function Stepper() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 form
  const [sector, setSector] = useState("academia de idiomas");
  const [descripcion, setDescripcion] = useState(
    "Inglés para niños y adultos, clases grupales y online",
  );
  const [objetivos, setObjetivos] = useState("captar más alumnos por web");
  const [presupuesto, setPresupuesto] = useState<number | "">("");

  const {
    suggest,
    setSuggest,
    loading: loadingSuggest,
    doSuggest,
  } = useSuggest();
  const { quote, setQuote, loading: loadingQuote, doQuote } = useQuote();
  const [forcedSkus, setForcedSkus] = useState<string[]>(["design.responsive"]);
  const [clientName, setClientName] = useState("Meeting Point");

  const canNext = useMemo(
    () => sector.trim().length > 0 && descripcion.trim().length > 0,
    [sector, descripcion],
  );

  async function handleSuggest() {
    setQuote(null);
    const s = await doSuggest({
      sector,
      descripcion,
      objetivos,
      presupuestoAprox: presupuesto === "" ? undefined : Number(presupuesto),
    });
    if (s) setStep(2);
  }

  async function handleQuote() {
    if (!suggest) return;
    const q = await doQuote({
      forcedSkus,
      suggestedSkus: suggest.skusSuggested,
      customFeatures: suggest.customFeatures,
      pages: suggest.filledFields?.pages,
      languages: suggest.filledFields?.languages,
      products: suggest.filledFields?.products,
      modifiers: { urgency: "normal" },
    });
    if (q) setStep(3);
  }

  async function handlePdf() {
    if (!quote) return;
    const res = await fetch("/api/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proposal: {
          items: quote.lines,
          subtotal: quote.subtotal,
          iva: quote.iva,
          total: quote.total,
        },
        client: { name: clientName },
      }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "propuesta.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  const loading = loadingSuggest || loadingQuote;

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-6">
      {step === 1 && (
        <section className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Sector</label>
            <input
              className="border rounded px-3 py-2"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Descripción</label>
            <textarea
              rows={3}
              className="border rounded px-3 py-2 leading-5"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Objetivos</label>
            <input
              className="border rounded px-3 py-2"
              value={objetivos}
              onChange={(e) => setObjetivos(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Presupuesto aprox. (€)
            </label>
            <input
              type="number"
              className="border rounded px-3 py-2"
              value={presupuesto as any}
              onChange={(e) =>
                setPresupuesto(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={!canNext || loading}
              onClick={handleSuggest}
              className="btn"
              aria-disabled={!canNext || loading}
            >
              {loading ? "Pensando..." : "Sugerir features"}
            </button>
          </div>
        </section>
      )}

      {step === 2 && suggest && (
        <section className="space-y-4">
          <div>
            <h2 className="font-semibold mb-2">Sugeridos</h2>
            <div className="text-sm text-gray-700">
              SKUs: {suggest.skusSuggested.join(", ") || "—"}
            </div>
            {!!suggest.customFeatures.length && (
              <ul className="list-disc pl-6 text-sm mt-2">
                {suggest.customFeatures.map((c, i) => (
                  <li key={i}>
                    <span className="font-medium">{c.title}</span> —{" "}
                    {c.complexity}
                  </li>
                ))}
              </ul>
            )}
            {suggest.notes && (
              <p className="mt-2 text-xs text-gray-500 italic">
                {suggest.notes}
              </p>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-2">Forzar inclusión</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={forcedSkus.includes("design.responsive")}
                onChange={(e) =>
                  setForcedSkus((v) =>
                    e.target.checked
                      ? Array.from(new Set([...v, "design.responsive"]))
                      : v.filter((x) => x !== "design.responsive"),
                  )
                }
              />
              Diseño adaptable (móvil/tablet/PC) – recomendado
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setStep(1)} className="btn-outline">
              Atrás
            </button>
            <button
              disabled={loading}
              onClick={handleQuote}
              className="btn"
              aria-disabled={loading}
            >
              {loading ? "Calculando..." : "Calcular precio"}
            </button>
          </div>
        </section>
      )}

      {step === 3 && quote && (
        <section className="space-y-4">
          <h2 className="font-semibold">Desglose</h2>
          <ul className="text-sm">
            {quote.lines.map((l) => (
              <li key={l.id} className="flex justify-between border-b py-1">
                <span>{l.title}</span>
                <span>{fmtEUR(l.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="text-sm space-y-1">
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
          <div className="grid gap-2">
            <label className="text-sm font-medium">Nombre del cliente</label>
            <input
              className="border rounded px-3 py-2"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setStep(2)} className="btn-outline">
              Atrás
            </button>
            <button onClick={handlePdf} className="btn">
              Generar PDF
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
