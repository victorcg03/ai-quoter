import React, { useMemo, useRef, useState } from "react";
import { Chips } from "./Chips";
import { QuoteBreakdown } from "./QuoteBreakdown";
import { hasPerProduct, validSkus, humanizeSku } from "@/lib/pricing/uiMap";
import { SKU_RESPONSIVE } from "@/lib/pricing/catalog";
import { useSuggest } from "@/hooks/useSuggest";
import { useQuote } from "@/hooks/useQuote";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useTextareaAutosize } from "@/hooks/useTextareaAutosize";
import { fmtEUR } from "@/utils/currency";
import { uid } from "@/utils/id";
import { logger } from "@/lib/logger";
import { readNdjson } from "@/utils/ai";

type Message = { id: string; role: "assistant" | "user"; content: string };

const log = logger("ConversationalQuote");

// --- util: limpieza de URLs/claims de despliegue ---
function stripLinksAndDeploy(text: string) {
  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, "$1")
    .replace(/\bhttps?:\/\/[^\s)]+/gi, "[enlace omitido]")
    .replace(
      /\b(voy a|vamos a|puedo|voy) (crear|hacer|publicar|subir|generar)\b.*$/gim,
      "",
    );
}

// --- UI: burbuja de “escribiendo…” para el asistente ---
function TypingBubble() {
  return (
    <div className="flex justify-start" aria-live="polite">
      <div className="mr-2 mt-1 h-7 w-7 flex items-center justify-center rounded-full bg-gray-200">
        <span>🤖</span>
      </div>
      <div className="max-w-[80%] rounded-2xl px-3 py-2 text-sm bg-gray-100 text-gray-900 shadow-sm">
        <span className="typing-dots" aria-hidden="true">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </span>
      </div>
    </div>
  );
}

// 🔎 Detección de nº de idiomas por texto libre
const LANG_WORDS = [
  ["español", "castellano"],
  ["inglés", "ingles", "english"],
  ["francés", "frances", "french"],
  ["italiano", "italian"],
  ["alemán", "aleman", "german"],
  ["portugués", "portugues", "portuguese"],
  ["catalán", "catalan"],
  ["euskera", "vasco", "basque"],
  ["gallego", "galician"],
];
function detectLanguagesCount(t: string) {
  const s = t.toLowerCase();
  let count = 0;
  for (const group of LANG_WORDS) {
    if (group.some((w) => s.includes(w))) count++;
  }
  return Math.max(1, count);
}

