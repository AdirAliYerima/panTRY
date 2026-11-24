import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

/**
 * POST /api/sms
 * Body: { phone: string; message: string }
 * Response: { sent: true } on success, otherwise { sent: false, fallback?: string, error?: string }.
 *
 * If TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM are set in env, sends via Twilio REST API.
 * Otherwise returns a graceful fallback: an `sms:` URI the client can use to open the user's native
 * messages app pre-filled with the list \u2014 so the flow still completes locally without a paid SMS provider.
 */

function smsFallbackUri(phone: string, message: string): string {
  // iOS expects `sms:<num>&body=...`, Android `sms:<num>?body=...`. The `?&` form works on both.
  return `sms:${encodeURIComponent(phone)}?&body=${encodeURIComponent(message)}`;
}

function sanitizePhone(raw: string): string {
  // Keep leading +, strip everything non-digit after.
  const trimmed = raw.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/[^\d]/g, "");
}

export const Route = createFileRoute("/api/sms")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          phone?: string;
          message?: string;
        };

        const rawPhone = (body.phone ?? "").trim();
        const message = (body.message ?? "").trim();

        if (!rawPhone || !message) {
          return new Response(
            JSON.stringify({ sent: false, error: "phone and message required" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const phone = sanitizePhone(rawPhone);

        const sid = process.env.TWILIO_ACCOUNT_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;
        const from = process.env.TWILIO_FROM;

        // No Twilio configured \u2014 return a fallback that opens the user's native SMS composer.
        if (!sid || !token || !from) {
          return new Response(
            JSON.stringify({ sent: false, fallback: smsFallbackUri(phone, message) }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        try {
          const form = new URLSearchParams();
          form.set("To", phone);
          form.set("From", from);
          form.set("Body", message);

          const auth = btoa(`${sid}:${token}`);
          const r = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: form.toString(),
            },
          );

          if (r.ok) {
            return new Response(JSON.stringify({ sent: true }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          const errText = await r.text().catch(() => "");
          return new Response(
            JSON.stringify({
              sent: false,
              error: `twilio ${r.status}: ${errText.slice(0, 200)}`,
              fallback: smsFallbackUri(phone, message),
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (e) {
          return new Response(
            JSON.stringify({
              sent: false,
              error: e instanceof Error ? e.message : "send failed",
              fallback: smsFallbackUri(phone, message),
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
