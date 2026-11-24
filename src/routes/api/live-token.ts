import { createFileRoute } from "@tanstack/react-router";
import { getGoogleApiKey } from "@/lib/ai-gateway";

const LIVE_MODEL = "gemini-2.5-flash-native-audio-latest";
const LIVE_VOICE = "Zephyr";

// NOTE: For production, replace with a server-side WebSocket proxy so the
// API key never reaches the client. For development, returning the key
// directly is sufficient to test the Live API connection.
export const Route = createFileRoute("/api/live-token")({
  server: {
    handlers: {
      POST: async () => {
        const key = getGoogleApiKey();
        if (!key) {
          return new Response(JSON.stringify({ error: "Missing GOOGLE_API_KEY" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return Response.json({
          token: key,
          model: LIVE_MODEL,
          voice: LIVE_VOICE,
        });
      },
    },
  },
});
