import { createFileRoute } from "@tanstack/react-router";

const JF_BASE = "https://developer-portal-backend-694046361762.northamerica-northeast1.run.app";
const JF_KEY = process.env.JOURNEY_FOODS_API_KEY ?? "jf_-PcXfQMqlMKDz0bVx5nvlanNt53DU0IjpQGeJ1BI3rc";

const ALLOWED = /^\/(allergens|nutrients|products)\/[A-Za-z0-9_\-/%.]+$/;

async function proxy(path: string) {
  if (!ALLOWED.test(path)) {
    return new Response(JSON.stringify({ error: "Path not allowed" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const url = `${JF_BASE}${path}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${JF_KEY}`,
        "X-API-Key": JF_KEY,
        "x-api-key": JF_KEY,
      },
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upstream request failed";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/food")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const path = url.searchParams.get("path") ?? "";
        return proxy(path);
      },
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json().catch(() => ({}))) as { path?: string };
        return proxy(body.path ?? "");
      },
    },
  },
});
