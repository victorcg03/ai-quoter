export const prerender = false;
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ ok: true, status: "healthy" }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    status: 200,
  });
};
