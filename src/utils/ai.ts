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
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line) continue;
      try {
        yield JSON.parse(line);
      } catch {
        // ignora líneas no JSON (p. ej., keep-alives)
      }
    }
  }
}
