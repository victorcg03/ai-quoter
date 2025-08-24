export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

import { logger, newReqId } from "@/lib/logger";

const OLLAMA_URL =
  (import.meta.env?.OLLAMA_URL as string) ?? "http://localhost:11434";
const TIMEOUT_MS = Number(import.meta.env?.OLLAMA_TIMEOUT_MS ?? 25000);
const DEFAULT_MODEL = (import.meta.env?.OLLAMA_MODEL as string) ?? "phi3:mini";
function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS) {
  return Promise.race<T>([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error("ollama_timeout")), ms),
    ) as unknown as Promise<T>,
  ]);
}

async function time<T>(fn: () => Promise<T>): Promise<{ res: T; ms: number }> {
  const t0 = Date.now();
  const res = await fn();
  return { res, ms: Date.now() - t0 };
}

export async function ollamaChat(
  messages: ChatMessage[] | string,
  opts?: { model?: string; reqId?: string; ns?: string },
) {
  const rid = opts?.reqId ?? newReqId();
  const model = opts?.model ?? DEFAULT_MODEL;
  const log = logger(opts?.ns ?? "OLLAMA");

  const msgs: ChatMessage[] =
    typeof messages === "string"
      ? [{ role: "user", content: messages }]
      : messages.slice(-12); // limit último 12

  log.info("request", { rid, model, count: msgs.length });

  const { res, ms } = await time(async () => {
    const r = await withTimeout(
      fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: msgs,
          stream: false,
          options: { temperature: 0.8, num_ctx: 4096 },
        }),
      }),
    );
    if (!("ok" in r) || !(r as Response).ok) {
      const rr = r as Response;
      const text = await rr.text().catch(() => "");
      throw new Error(`Ollama ${rr.status}: ${text}`);
    }
    return (r as Response).json();
  }).catch((err: unknown) => {
    log.error("error", { rid, error: String(err) });
    throw err;
  });

  const content = res?.message?.content ?? "";
  log.info("response", {
    rid,
    ms: Math.round(ms),
    size: String(content).length,
  });
  return String(content);
}
