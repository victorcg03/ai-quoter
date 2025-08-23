export const prerender = false;
import type { APIRoute } from "astro";
import { AGENT_SYSTEM, makeAgentUserContext } from "../../lib/ai/agentPrompt";
import { ollamaChat, type ChatMessage } from "../../lib/ai/ollama";
import { logger, newReqId } from "../../lib/logger";
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

  try {
    const raw = await ollamaChat([sys, ctx, ...messages], {
      reqId: rid,
      model: "llama3.1:8b",
    });
    const reply = sanitizeReply(raw);
    log.info("reply", { rid, ms: Date.now() - t0, size: reply.length });
    return new Response(JSON.stringify({ reply, rid }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "agent_failed", rid }), {
      status: 502,
    });
  }
};