export default function ConversationalQuote() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      role: "assistant",
      content:
        "¡Hola! Soy tu asesor. ¿Qué negocio tienes y qué objetivo principal buscas con la web (leads, reservas, ecommerce, branding)?",
    },
  ]);
  const [input, setInput] = useState("");

  // Perfil
  const [sector, setSector] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>("");
  const [objetivos, setObjetivos] = useState<string>("");
  const [pages, setPages] = useState<number | undefined>(undefined);
  const [languages, setLanguages] = useState<number | undefined>(undefined);
  const [products, setProducts] = useState<number | undefined>(undefined);
  const [forceShowProducts, setForceShowProducts] = useState(false);

  // Selección
  const [forcedSkus, setForcedSkus] = useState<string[]>([SKU_RESPONSIVE]);
  const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
  const [avoidSkus, setAvoidSkus] = useState<string[]>([]);
  const [chatCutoff, setChatCutoff] = useState(false);

  // IA
  const {
    suggest,
    setSuggest,
    loading: loadingSuggest,
    doSuggest,
  } = useSuggest();
  const { quote, setQuote, loading: loadingQuote, doQuote } = useQuote();

  // Indicador de “agente pensando”
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const loading = loadingSuggest || loadingQuote;

  // refs y efectos
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  useAutoScroll(
    [messages, suggest, quote, chatCutoff, isAgentThinking],
    scrollRef,
  );
  useTextareaAutosize(taRef, input);

  const add = (role: "assistant" | "user", content: string) =>
    setMessages((m) => [...m, { id: uid(), role, content }]);
  const focusComposer = () =>
    requestAnimationFrame(() => taRef.current?.focus());

  function absorbUserText(t: string) {
    if (
      !sector &&
      /academ|rest|clin|inmob|tienda|hotel|bar|caf|abog|dent|estudio|gimn|autoesc|coleg|escuela/i.test(
        t,
      )
    )
      setSector(t);
    if (!descripcion) setDescripcion(t);
    if (!objetivos) {
      if (/reserv/i.test(t)) setObjetivos("reservas");
      else if (/lead|contact/i.test(t)) setObjetivos("captar leads");
      else if (/e-?commerce|carrito|tienda/i.test(t)) setObjetivos("ecommerce");
      else setObjetivos("branding");
    }

    // Idiomas
    const detected = detectLanguagesCount(t);
    if (languages === undefined && detected > 1) setLanguages(detected);

    // Páginas explícitas
    const pageMatch = t.match(/(\d{1,2})\s*p[aá]g/i);
    if (pages === undefined && pageMatch) setPages(Number(pageMatch[1]));

    // Single-page
    const singlePage =
      /(una\s+sola\s+p[aá]gina|one\s*page|landing)(?!\s*\w)/i.test(t);
    if (singlePage) {
      setPages(1);
      setAvoidSkus((prev) => Array.from(new Set([...prev, "site.multipage"])));
    }

    if (/tienda|carrito|producto|e-?commerce/i.test(t))
      setForceShowProducts(true);

    // Blacklist ampliado
    const map: Array<[RegExp, string]> = [
      [
        /(no\s*(quiero|pongas)|sin)\s*faq|preguntas\s*frecuentes/i,
        "content.faq",
      ],
      [/(no\s*(quiero|pongas)|sin)\s*whats/i, "functional.whatsapp"],
      [/(no\s*(quiero|pongas)|sin)\s*mapa/i, "functional.map"],
      [/(no\s*(quiero|pongas)|sin)\s*blog/i, "content.blog"],
      [/no\s*(multip[aá]gina|multi[-\s]?p[aá]gina)/i, "site.multipage"],
    ];
    setAvoidSkus((prev) => {
      const s = new Set(prev);
      map.forEach(([re, sku]) => {
        if (re.test(t)) s.add(sku);
      });
      return Array.from(s);
    });
  }

  // Normaliza sugerencias con reglas duras del cliente
  function normalizeSuggestedSkus(
    inputIds: string[],
    opts: { pages?: number; avoid: string[] },
  ) {
    const set = new Set(inputIds);
    opts.avoid.forEach((id) => set.delete(id));
    if (opts.pages === 1) {
      set.delete("site.multipage");
      set.add("site.onepage");
    }
    return Array.from(set);
  }

  const hasEnoughForSuggest = useMemo(() => {
    const hasSector = !!sector?.trim();
    const hasGoal = !!objetivos?.trim();
    const hasTwoOfThree =
      Number.isFinite(pages) ||
      Number.isFinite(languages) ||
      /(contact|correo|whats|mapa|reserva|pago|formulario)/i.test(
        descripcion + " " + messages.map((m) => m.content).join(" "),
      );
    return hasSector && hasGoal && hasTwoOfThree;
  }, [sector, objetivos, pages, languages, descripcion, messages]);

  async function sendToAgent(userText: string) {
    const payload = {
      messages: [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userText },
      ],
      state: { sector, descripcion, objetivos, pages, languages, products },
      stream: true, // <<--- clave
    };

    setIsAgentThinking(true);

    // crea burbuja del asistente vacía que iremos rellenando
    const msgId = uid();
    setMessages((m) => [...m, { id: msgId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        // cae al modo no-stream por compatibilidad
        const data = await res.json().catch(() => ({}));
        const reply = stripLinksAndDeploy(
          String(data.reply || "Ahora mismo no puedo pensar."),
        );
        setMessages((m) =>
          m.map((x) => (x.id === msgId ? { ...x, content: reply } : x)),
        );
        return;
      }

      let full = "";
      for await (const evt of readNdjson(res)) {
        const delta = evt?.message?.content ? String(evt.message.content) : "";
        if (!delta) continue;
        full += delta;
        // pintamos el acumulado
        setMessages((m) =>
          m.map((x) =>
            x.id === msgId ? { ...x, content: stripLinksAndDeploy(full) } : x,
          ),
        );
      }

      const final = stripLinksAndDeploy(full).trim();
      // post-proceso: ACTION:SUGGEST y flujo de sugerencias como antes
      const endsWithSuggest = /ACTION:\s*SUGGEST\s*$/i.test(final);
      const replyClean = final.replace(/ACTION:\s*SUGGEST\s*$/i, "").trim();
      setMessages((m) =>
        m.map((x) => (x.id === msgId ? { ...x, content: replyClean } : x)),
      );

      if (endsWithSuggest || hasEnoughForSuggest) {
        const out = await doSuggest({
          sector: sector || "—",
          descripcion: descripcion || "—",
          objetivos: objetivos || "—",
          presupuestoAprox: undefined,
          avoidSkus,
          pages,
          languages,
          products,
        });
        if (!out) return;

        setQuote(null);
        const rawSkus = validSkus(out.skusSuggested || []);
        const skus = normalizeSuggestedSkus(rawSkus, {
          pages,
          avoid: avoidSkus,
        });
        setSuggest({ ...out, skusSuggested: skus });
        setSelectedSkus(skus);

        if (pages === undefined && out?.filledFields?.pages)
          setPages(out.filledFields.pages);
        if (languages === undefined && out?.filledFields?.languages)
          setLanguages(out.filledFields.languages);
        if (products === undefined && out?.filledFields?.products)
          setProducts(out.filledFields.products);
        if (hasPerProduct([...skus, ...forcedSkus])) setForceShowProducts(true);

        const humanList = skus.map(humanizeSku).join(", ");
        const readable = humanList || "propuesta base";
        add(
          "assistant",
          `Propuesta inicial: ${readable}.` +
            (out.customFeatures?.length
              ? ` Además, sugiero: ${out.customFeatures
                  .map((c) => c.title)
                  .join(", ")}.`
              : ""),
        );
        if (out.notes) add("assistant", out.notes);
        add(
          "assistant",
          "Ajusta páginas/idiomas y los elementos incluidos. Cuando quieras, pulsa **Calcular precio**.",
        );
      }
    } catch (e: unknown) {
      setMessages((m) =>
        m.map((x) =>
          x.id === msgId
            ? {
                ...x,
                content:
                  "Ahora mismo no puedo pensar. Intenta de nuevo en unos segundos.",
              }
            : x,
        ),
      );
      if (e instanceof Error) log.error("agent_error", { error: String(e) });
    } finally {
      setIsAgentThinking(false);
      focusComposer();
    }
  }

  const canPrice = useMemo(
    () =>
      !!suggest &&
      ((selectedSkus.length ?? 0) > 0 ||
        forcedSkus.length > 0 ||
        (suggest?.customFeatures?.length ?? 0) > 0),
    [suggest, forcedSkus, selectedSkus],
  );

  async function onQuote() {
    if (!suggest) return;
    const data = await doQuote({
      forcedSkus,
      suggestedSkus: selectedSkus,
      customFeatures: suggest.customFeatures,
      pages,
      languages,
      products,
      modifiers: { urgency: "normal" },
    });
    if (data) {
      add(
        "assistant",
        `Total estimado ${fmtEUR(
          data.total,
        )} (IVA incl.). ¿Quieres el PDF de propuesta?`,
      );
      // 🔥 Añadimos mensaje de servicio (alojamiento, dominio, mantenimiento)
      if ((data.annualMin ?? 0) > 0) {
        add(
          "assistant",
          `Además del desarrollo, podemos **alojar y mantener** tu web y **gestionar el dominio** (el dominio es el nombre de tu web, p. ej. *tuacademia.com*). ` +
            `El coste anual estimado es de **${fmtEUR(
              data.annualMin!,
            )}–${fmtEUR(data.annualMax!)} / año** ` +
            `(${data.annualLabel ?? "Dominio, hosting y mantenimiento"}). ` +
            `Este coste **no está incluido** en el total anterior; se factura de forma anual.`,
        );
      }
    }
  }

  async function onPdf() {
    if (!quote) return;
    try {
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
          annualMin: quote.annualMin,
          annualMax: quote.annualMax,
          annualLabel: quote.annualLabel,
          client: { name: sector || "Cliente" },
          brand: { name: "Habitia Agency", website: "habitia.agency" },
        }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "propuesta.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      add("assistant", "No he podido generar el PDF ahora mismo.");
    }
  }

  const showProducts =
    forceShowProducts ||
    hasPerProduct([...(suggest?.skusSuggested || []), ...forcedSkus]);
  const toggleSku = (id: string) => {
    if (id === SKU_RESPONSIVE) {
      setForcedSkus((v) =>
        v.includes(id) ? v.filter((x) => x !== id) : [...v, id],
      );
      return;
    }
    setSelectedSkus((v) =>
      v.includes(id) ? v.filter((x) => x !== id) : [...v, id],
    );
  };

  return (
    <div className="bg-white rounded-xl shadow border p-4 grid gap-4">
      {chatCutoff && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          La sesión se ha pausado por desvíos. Recarga la página para empezar de
          nuevo.
        </div>
      )}

      <div ref={scrollRef} className="h-[460px] overflow-auto space-y-3 pr-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {m.role === "assistant" && (
              <div className="mr-2 mt-1 h-7 w-7 flex items-center justify-center rounded-full bg-gray-200">
                <span>🤖</span>
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-5 shadow-sm ${
                m.role === "user"
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {m.content}
            </div>
            {m.role === "user" && (
              <div className="ml-2 mt-1 h-7 w-7 flex items-center justify-center rounded-full bg-gray-200">
                <span>🙂</span>
              </div>
            )}
          </div>
        ))}

        {isAgentThinking && <TypingBubble />}
        {(loadingSuggest || loadingQuote) && <TypingBubble />}

        {suggest && (
          <div className="bg-gray-50 border rounded-xl p-3 text-sm space-y-3">
            <div className="font-medium">
              Ajustes rápidos (puedes modificarlos)
            </div>

            <Chips
              suggested={suggest.skusSuggested || []}
              forcedIds={forcedSkus}
              selectedIds={selectedSkus}
              onToggle={toggleSku}
            />

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-600">Páginas</label>
                <input
                  type="number"
                  min={1}
                  className="w-full border rounded px-2 py-1"
                  value={pages ?? 1}
                  onChange={(e) =>
                    setPages(Math.max(1, Number(e.target.value)))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Idiomas</label>
                <input
                  type="number"
                  min={1}
                  className="w-full border rounded px-2 py-1"
                  value={languages ?? 1}
                  onChange={(e) =>
                    setLanguages(Math.max(1, Number(e.target.value)))
                  }
                />
              </div>
              {showProducts && (
                <div>
                  <label
                    className="text-xs text-gray-600"
                    title="Solo para tiendas: nº de productos aproximado para dimensionar el trabajo."
                  >
                    Productos (solo tiendas)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full border rounded px-2 py-1"
                    value={products ?? 0}
                    onChange={(e) =>
                      setProducts(Math.max(0, Number(e.target.value)))
                    }
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                disabled={!canPrice || loading || chatCutoff}
                onClick={onQuote}
                className="btn disabled:opacity-50"
                aria-busy={loading}
              >
                {loading ? "Calculando..." : "Calcular precio"}
              </button>
            </div>
          </div>
        )}

        {quote && (
          <QuoteBreakdown quote={quote} onPdf={onPdf} disabled={chatCutoff} />
        )}
      </div>

      {/* Composer */}
      <form
        className="flex gap-2 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (chatCutoff) return;
          const t = input.trim();
          if (!t) return;
          add("user", t);
          absorbUserText(t);
          setInput("");
          sendToAgent(t);
        }}
      >
        <textarea
          ref={taRef}
          rows={2}
          className="flex-1 border rounded px-3 py-2 resize-none leading-5"
          placeholder="Escribe aquí… (Shift+Enter para salto de línea)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              (e.currentTarget.form as HTMLFormElement)?.requestSubmit();
            }
          }}
          disabled={loading || chatCutoff}
        />
        <button type="submit" className="btn" disabled={loading || chatCutoff}>
          Enviar
        </button>
      </form>
    </div>
  );
}
