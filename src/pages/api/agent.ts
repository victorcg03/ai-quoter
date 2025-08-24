export const prerender = false;
import type { APIRoute } from "astro";
import { AGENT_SYSTEM, makeAgentUserContext } from "@/lib/ai/agentPrompt";
import {
  OLLAMA_MODEL,
  OLLAMA_URL,
  ollamaChat,
  TIMEOUT_MS,
  type ChatMessage,
} from "@/lib/ai/ollama";
import { logger, newReqId } from "@/lib/logger";
const log = logger("AGENT");

const BANNED_HINTS = [
  "guerra",
  "ucrania",
  "rusia",
  "putin",
  "zelensky",
  "eleccion",
  "politic",
  "biden",
  "trump",
  "israel",
  "palestina",
  "gaza",
  "geopol",
  "chiste",
  "meme",
  "cotilleo",
  "fútbol",
  "nba",
  "apuestas",
  "tarea",
  "examen",
  "integral",
  "derivada",
];
const WEB_INTENT = [
  "web",
  "página",
  "sitio",
  "presupuesto",
  "precio",
  "hosting",
  "coolify",
  "deploy",
  "dominio",
  "dns",
  "ssl",
  "certificado",
  "correo",
  "email",
  "workspace",
  "cloudflare",
  "rendimiento",
  "vitals",
  "seo",
  "schema",
  "sitemap",
  "robots",
  "analytics",
  "ga4",
  "plausible",
  "accesibilidad",
  "cookies",
  "privacidad",
  "rgpd",
  "formulario",
  "reservas",
  "pagos",
  "pasarela",
  "idiomas",
  "traducción",
  "contenido",
  "blog",
  "galería",
  "catálogo",
  "whatsapp",
  "google business",
  "gbp",
];

function sessionKey(req: Request) {
  return (
    req.headers.get("x-session-id") ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for") ||
    "anon"
  ).toString();
}
const driftMap = new Map<string, number>();

function hasAny(t: string, list: string[]) {
  const s = t.toLowerCase();
  return list.some((w) => s.includes(w));
}
function isOffTopic(text: string) {
  const banned = hasAny(text, BANNED_HINTS);
  const whitelisted = hasAny(text, WEB_INTENT);
  return banned && !whitelisted;
}

/** Sanea links/afirmaciones de despliegue para evitar "URLs mágicas" */
function sanitizeReply(txt: string) {
  let out = String(txt || "");
  // quitar markdown links y URLs
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, "$1");
  out = out.replace(/\bhttps?:\/\/[^\s)]+/gi, "[enlace omitido]");
  // quitar promesas de despliegue/creación
  out = out.replace(
    /\b(voy a|vamos a|puedo|voy) (crear|hacer|publicar|subir|generar)\b.*$/gim,
    "Puedo orientarte y presupuestar las funcionalidades que necesitas.",
  );
  return out;
}

// pages/api/agent.ts
export const POST: APIRoute = async ({ request }) => {
  const rid = newReqId();
  const t0 = Date.now();

  let body: any = {};
  try {
    body = await request.json();
  } catch {}
  const messages: ChatMessage[] = Array.isArray(body.messages)
    ? body.messages
    : [];
  const state = body.state ?? {};
  const lastUser =
    [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const streamRequested = body?.stream === true;

  const skey = sessionKey(request);
  if (isOffTopic(lastUser)) {
    const count = (driftMap.get(skey) ?? 0) + 1;
    driftMap.set(skey, count);
    if (count >= 3) {
      const reply =
        "Parece que nos estamos desviando. Solo puedo ayudarte con tu web y presupuesto. Cuando quieras retomamos.";
      return new Response(JSON.stringify({ reply, rid, cutoff: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    const reply =
      "Entiendo, pero para ayudarte de verdad necesito centrarme en tu web. ¿Qué sector es y qué objetivo buscas (leads, reservas, ecommerce)?";
    return new Response(JSON.stringify({ reply, rid, redirected: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  driftMap.set(skey, 0);

  const sys: ChatMessage = { role: "system", content: AGENT_SYSTEM };
  const ctx: ChatMessage = {
    role: "user",
    content: makeAgentUserContext(state),
  };
  const msgs = [sys, ctx, ...messages].slice(-12); // acota contexto

  // --- MODO STREAM ---
  if (streamRequested) {
    // construimos la petición a Ollama en stream y la devolvemos tal cual (NDJSON)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const upstream = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: msgs,
          stream: true,
          options: { temperature: 0.8, num_ctx: 4096 },
        }),
      });
      if (!upstream.ok || !upstream.body) {
        const text = await upstream.text().catch(() => "");
        return new Response(
          JSON.stringify({
            error: "ollama_upstream_error",
            status: upstream.status,
            text,
          }),
          { status: 502, headers: { "Content-Type": "application/json" } },
        );
      }

      // pequeño filtro de saneo por chunk (URLs y promesas de despliegue)
      const urlRe = /\bhttps?:\/\/[^\s)]+/gi;
      const deployRe =
        /\b(voy a|vamos a|puedo|voy)\s+(crear|hacer|publicar|subir|generar)\b.*$/gim;

      const transform = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          try {
            const txt = new TextDecoder().decode(chunk);
            const safe = txt
              .split("\n")
              .map((line) => {
                if (!line.trim()) return line;
                // si viene con prefijo SSE "data:", respétalo pero limpia el payload
                if (line.startsWith("data:")) {
                  const jsonStr = line.slice(5).trim();
                  try {
                    const obj = JSON.parse(jsonStr);
                    if (obj?.message?.content) {
                      obj.message.content = String(obj.message.content)
                        .replace(urlRe, "[enlace omitido]")
                        .replace(deployRe, "");
                    }
                    return "data: " + JSON.stringify(obj);
                  } catch {
                    return line;
                  }
                } else {
                  // NDJSON
                  try {
                    const obj = JSON.parse(line);
                    if (obj?.message?.content) {
                      obj.message.content = String(obj.message.content)
                        .replace(urlRe, "[enlace omitido]")
                        .replace(deployRe, "");
                    }
                    return JSON.stringify(obj);
                  } catch {
                    return line;
                  }
                }
              })
              .join("\n");
            controller.enqueue(new TextEncoder().encode(safe));
          } catch {
            controller.enqueue(chunk);
          }
        },
      });

      const streamed = upstream.body.pipeThrough(transform);

      return new Response(streamed, {
        status: 200,
        headers: {
          // Ollama emite NDJSON (línea por evento). Lo pasamos tal cual.
          "Content-Type":
            upstream.headers.get("content-type") || "application/x-ndjson",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Transfer-Encoding": "chunked",
          // permite que navegadores y proxies no bufericen
          "X-Accel-Buffering": "no",
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  // --- MODO NO-STREAM (compatibilidad actual) ---
  try {
    const raw = await ollamaChat(msgs, { reqId: rid });
    const reply = sanitizeReply(raw);
    log.info("reply", { rid, ms: Date.now() - t0, size: reply.length });
    return new Response(JSON.stringify({ reply, rid }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    log.error("error", { rid, error: String(e) });
    if (e instanceof Error) {
      return new Response(
        JSON.stringify({
          message: e?.message,
          rid,
          stack: e?.stack,
          cause: e?.cause,
          name: e?.name,
        }),
        { status: 500 },
      );
    }
    return new Response(
      JSON.stringify({ error: "agent_failed", rid, details: String(e) }),
      {
        status: 502,
      },
    );
  }
};
