export const prerender = false;
import type { APIRoute } from "astro";
import { makePdfBuffer } from "@/lib/pdf/makePdf";
import { logger, newReqId } from "@/lib/logger";

const log = logger("PDF");

export const POST: APIRoute = async ({ request }) => {
  const rid = newReqId();
  const data = await request.json().catch(() => ({}));
  log.info("incoming", { rid });

  const proposal = data?.proposal ?? {};
  const items = proposal?.items ?? proposal?.lines;
  if (!Array.isArray(items) || items.length === 0) {
    return new Response(JSON.stringify({ error: "invalid_items" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const buf = await makePdfBuffer({
    ...data,
    proposal: {
      ...proposal,
      items: items.map((it: any) => ({
        id: String(it.id ?? ""),
        title: String(it.title ?? ""),
        amount: Number(it.amount ?? 0),
        type: it.type === "custom" ? "custom" : "catalog",
      })),
    },
  });

  const uint8 = new Uint8Array(buf);
  log.info("ok", { rid, bytes: uint8.byteLength });

  return new Response(uint8, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="propuesta.pdf"',
      "Content-Length": String(uint8.byteLength),
      "Cache-Control": "no-store",
    },
  });
};
