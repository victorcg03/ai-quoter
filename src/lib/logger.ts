type Level = "debug" | "info" | "error";
const LEVELS: Record<Level, number> = { debug: 10, info: 20, error: 30 };

const GLOBAL_LEVEL = (import.meta.env?.LOG_LEVEL as Level) ?? "info"; // "debug" en dev si quieres
const GLOBAL_NS = (import.meta.env?.LOG_NS as string) ?? ""; // ej: "AGENT,SUGGEST"

function nsEnabled(ns: string) {
  if (!GLOBAL_NS) return true; // sin filtro => todo
  return GLOBAL_NS.split(",").map(s => s.trim()).filter(Boolean).includes(ns);
}
function levelEnabled(level: Level) {
  return LEVELS[level] >= LEVELS[GLOBAL_LEVEL];
}

export function logger(ns: string) {
  function out(level: Level, msg: string, data?: any) {
    if (!nsEnabled(ns) || !levelEnabled(level)) return;
    const base = `[${ns}] ${msg}`;
    const payload = data ? ` ${JSON.stringify(data)}` : "";
    // eslint-disable-next-line no-console
    (level === "error" ? console.error : level === "debug" ? console.debug : console.info)(base + payload);
  }
  return {
    debug: (msg: string, data?: any) => out("debug", msg, data),
    info:  (msg: string, data?: any) => out("info",  msg, data),
    error: (msg: string, data?: any) => out("error", msg, data),
  };
}

export function newReqId() {
  return Math.random().toString(36).slice(2,8)+"-"+Math.random().toString(36).slice(2,8);
}
