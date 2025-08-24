// utils/ai.ts
export async function* readNdjson(res: Response) {
  if (!res.body) throw new Error("no_stream_body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      let line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line) continue;

      // soporta "data: {...}" y NDJSON plano
      if (line.startsWith("data:")) line = line.slice(5).trim();
      try {
        yield JSON.parse(line);
      } catch {
        // ignora keep-alives u otras líneas
      }
    }
  }
}
